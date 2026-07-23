import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import CustomizationPanel from '@/components/CustomizationPanel';

export default function CustomizationDialog({ open, onOpenChange }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Customize Salon</DialogTitle>
        </DialogHeader>
        <CustomizationPanel />
      </DialogContent>
    </Dialog>
  );
}