import { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/components/ui/use-toast';
import { Send } from 'lucide-react';

export default function StylistMessageDialog({ stylist, user, open, onOpenChange }) {
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const { toast } = useToast();

  const handleSend = async (e) => {
    e.preventDefault();
    if (!message.trim()) return;
    setSending(true);
    try {
      await base44.entities.Message.create({
        sender_id: user.id,
        sender_name: user.full_name || user.email,
        sender_role: 'admin',
        thread_partner_id: stylist.id,
        thread_partner_name: stylist.full_name || stylist.email,
        body: message.trim(),
        salon_id: user.salon_id,
      });
      toast({ title: 'Message sent', description: `Sent to ${stylist.full_name || stylist.email}` });
      setMessage('');
      onOpenChange(false);
    } catch (err) {
      toast({ title: 'Failed to send', description: err.message, variant: 'destructive' });
    } finally {
      setSending(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Message {stylist?.full_name || stylist?.email}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSend} className="space-y-3">
          <Textarea
            value={message}
            onChange={e => setMessage(e.target.value)}
            placeholder="Type your message..."
            rows={4}
            autoFocus
          />
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={sending || !message.trim()}>
              <Send className="w-4 h-4 mr-2" />
              {sending ? 'Sending...' : 'Send'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}