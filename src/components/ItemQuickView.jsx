import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Image as UIImage } from '@/components/ui/image';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Clock } from 'lucide-react';

export default function ItemQuickView({ item, open, onOpenChange, onConfirm, isComplimentary }) {
  const [preOrderMode, setPreOrderMode] = useState(false);
  const [arrivalTime, setArrivalTime] = useState('');

  if (!item) return null;

  const resetState = () => {
    setPreOrderMode(false);
    setArrivalTime('');
  };

  const handleClose = (v) => {
    if (!v) resetState();
    onOpenChange(v);
  };

  const handlePreOrderConfirm = () => {
    if (!arrivalTime) return;
    onConfirm(arrivalTime);
    resetState();
  };

  const minDateTime = () => {
    const d = new Date(Date.now() + 10 * 60 * 1000);
    d.setSeconds(0, 0);
    const tzOffset = d.getTimezoneOffset() * 60000;
    return new Date(d.getTime() - tzOffset).toISOString().slice(0, 16);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span>{item.name}</span>
            <Badge variant="secondary">
              {isComplimentary ? 'Complimentary' : item.price != null ? `$${item.price.toFixed(2)}` : ''}
            </Badge>
          </DialogTitle>
        </DialogHeader>
        {preOrderMode ? (
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-sm font-medium">
              <Clock className="w-4 h-4" />
              Set your arrival time
            </div>
            <div className="space-y-2">
              <Label htmlFor="arrival-time">Arrival Time</Label>
              <Input
                id="arrival-time"
                type="datetime-local"
                value={arrivalTime}
                min={minDateTime()}
                onChange={(e) => setArrivalTime(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                The front desk will be alerted 10 minutes before your arrival.
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {item.image_url && (
              <div className="w-full h-48 rounded-xl overflow-hidden">
                <UIImage src={item.image_url} alt={item.name} className="w-full h-full" fittingType="fill" />
              </div>
            )}
            {item.description && (
              <p className="text-sm text-muted-foreground leading-relaxed">{item.description}</p>
            )}
          </div>
        )}
        <DialogFooter>
          {preOrderMode ? (
            <>
              <Button variant="outline" onClick={() => setPreOrderMode(false)}>Back</Button>
              <Button onClick={handlePreOrderConfirm} disabled={!arrivalTime}>
                Confirm Pre-Arrival Order
              </Button>
            </>
          ) : (
            <>
              <Button variant="outline" onClick={() => handleClose(false)}>Cancel</Button>
              <Button variant="secondary" onClick={() => setPreOrderMode(true)}>
                <Clock className="w-4 h-4 mr-1" /> Pre-Arrival
              </Button>
              <Button onClick={() => { onConfirm(null); resetState(); }}>
                {isComplimentary ? 'Request' : item.price != null ? `Request · $${item.price.toFixed(2)}` : 'Request'}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}