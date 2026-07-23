import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import StylistProfile from '@/components/StylistProfile';

export default function StylistProfileDialog({ open, onOpenChange }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit Profile</DialogTitle>
        </DialogHeader>
        <StylistProfile onSaved={() => onOpenChange(false)} />
      </DialogContent>
    </Dialog>
  );
}