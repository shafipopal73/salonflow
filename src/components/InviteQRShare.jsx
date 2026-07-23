import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Copy, MessageSquare, Mail, MessageCircle, Link as LinkIcon } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';

export default function InviteQRShare({ link, email }) {
  const { toast } = useToast();

  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=240x240&margin=0&data=${encodeURIComponent(link)}`;
  const inviteText = `You're invited to join the salon team! Sign up here: ${link}`;

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(link);
      toast({ title: 'Link copied!' });
    } catch {
      toast({ title: 'Copy failed', variant: 'destructive' });
    }
  };

  const shareMessage = `sms:?&body=${encodeURIComponent(inviteText)}`;
  const shareEmail = `mailto:${email ? encodeURIComponent(email) : ''}?subject=${encodeURIComponent('Your Salon Invitation')}&body=${encodeURIComponent(inviteText)}`;
  const shareWhatsApp = `https://wa.me/?text=${encodeURIComponent(inviteText)}`;

  return (
    <div className="mt-4 p-4 rounded-lg bg-primary/5 border border-primary/20 space-y-4">
      <div className="flex items-center gap-2 text-sm font-medium">
        <LinkIcon className="w-4 h-4 text-primary" />
        Stylist Invitation
      </div>

      <div className="flex flex-col items-center gap-2">
        <img src={qrUrl} alt="QR code for sign-up link" className="w-48 h-48 rounded-lg bg-white p-2 border" />
        <p className="text-xs text-muted-foreground text-center">Scan to open the sign-up page</p>
      </div>

      <div className="flex items-center gap-2">
        <Input readOnly value={link} className="text-xs h-9" />
        <Button type="button" size="sm" className="shrink-0" onClick={copyToClipboard}>
          <Copy className="w-3.5 h-3.5 mr-1" />Copy
        </Button>
      </div>

      <div className="grid grid-cols-3 gap-2">
        <Button type="button" size="sm" variant="outline" asChild>
          <a href={shareMessage}>
            <MessageSquare className="w-4 h-4 mr-1" />Message
          </a>
        </Button>
        <Button type="button" size="sm" variant="outline" asChild>
          <a href={shareEmail}>
            <Mail className="w-4 h-4 mr-1" />Email
          </a>
        </Button>
        <Button type="button" size="sm" variant="outline" asChild>
          <a href={shareWhatsApp} target="_blank" rel="noopener noreferrer">
            <MessageCircle className="w-4 h-4 mr-1" />WhatsApp
          </a>
        </Button>
      </div>
    </div>
  );
}