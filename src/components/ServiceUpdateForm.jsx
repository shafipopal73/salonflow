import { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { BellRing, Send } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';

export default function ServiceUpdateForm({ user }) {
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!message.trim()) return;
    setSending(true);
    try {
      await base44.entities.Message.create({
        sender_id: user.id,
        sender_name: user.full_name || user.email,
        sender_role: 'stylist',
        thread_partner_id: user.id,
        thread_partner_name: user.full_name || user.email,
        body: message.trim(),
        message_type: 'service_update',
        salon_id: user.salon_id,
      });
      toast({ title: 'Service update sent to front desk' });
      setMessage('');
    } catch (err) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="max-w-2xl">
      <div className="flex items-center gap-2 mb-4">
        <BellRing className="w-5 h-5" />
        <h2 className="font-heading text-xl font-semibold">Service Update</h2>
      </div>
      <Card>
        <CardContent className="p-6">
          <p className="text-sm text-muted-foreground mb-4">
            Send an update to the front desk about your current service. They'll be notified instantly and the chat will open automatically.
          </p>
          <form onSubmit={handleSubmit} className="space-y-4">
            <Textarea
              value={message}
              onChange={e => setMessage(e.target.value)}
              required
              rows={5}
              placeholder="e.g. Client's color needs 15 more minutes to process, running behind schedule..."
            />
            <Button type="submit" disabled={sending || !message.trim()}>
              <Send className="w-4 h-4 mr-2" />
              {sending ? 'Sending...' : 'Send Update'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}