import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { Coffee, TrendingUp, Users, Utensils, Printer, FileDown, Loader2, Gift } from 'lucide-react';
import { useAuth } from '@/lib/AuthContext';
import { useSalonCustomization } from '@/lib/salonCustomizationContext';
import { generateDailyReportPDF } from '@/utils/dailyReportPdf';

const REPORT_COLORS = {
  accent: '#d5865a',
  dark: '#464a66',
  pageBg: '#f5f6f8',
};

function parseDate(dateStr) {
  if (!dateStr) return null;
  // Strip extra fractional-second digits (DB returns 6, JS only handles 3)
  const cleaned = dateStr.replace(/\.(\d{3})\d*/, '.$1');
  const d = new Date(cleaned);
  return isNaN(d.getTime()) ? null : d;
}

function isToday(dateStr) {
  const date = parseDate(dateStr);
  if (!date) return false;
  const today = new Date();
  return date.getDate() === today.getDate() &&
    date.getMonth() === today.getMonth() &&
    date.getFullYear() === today.getFullYear();
}

function formatTime(dateStr) {
  const date = parseDate(dateStr);
  if (!date) return '';
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function servedTime(order) {
  return order.updated_date || order.created_date;
}

export default function DailyReport() {
  const { user } = useAuth();
  const { settings } = useSalonCustomization();
  const salonName = settings?.salon_display_name || 'Salon';
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  const [error, setError] = useState(null);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        const data = await base44.entities.Order.filter({ salon_id: user?.salon_id }, '-created_date', 500);
        setOrders(data);
        setError(null);
      } catch (err) {
        setError(err.message || 'Failed to load orders');
      } finally {
        setLoading(false);
      }
    };
    load();

    const unsubscribe = base44.entities.Order.subscribe((event) => {
      if (event.data.salon_id && user?.salon_id && event.data.salon_id !== user.salon_id) return;
      if (event.type === 'create' || event.type === 'update') {
        setOrders(prev => {
          const exists = prev.find(o => o.id === event.data.id);
          if (exists) return prev.map(o => o.id === event.data.id ? event.data : o);
          return [event.data, ...prev];
        });
      } else if (event.type === 'delete') {
        setOrders(prev => prev.filter(o => o.id !== event.id));
      }
    });

    const interval = setInterval(load, 10000);

    const onVisible = () => { if (!document.hidden) load(); };
    document.addEventListener('visibilitychange', onVisible);

    return () => {
      unsubscribe();
      clearInterval(interval);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, []);

  if (loading) {
    return <div className="flex items-center justify-center py-20"><div className="w-8 h-8 border-4 border-muted border-t-primary rounded-full animate-spin" /></div>;
  }

  if (error) {
    return <div className="text-center py-20 text-destructive"><p>Error loading report: {error}</p></div>;
  }

  const todaysOrders = orders.filter(o => o.status === 'served' && isToday(servedTime(o)));

  // Group by item name
  const itemMap = {};
  todaysOrders.forEach(o => {
    if (!itemMap[o.item_name]) {
      itemMap[o.item_name] = { name: o.item_name, count: 0, revenue: 0, category: o.category || 'Uncategorized' };
    }
    itemMap[o.item_name].count++;
    itemMap[o.item_name].revenue += o.price || 0;
  });
  const itemBreakdown = Object.values(itemMap).sort((a, b) => b.count - a.count);

  // Group by category
  const catMap = {};
  todaysOrders.forEach(o => {
    const cat = o.category || 'Uncategorized';
    if (!catMap[cat]) catMap[cat] = { name: cat, count: 0, revenue: 0 };
    catMap[cat].count++;
    catMap[cat].revenue += o.price || 0;
  });
  const categoryBreakdown = Object.values(catMap).sort((a, b) => b.count - a.count);

  // Group by person
  const personMap = {};
  todaysOrders.forEach(o => {
    const key = `${o.requested_by_name}__${o.requested_by_type}`;
    if (!personMap[key]) {
      personMap[key] = { name: o.requested_by_name, type: o.requested_by_type, count: 0, revenue: 0, items: {} };
    }
    personMap[key].count++;
    personMap[key].revenue += o.price || 0;
    const itemName = o.item_name;
    if (!personMap[key].items[itemName]) personMap[key].items[itemName] = 0;
    personMap[key].items[itemName]++;
  });
  const personBreakdown = Object.values(personMap).sort((a, b) => b.count - a.count);

  // Stats
  const isFree = (o) => o.price == null;
  const freeItemsCount = todaysOrders.filter(isFree).length;
  const totalItems = todaysOrders.length;
  const totalRevenue = todaysOrders.reduce((sum, o) => sum + (o.price || 0), 0);
  const stylistCount = todaysOrders.filter(o => o.requested_by_type === 'stylist').length;
  const guestCount = todaysOrders.filter(o => o.requested_by_type === 'guest').length;
  const priceLabel = (price) => price == null ? 'FREE' : `$${price.toFixed(2)}`;

  const chartData = itemBreakdown.slice(0, 10).map(i => ({ name: i.name, count: i.count }));

  const todayStr = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });

  const servedLog = todaysOrders
    .slice()
    .sort((a, b) => (parseDate(servedTime(b))?.getTime() || 0) - (parseDate(servedTime(a))?.getTime() || 0))
    .map(o => ({
      item_name: o.item_name,
      requested_by_name: o.requested_by_name,
      requested_by_type: o.requested_by_type,
      chair_table: o.chair_table,
      price: o.price,
      time: formatTime(servedTime(o)),
    }));

  const reportData = {
    salonName,
    todayStr,
    totalItems,
    totalRevenue,
    stylistCount,
    guestCount,
    freeItemsCount,
    categoryBreakdown,
    personBreakdown,
    itemBreakdown,
    servedLog,
  };

  const handlePrint = () => {
    setExporting(true);
    try {
      const pdf = generateDailyReportPDF(reportData);
      pdf.autoPrint();
      window.open(pdf.output('bloburl'), '_blank');
    } finally {
      setExporting(false);
    }
  };

  const handleSavePDF = () => {
    setExporting(true);
    try {
      const pdf = generateDailyReportPDF(reportData);
      pdf.save(`daily-report-${new Date().toISOString().split('T')[0]}.pdf`);
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Export toolbar */}
      <div className="flex items-center justify-end gap-2 no-export">
        <Button variant="outline" size="sm" onClick={handlePrint} disabled={exporting}>
          {exporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Printer className="w-4 h-4" />}
          Print
        </Button>
        <Button variant="outline" size="sm" onClick={handleSavePDF} disabled={exporting}>
          {exporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileDown className="w-4 h-4" />}
          Save PDF
        </Button>
      </div>

      {/* Report card */}
      <div className="rounded-lg overflow-hidden shadow-sm" style={{ background: REPORT_COLORS.pageBg }}>
        {/* Header bar */}
        <div style={{ background: REPORT_COLORS.dark }} className="px-6 py-8">
          <h1 className="text-3xl font-bold tracking-tight" style={{ color: REPORT_COLORS.accent }}>
            {salonName}
          </h1>
          <p className="text-white text-xs uppercase tracking-[0.2em] mt-2">
            Daily Report — {todayStr}
          </p>
        </div>

        {/* Content */}
        <div className="bg-white p-6 space-y-8">
          {totalItems === 0 ? (
            <div className="text-center py-16" style={{ color: REPORT_COLORS.dark }}>
              <Coffee className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p>No items served today yet.</p>
            </div>
          ) : (
            <>
              {/* Row 1: Bar chart + Stats */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div>
                  <h3 className="text-xs uppercase tracking-widest font-bold mb-4" style={{ color: REPORT_COLORS.accent }}>
                    Top Items Today
                  </h3>
                  {chartData.length > 0 && (
                    <ResponsiveContainer width="100%" height={220}>
                      <BarChart data={chartData} margin={{ left: -16, right: 8 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
                        <XAxis dataKey="name" tick={{ fontSize: 11, fill: REPORT_COLORS.dark }} angle={-25} textAnchor="end" height={60} interval={0} />
                        <YAxis allowDecimals={false} tick={{ fontSize: 12, fill: REPORT_COLORS.dark }} />
                        <Tooltip cursor={{ fill: 'rgba(213,134,90,0.08)' }} />
                        <Bar dataKey="count" fill={REPORT_COLORS.accent} radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  )}
                </div>

                <div>
                  <h3 className="text-xs uppercase tracking-widest font-bold mb-4" style={{ color: REPORT_COLORS.accent }}>
                    Today's Stats
                  </h3>
                  <div className="grid grid-cols-2 gap-4">
                    {[
                      { label: 'Items Served', value: totalItems, icon: Utensils },
                      { label: 'Total Value', value: `$${totalRevenue.toFixed(2)}`, icon: TrendingUp },
                      { label: 'Free Items', value: freeItemsCount, icon: Gift },
                      { label: 'Stylist Orders', value: stylistCount, icon: Users },
                      { label: 'Guest Orders', value: guestCount, icon: Coffee },
                    ].map((stat) => (
                      <div key={stat.label} className="border rounded-lg p-4" style={{ borderColor: '#e5e7eb' }}>
                        <stat.icon className="w-5 h-5 mb-2" style={{ color: REPORT_COLORS.accent }} />
                        <div className="text-2xl font-bold" style={{ color: REPORT_COLORS.dark }}>{stat.value}</div>
                        <div className="text-xs uppercase tracking-wide mt-1" style={{ color: REPORT_COLORS.dark, opacity: 0.6 }}>{stat.label}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Row 2: Orders by Person + By Category */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div>
                  <h3 className="text-xs uppercase tracking-widest font-bold mb-4" style={{ color: REPORT_COLORS.accent }}>
                    Orders by Person
                  </h3>
                  <div className="space-y-3">
                    {personBreakdown.map(person => (
                      <div key={`${person.name}__${person.type}`} className="border rounded-lg p-3" style={{ borderColor: '#e5e7eb' }}>
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <span className="font-medium" style={{ color: REPORT_COLORS.dark }}>{person.name}</span>
                            <span className="text-xs uppercase tracking-wide" style={{ color: REPORT_COLORS.accent }}>{person.type}</span>
                          </div>
                          <div className="flex items-center gap-3 text-sm" style={{ color: REPORT_COLORS.dark }}>
                            <span style={{ opacity: 0.6 }}>{person.count} item{person.count !== 1 ? 's' : ''}</span>
                            <span className="font-medium">${person.revenue.toFixed(2)}</span>
                          </div>
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          {Object.entries(person.items).map(([itemName, qty]) => (
                            <span key={itemName} className="text-xs px-2 py-0.5 rounded-full border" style={{ borderColor: '#e5e7eb', color: REPORT_COLORS.dark }}>
                              {qty}× {itemName}
                            </span>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <h3 className="text-xs uppercase tracking-widest font-bold mb-4" style={{ color: REPORT_COLORS.accent }}>
                    By Category
                  </h3>
                  <div className="space-y-2">
                    {categoryBreakdown.map(cat => (
                      <div key={cat.name} className="flex items-center justify-between py-2 border-b" style={{ borderColor: '#e5e7eb' }}>
                        <span className="font-medium" style={{ color: REPORT_COLORS.dark }}>{cat.name}</span>
                        <div className="flex items-center gap-4">
                          <span className="text-sm" style={{ color: REPORT_COLORS.dark, opacity: 0.6 }}>{cat.count} served</span>
                          <span className="text-sm font-medium" style={{ color: REPORT_COLORS.accent }}>${cat.revenue.toFixed(2)}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Items Served Today Table */}
              <div>
                <h3 className="text-xs uppercase tracking-widest font-bold mb-4" style={{ color: REPORT_COLORS.accent }}>
                  Items Served Today
                </h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b text-left" style={{ borderColor: '#e5e7eb' }}>
                        <th className="pb-2 font-medium" style={{ color: REPORT_COLORS.accent }}>Item</th>
                        <th className="pb-2 font-medium" style={{ color: REPORT_COLORS.accent }}>Category</th>
                        <th className="pb-2 font-medium text-center" style={{ color: REPORT_COLORS.accent }}>Qty</th>
                        <th className="pb-2 font-medium text-right" style={{ color: REPORT_COLORS.accent }}>Price</th>
                        <th className="pb-2 font-medium text-right" style={{ color: REPORT_COLORS.accent }}>Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {itemBreakdown.map(item => (
                        <tr key={item.name} className="border-b" style={{ borderColor: '#f3f4f6' }}>
                          <td className="py-2.5 font-medium" style={{ color: REPORT_COLORS.dark }}>{item.name}</td>
                          <td className="py-2.5" style={{ color: REPORT_COLORS.dark, opacity: 0.6 }}>{item.category}</td>
                          <td className="py-2.5 text-center" style={{ color: REPORT_COLORS.dark }}>{item.count}</td>
                          <td className="py-2.5 text-right" style={{ color: REPORT_COLORS.dark }}>{item.revenue === 0 ? 'FREE' : `$${(item.revenue / item.count).toFixed(2)}`}</td>
                          <td className="py-2.5 text-right font-medium" style={{ color: REPORT_COLORS.dark }}>{item.revenue === 0 ? 'FREE' : `$${item.revenue.toFixed(2)}`}</td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="font-semibold">
                        <td className="pt-3" colSpan={2} style={{ color: REPORT_COLORS.dark }}>Total</td>
                        <td className="pt-3 text-center" style={{ color: REPORT_COLORS.dark }}>{totalItems}</td>
                        <td></td>
                        <td className="pt-3 text-right" style={{ color: REPORT_COLORS.accent }}>${totalRevenue.toFixed(2)}</td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>

              {/* Served Log */}
              <div>
                <h3 className="text-xs uppercase tracking-widest font-bold mb-4" style={{ color: REPORT_COLORS.accent }}>
                  Served Log
                </h3>
                <div className="space-y-2 max-h-80 overflow-y-auto">
                  {todaysOrders
                    .slice()
                    .sort((a, b) => (parseDate(servedTime(b))?.getTime() || 0) - (parseDate(servedTime(a))?.getTime() || 0))
                    .map(o => (
                    <div key={o.id} className="flex items-center justify-between py-2 border-b" style={{ borderColor: '#f3f4f6' }}>
                      <div>
                        <div className="font-medium" style={{ color: REPORT_COLORS.dark }}>{o.item_name}</div>
                        <div className="text-sm" style={{ color: REPORT_COLORS.dark, opacity: 0.6 }}>
                          {o.requested_by_name} · <span className="capitalize">{o.requested_by_type}</span>
                          {o.chair_table ? ` · ${o.chair_table}` : ''}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-medium" style={{ color: REPORT_COLORS.dark }}>{priceLabel(o.price)}</div>
                        <div className="text-xs" style={{ color: REPORT_COLORS.dark, opacity: 0.5 }}>{formatTime(servedTime(o))}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}