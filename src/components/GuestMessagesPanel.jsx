import { useState, useEffect, useCallback } from 'react';
import { base44 } from '@/api/base44Client';
import PullToRefresh from '@/components/PullToRefresh';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Mail, Printer, Trash2, Check } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { useAuth } from '@/lib/AuthContext';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';

export default function GuestMessagesPanel() {
  const { user } = useAuth();
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedMsg, setSelectedMsg] = useState(null);
  const { toast } = useToast();

  const loadMessages = useCallback(async () => {
    const data = await base44.entities.GuestMessage.filter({ salon_id: user.salon_id }, '-created_date', 200);
    setMessages(data);
  }, [user?.salon_id]);

  useEffect(() => {
    if (!user?.salon_id) return;
    loadMessages().then(() => setLoading(false));
    const unsubscribe = base44.entities.GuestMessage.subscribe((event) => {
      if (!user?.salon_id || !event.data.salon_id || event.data.salon_id !== user.salon_id) return;
      if (event.type === 'create') {
        setMessages(prev => [event.data, ...prev]);
      } else if (event.type === 'update') {
        setMessages(prev => prev.map(m => m.id === event.data.id ? event.data : m));
      } else if (event.type === 'delete') {
        setMessages(prev => prev.filter(m => m.id !== event.id));
      }
    });
    return unsubscribe;
  }, [loadMessages, user?.salon_id]);

  const escapeHtml = (str) => {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  };

  const handlePrint = (msg) => {
    const printWin = window.open('', '_blank');
    const safeName = escapeHtml(msg.guest_name);
    const safeMessage = escapeHtml(msg.message);
    printWin.document.write(`
      <html><head><title>Guest Message - ${safeName}</title>
      <style>
        body { font-family: sans-serif; max-width: 600px; margin: 40px auto; padding: 20px; }
        h2 { margin-bottom: 4px; }
        .date { color: hsl(var(--muted-foreground)); font-size: 14px; margin-bottom: 20px; }
        .message { font-size: 16px; line-height: 1.6; white-space: pre-wrap; }
      </style></head><body>
        <h2>Message from ${safeName}</h2>
        <p class="date">${new Date(msg.created_date).toLocaleString()}</p>
        <hr/>
        <p class="message">${safeMessage}</p>
      </body></html>
    `);
    printWin.document.close();
    printWin.focus();
    printWin.print();
    if (!msg.printed) {
      base44.entities.GuestMessage.update(msg.id, { printed: true }).catch(() => {});
    }
  };

  const handleDelete = async (msg) => {
    if (!confirm(`Delete message from ${msg.guest_name}?`)) return;
    try {
      await base44.entities.GuestMessage.delete(msg.id);
      toast({ title: 'Message deleted' });
    } catch (err) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center py-20"><div className="w-8 h-8 border-4 border-muted border-t-primary rounded-full animate-spin" /></div>;
  }

  const unprintedCount = messages.filter(m => !m.printed).length;

  return (
    <PullToRefresh onRefresh={loadMessages}>
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <h2 className="font-heading text-xl font-semibold">Client Messages</h2>
        {unprintedCount > 0 && <Badge variant="destructive">{unprintedCount} new</Badge>}
      </div>

      {messages.length === 0 ? (
        <div className="text-center py-20 text-muted-foreground">
          <Mail className="w-12 h-12 mx-auto mb-3 opacity-50" />
          <p>No client messages yet.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {messages.map(msg => (
            <Card
              key={msg.id}
              className={`cursor-pointer hover:border-primary/50 transition-colors ${!msg.printed ? 'border-destructive/50' : ''}`}
              onClick={() => setSelectedMsg(msg)}
            >
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div>
                    <div className="font-medium">{msg.guest_name}</div>
                    <div className="text-sm text-muted-foreground">{new Date(msg.created_date).toLocaleString()}</div>
                  </div>
                  {msg.printed
                    ? <Badge variant="outline" className="text-xs"><Check className="w-3 h-3 mr-1" />Printed</Badge>
                    : <Badge variant="destructive" className="text-xs">New</Badge>}
                </div>
                <p className="text-sm whitespace-pre-wrap mb-3 line-clamp-3">{msg.message}</p>
                <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
                  <Button size="sm" variant="outline" onClick={() => handlePrint(msg)}>
                    <Printer className="w-3.5 h-3.5 mr-1" />Print
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => handleDelete(msg)}>
                    <Trash2 className="w-3.5 h-3.5 text-destructive" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
          </div>
          )}

          <Dialog open={!!selectedMsg} onOpenChange={(open) => !open && setSelectedMsg(null)}>
          <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Mail className="w-5 h-5" />
              {selectedMsg?.guest_name}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            <div className="text-sm text-muted-foreground">
              {selectedMsg && new Date(selectedMsg.created_date).toLocaleString()}
            </div>
            <div className="rounded-lg border bg-muted/30 p-4">
              <p className="text-sm whitespace-pre-wrap leading-relaxed">{selectedMsg?.message}</p>
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => {
                handlePrint(selectedMsg);
                setSelectedMsg(null);
              }}
            >
              <Printer className="w-4 h-4 mr-2" />Print
            </Button>
            <Button
              variant="ghost"
              className="text-destructive"
              onClick={() => {
                handleDelete(selectedMsg);
                setSelectedMsg(null);
              }}
            >
              <Trash2 className="w-4 h-4 mr-2" />Delete
            </Button>
          </DialogFooter>
          </DialogContent>
          </Dialog>
          </div>
          </PullToRefresh>
          );
          }