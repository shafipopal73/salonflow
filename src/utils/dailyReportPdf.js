import jsPDF from 'jspdf';

const MARGIN = 15;
const PAGE_W = 210;
const PAGE_H = 297;
const CONTENT_W = PAGE_W - 2 * MARGIN;

const ACCENT = [213, 134, 90];
const DARK = [70, 74, 102];
const WHITE = [255, 255, 255];
const LIGHT = [220, 220, 220];
const LIGHTER = [240, 240, 240];

export function generateDailyReportPDF(data) {
  const {
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
  } = data;

  const pdf = new jsPDF({ orientation: 'p', unit: 'mm', format: 'a4' });
  let y = MARGIN;

  const setFont = (style = 'normal', size = 10) => {
    pdf.setFont('helvetica', style);
    pdf.setFontSize(size);
  };

  const truncate = (text, maxWidth) => {
    if (!text) return '';
    if (pdf.getTextWidth(text) <= maxWidth) return text;
    let t = text;
    while (pdf.getTextWidth(t + '…') > maxWidth && t.length > 0) {
      t = t.slice(0, -1);
    }
    return t + '…';
  };

  const drawLine = (ly, color = LIGHT, width = 0.2) => {
    pdf.setDrawColor(...color);
    pdf.setLineWidth(width);
    pdf.line(MARGIN, ly, PAGE_W - MARGIN, ly);
  };

  const drawColLine = (ly, x1, x2, color = LIGHTER) => {
    pdf.setDrawColor(...color);
    pdf.setLineWidth(0.2);
    pdf.line(x1, ly, x2, ly);
  };

  const ensureSpace = (needed) => {
    if (y + needed > PAGE_H - MARGIN) {
      pdf.addPage();
      drawSectionHeader(currentSection);
      y = 26;
    }
  };

  let currentSection = '';

  const drawSectionHeader = (sectionTitle) => {
    pdf.setFillColor(...DARK);
    pdf.rect(0, 0, PAGE_W, 18, 'F');
    pdf.setTextColor(...ACCENT);
    setFont('bold', 12);
    pdf.text(salonName || 'Salon', MARGIN, 8);
    pdf.setTextColor(...WHITE);
    setFont('normal', 8);
    pdf.text(sectionTitle.toUpperCase(), MARGIN, 14);
  };

  // ==================== PAGE 1: SUMMARY ====================
  // Large header bar
  pdf.setFillColor(...DARK);
  pdf.rect(0, 0, PAGE_W, 32, 'F');
  pdf.setTextColor(...ACCENT);
  setFont('bold', 22);
  pdf.text(salonName || 'Salon', MARGIN, 15);
  pdf.setTextColor(...WHITE);
  setFont('normal', 9);
  pdf.text(`DAILY REPORT  —  ${todayStr}`, MARGIN, 24);

  y = 42;
  const colGap = 8;
  const colW = (CONTENT_W - colGap) / 2;
  const leftX = MARGIN;
  const rightX = MARGIN + colW + colGap;
  const nameW = 35;

  // --- Top left: Bar chart ---
  let leftY = y;
  pdf.setTextColor(...ACCENT);
  setFont('bold', 10);
  pdf.text('TOP ITEMS TODAY', leftX, leftY);
  leftY += 6;

  if (itemBreakdown.length === 0) {
    pdf.setTextColor(...DARK);
    setFont('normal', 10);
    pdf.text('No items served.', leftX, leftY);
    leftY += 6;
  } else {
    const chartItems = itemBreakdown.slice(0, 6);
    const maxCount = Math.max(...chartItems.map(i => i.count), 1);
    const barAreaW = colW - nameW - 12;
    chartItems.forEach(item => {
      pdf.setTextColor(...DARK);
      setFont('normal', 9);
      pdf.text(truncate(item.name, nameW - 2), leftX, leftY);
      const barW = (item.count / maxCount) * barAreaW;
      pdf.setFillColor(...ACCENT);
      pdf.rect(leftX + nameW, leftY - 3.5, barW, 4, 'F');
      pdf.text(String(item.count), leftX + nameW + barAreaW + 2, leftY);
      leftY += 6;
    });
  }

  // --- Top right: Stats ---
  let rightY = y;
  pdf.setTextColor(...ACCENT);
  setFont('bold', 10);
  pdf.text("TODAY'S STATS", rightX, rightY);
  rightY += 8;

  const stats = [
    { label: 'Items Served', value: String(totalItems) },
    { label: 'Total Value', value: `$${totalRevenue.toFixed(2)}` },
    { label: 'Free Items', value: String(freeItemsCount) },
    { label: 'Stylist Orders', value: String(stylistCount) },
    { label: 'Guest Orders', value: String(guestCount) },
  ];
  stats.forEach(s => {
    pdf.setTextColor(...DARK);
    setFont('bold', 14);
    pdf.text(s.value, rightX, rightY);
    setFont('normal', 8);
    pdf.text(s.label.toUpperCase(), rightX, rightY + 4);
    rightY += 10;
  });

  // --- Bottom section starts below both columns ---
  const midY = Math.max(leftY, rightY) + 6;

  // --- Bottom left: Orders by Person (summary) ---
  let blY = midY;
  pdf.setTextColor(...ACCENT);
  setFont('bold', 10);
  pdf.text('ORDERS BY PERSON', leftX, blY);
  blY += 6;

  pdf.setTextColor(...DARK);
  setFont('normal', 9);
  personBreakdown.slice(0, 8).forEach(person => {
    if (blY > PAGE_H - MARGIN - 5) return;
    pdf.text(truncate(person.name, nameW - 2), leftX, blY);
    pdf.text(`${person.count} items`, leftX + nameW, blY);
    pdf.text(`$${person.revenue.toFixed(2)}`, leftX + colW, blY, { align: 'right' });
    blY += 5;
    drawColLine(blY - 2, leftX, leftX + colW);
  });

  // --- Bottom right: By Category ---
  let brY = midY;
  pdf.setTextColor(...ACCENT);
  setFont('bold', 10);
  pdf.text('BY CATEGORY', rightX, brY);
  brY += 6;

  pdf.setTextColor(...DARK);
  setFont('normal', 9);
  categoryBreakdown.forEach(cat => {
    if (brY > PAGE_H - MARGIN - 5) return;
    pdf.text(truncate(cat.name, nameW - 2), rightX, brY);
    pdf.text(`${cat.count} served`, rightX + nameW, brY);
    pdf.text(`$${cat.revenue.toFixed(2)}`, rightX + colW, brY, { align: 'right' });
    brY += 5;
    drawColLine(brY - 2, rightX, rightX + colW);
  });

  // ==================== PAGE 2+: ORDERS BY PERSON ====================
  currentSection = 'Orders by Person';
  pdf.addPage();
  drawSectionHeader(currentSection);
  y = 26;

  setFont('bold', 14);
  pdf.setTextColor(...ACCENT);
  pdf.text('ORDERS BY PERSON', MARGIN, y);
  y += 6;
  drawLine(y);
  y += 6;

  if (personBreakdown.length === 0) {
    setFont('normal', 11);
    pdf.setTextColor(...DARK);
    pdf.text('No orders today.', MARGIN, y);
  }

  personBreakdown.forEach(person => {
    ensureSpace(16);

    setFont('bold', 11);
    pdf.setTextColor(...DARK);
    pdf.text(person.name, MARGIN, y);
    const nameWidth = pdf.getTextWidth(person.name);
    setFont('normal', 9);
    pdf.setTextColor(...ACCENT);
    pdf.text(`(${person.type})`, MARGIN + nameWidth + 3, y);
    pdf.setTextColor(...DARK);
    pdf.text(`${person.count} item${person.count !== 1 ? 's' : ''}`, PAGE_W - MARGIN - 35, y);
    setFont('bold', 11);
    pdf.text(`$${person.revenue.toFixed(2)}`, PAGE_W - MARGIN, y, { align: 'right' });
    y += 5;

    setFont('normal', 9);
    pdf.setTextColor(...DARK);
    const items = Object.entries(person.items).map(([name, qty]) => `${qty}x ${name}`);
    const lines = pdf.splitTextToSize(items.join('   '), CONTENT_W - 6);
    lines.forEach(line => {
      ensureSpace(5);
      pdf.text(line, MARGIN + 4, y);
      y += 5;
    });

    y += 3;
    drawLine(y);
    y += 5;
  });

  // ==================== PAGE N+: ITEMS SERVED TODAY ====================
  currentSection = 'Items Served Today';
  pdf.addPage();
  drawSectionHeader(currentSection);
  y = 26;

  setFont('bold', 14);
  pdf.setTextColor(...ACCENT);
  pdf.text('ITEMS SERVED TODAY', MARGIN, y);
  y += 6;
  drawLine(y);
  y += 6;

  const colWidths = [CONTENT_W * 0.30, CONTENT_W * 0.28, CONTENT_W * 0.12, CONTENT_W * 0.14, CONTENT_W * 0.16];
  const colX = [];
  let accX = MARGIN;
  colWidths.forEach(w => { colX.push(accX); accX += w; });

  setFont('bold', 10);
  pdf.setTextColor(...ACCENT);
  ['Item', 'Category', 'Qty', 'Price', 'Total'].forEach((h, i) => {
    pdf.text(h, colX[i] + 2, y);
  });
  y += 3;
  drawLine(y);
  y += 5;

  setFont('normal', 10);
  pdf.setTextColor(...DARK);
  itemBreakdown.forEach(item => {
    ensureSpace(7);
    pdf.text(truncate(item.name, colWidths[0] - 4), colX[0] + 2, y);
    pdf.text(truncate(item.category || '-', colWidths[1] - 4), colX[1] + 2, y);
    pdf.text(String(item.count), colX[2] + 2, y);
    const isFreeItem = item.revenue === 0;
    pdf.text(isFreeItem ? 'FREE' : `$${(item.revenue / item.count).toFixed(2)}`, colX[3] + 2, y);
    pdf.text(isFreeItem ? 'FREE' : `$${item.revenue.toFixed(2)}`, colX[4] + 2, y);
    y += 5;
    drawLine(y, LIGHTER);
    y += 3;
  });

  ensureSpace(8);
  y += 1;
  drawLine(y, DARK, 0.4);
  y += 5;
  setFont('bold', 10);
  pdf.setTextColor(...DARK);
  pdf.text('Total', colX[0] + 2, y);
  pdf.text(String(totalItems), colX[2] + 2, y);
  pdf.setTextColor(...ACCENT);
  pdf.text(`$${totalRevenue.toFixed(2)}`, colX[4] + 2, y);

  // ==================== PAGE M+: SERVED LOG ====================
  currentSection = 'Served Log';
  pdf.addPage();
  drawSectionHeader(currentSection);
  y = 26;

  setFont('bold', 14);
  pdf.setTextColor(...ACCENT);
  pdf.text('SERVED LOG', MARGIN, y);
  y += 6;
  drawLine(y);
  y += 6;

  if (servedLog.length === 0) {
    setFont('normal', 11);
    pdf.setTextColor(...DARK);
    pdf.text('No items served today.', MARGIN, y);
  }

  const logCols = [CONTENT_W * 0.22, CONTENT_W * 0.33, CONTENT_W * 0.15, CONTENT_W * 0.13, CONTENT_W * 0.17];
  const logX = [];
  let accLX = MARGIN;
  logCols.forEach(w => { logX.push(accLX); accLX += w; });

  setFont('bold', 10);
  pdf.setTextColor(...ACCENT);
  ['Item', 'Requested By', 'Table', 'Price', 'Time'].forEach((h, i) => {
    pdf.text(h, logX[i] + 2, y);
  });
  y += 3;
  drawLine(y);
  y += 5;

  setFont('normal', 10);
  pdf.setTextColor(...DARK);
  servedLog.forEach(order => {
    ensureSpace(7);
    pdf.text(truncate(order.item_name || '-', logCols[0] - 4), logX[0] + 2, y);
    const byStr = `${order.requested_by_name} (${order.requested_by_type})`;
    pdf.text(truncate(byStr, logCols[1] - 4), logX[1] + 2, y);
    pdf.text(truncate(order.chair_table || '-', logCols[2] - 4), logX[2] + 2, y);
    pdf.text(order.price == null ? 'FREE' : `$${(order.price || 0).toFixed(2)}`, logX[3] + 2, y);
    pdf.text(order.time || '', logX[4] + 2, y);
    y += 5;
    drawLine(y, LIGHTER);
    y += 3;
  });

  // ==================== PAGE NUMBERS ====================
  const pageCount = pdf.internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    pdf.setPage(i);
    setFont('normal', 8);
    pdf.setTextColor(...LIGHT);
    pdf.text(`Page ${i} of ${pageCount}`, PAGE_W / 2, PAGE_H - 7, { align: 'center' });
  }

  return pdf;
}