import { Reorder, useDragControls } from 'framer-motion';
import { GripVertical, Pencil, Trash2, Gift } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';

export default function DraggableCategory({ value, cat, onEdit, onToggle, onDelete }) {
  const controls = useDragControls();

  return (
    <Reorder.Item
      value={value}
      dragListener={false}
      dragControls={controls}
      whileDrag={{ scale: 1.02, zIndex: 50 }}
      className="flex items-center gap-2 px-3 py-2 rounded-lg glass-card touch-pan-y"
    >
      <span
        data-reorder-grip
        onPointerDown={(e) => { e.stopPropagation(); controls.start(e); }}
        className="cursor-grab active:cursor-grabbing touch-none flex items-center"
      >
        <GripVertical className="w-4 h-4 text-muted-foreground/40" />
      </span>
      <button onClick={() => onEdit(cat)} className="text-sm font-medium hover:underline">{cat.name}</button>
      {cat.complimentary && <Badge variant="default" className="text-xs"><Gift className="w-3 h-3 mr-1" />Free</Badge>}
      <div className="flex items-center gap-1.5">
        <Switch checked={cat.complimentary} onCheckedChange={() => onToggle(cat)} />
        <Label className="text-xs text-muted-foreground">Complimentary</Label>
      </div>
      <Button variant="ghost" size="icon" className="h-7 w-7 touch-target" onClick={() => onEdit(cat)}><Pencil className="w-3.5 h-3.5" /></Button>
      <Button variant="ghost" size="icon" className="h-7 w-7 touch-target" onClick={() => onDelete(cat)}><Trash2 className="w-3.5 h-3.5 text-destructive" /></Button>
    </Reorder.Item>
  );
}