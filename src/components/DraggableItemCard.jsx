import { Reorder, useDragControls } from 'framer-motion';
import { GripVertical, Pencil, Trash2 } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Image as UIImage } from '@/components/ui/image';

export default function DraggableItemCard({ value, item, isCategoryComplimentary, onEdit, onDelete, onToggle }) {
  const controls = useDragControls();

  return (
    <Reorder.Item
      value={value}
      dragListener={false}
      dragControls={controls}
      whileDrag={{ scale: 1.02, zIndex: 50, boxShadow: '0 12px 32px rgba(0,0,0,0.15)' }}
      className="relative touch-pan-y"
    >
      <span
        data-reorder-grip
        onPointerDown={(e) => { e.stopPropagation(); controls.start(e); }}
        className="absolute top-2 left-2 z-10 cursor-grab active:cursor-grabbing rounded-md p-1 touch-none"
      >
        <GripVertical className="w-4 h-4 text-muted-foreground/40" />
      </span>
      <Card>
        <CardContent className="p-4">
          {item.image_url && (
            <UIImage src={item.image_url} alt={item.name} className="w-full h-32 rounded-lg object-cover mb-3" fittingType="fill" />
          )}
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <span className="font-medium">{item.name}</span>
                {!item.available && <Badge variant="destructive">Hidden</Badge>}
              </div>
              {item.description && <p className="text-sm text-muted-foreground mt-1">{item.description}</p>}
              {isCategoryComplimentary || item.complimentary
                ? <p className="text-sm font-medium mt-1 text-green-600">Complimentary</p>
                : item.price != null && <p className="text-sm font-medium mt-1">${item.price.toFixed(2)}</p>}
            </div>
            <div className="flex flex-col items-end gap-1.5">
              <div className="flex gap-1">
                <Button variant="ghost" size="icon" className="touch-target" onClick={() => onEdit(item)}><Pencil className="w-4 h-4" /></Button>
                <Button variant="ghost" size="icon" className="touch-target" onClick={() => onDelete(item)}><Trash2 className="w-4 h-4 text-destructive" /></Button>
              </div>
              <div className="flex items-center gap-1.5">
                <Switch checked={item.complimentary || false} onCheckedChange={() => onToggle(item)} />
                <Label className="text-xs text-muted-foreground">Free</Label>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </Reorder.Item>
  );
}