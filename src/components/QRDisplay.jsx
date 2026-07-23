import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { QrCode, Download, Save } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { useAuth } from '@/lib/AuthContext';
import { getPublishedAppUrl } from '@/lib/appUrl';

export default function QRDisplay() {
  const { user } = useAuth();
  const [salonName, setSalonName] = useState('');
  const [settingId, setSettingId] = useState(null);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  const baseUrl = getPublishedAppUrl();
  const guestUrl = `${baseUrl}/guest${user?.salon_id ? `?salon=${user.salon_id}` : ''}`;
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=400x400&data=${encodeURIComponent(guestUrl)}`;

  useEffect(() => {
    const load = async () => {
      const data = await base44.entities.SalonSetting.filter({ salon_id: user?.salon_id });
      if (data.length > 0) {
        setSalonName(data[0].salon_name || '');
        setSettingId(data[0].id);
      }
    };
    load();
    const unsubscribe = base44.entities.SalonSetting.subscribe((event) => {
      if (event.data.salon_id !== user?.salon_id) return;
      if (event.type === 'create') {
        setSalonName(event.data.salon_name || '');
        setSettingId(event.data.id);
      } else if (event.type === 'update') {
        setSalonName(event.data.salon_name || '');
      }
    });
    return unsubscribe;
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      if (settingId) {
        await base44.entities.SalonSetting.update(settingId, { salon_name: salonName });
      } else {
        const created = await base44.entities.SalonSetting.create({ salon_name: salonName, salon_id: user?.salon_id });
        setSettingId(created.id);
      }
      toast({ title: 'Salon name updated' });
    } catch (err) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-md mx-auto space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <QrCode className="w-5 h-5" />
            Guest Menu Name
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-2">
            <Label htmlFor="salon-name">Salon Name (shown on guest menu only)</Label>
            <Input
              id="salon-name"
              value={salonName}
              onChange={e => setSalonName(e.target.value)}
              placeholder="Salonflow"
            />
            <p className="text-xs text-muted-foreground">This name appears on the guest-facing menu only. Leave blank to use "Salonflow".</p>
          </div>
          <Button onClick={handleSave} disabled={saving}>
            <Save className="w-4 h-4 mr-2" />
            {saving ? 'Saving...' : 'Save Name'}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <QrCode className="w-5 h-5" />
            Guest Menu QR Code
          </CardTitle>
        </CardHeader>
        <CardContent className="text-center">
          <p className="text-sm text-muted-foreground mb-4">
            Display this QR code at styling stations. Guests scan it to view the menu and request drinks directly to the front desk.
          </p>
          <div className="inline-block p-4 bg-white rounded-lg border">
            <img src={qrUrl} alt="Guest Menu QR Code" width={300} height={300} />
          </div>
          <p className="text-xs text-muted-foreground mt-3 break-all">{guestUrl}</p>
          <Button className="mt-4" variant="outline" onClick={() => window.open(qrUrl, '_blank')}>
            <Download className="w-4 h-4 mr-2" />
            Download QR
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}