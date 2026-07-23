import { useState, useRef, useEffect, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { RotateCcw, RotateCw, ZoomIn, ZoomOut, Check, Loader2 } from 'lucide-react';

export default function ImageEditorDialog({ file, aspectRatio = 1, onApply, onClose, uploading }) {
  const [image, setImage] = useState(null);
  const [rotation, setRotation] = useState(0);
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const canvasRef = useRef(null);
  const dragRef = useRef(null);

  const outputSize = 400;
  const canvasW = aspectRatio >= 1 ? outputSize : Math.round(outputSize * aspectRatio);
  const canvasH = aspectRatio >= 1 ? Math.round(outputSize / aspectRatio) : outputSize;

  useEffect(() => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => setImage(img);
    img.src = url;
    return () => URL.revokeObjectURL(url);
  }, [file]);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || !image) return;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.save();
    ctx.translate(canvas.width / 2 + offset.x, canvas.height / 2 + offset.y);
    ctx.rotate((rotation * Math.PI) / 180);
    ctx.scale(zoom, zoom);
    const isSideways = rotation % 180 !== 0;
    const effW = isSideways ? canvas.height : canvas.width;
    const effH = isSideways ? canvas.width : canvas.height;
    const baseScale = Math.max(effW / image.width, effH / image.height);
    const w = image.width * baseScale;
    const h = image.height * baseScale;
    ctx.drawImage(image, -w / 2, -h / 2, w, h);
    ctx.restore();
  }, [image, rotation, zoom, offset]);

  useEffect(() => {
    draw();
  }, [draw]);

  const startDrag = (clientX, clientY) => {
    dragRef.current = { startX: clientX, startY: clientY, startOffset: { ...offset } };
  };
  const moveDrag = (clientX, clientY) => {
    if (!dragRef.current) return;
    setOffset({
      x: dragRef.current.startOffset.x + (clientX - dragRef.current.startX),
      y: dragRef.current.startOffset.y + (clientY - dragRef.current.startY),
    });
  };
  const endDrag = () => { dragRef.current = null; };

  const handleApply = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.toBlob((blob) => {
      if (blob) onApply(blob);
    }, 'image/png');
  };

  const handleReset = () => {
    setRotation(0);
    setZoom(1);
    setOffset({ x: 0, y: 0 });
  };

  return (
    <Dialog open onOpenChange={(open) => !open && !uploading && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Edit Image</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div
            className="relative mx-auto bg-muted rounded-lg overflow-hidden cursor-move touch-none"
            style={{ width: canvasW, height: canvasH }}
            onMouseDown={(e) => startDrag(e.clientX, e.clientY)}
            onMouseMove={(e) => moveDrag(e.clientX, e.clientY)}
            onMouseUp={endDrag}
            onMouseLeave={endDrag}
            onTouchStart={(e) => startDrag(e.touches[0].clientX, e.touches[0].clientY)}
            onTouchMove={(e) => { e.preventDefault(); moveDrag(e.touches[0].clientX, e.touches[0].clientY); }}
            onTouchEnd={endDrag}
          >
            <canvas ref={canvasRef} width={canvasW} height={canvasH} className="block" />
          </div>
          <div className="flex items-center justify-center gap-2">
            <Button variant="outline" size="icon" onClick={() => setRotation(r => r - 90)} title="Rotate left">
              <RotateCcw className="w-4 h-4" />
            </Button>
            <Button variant="outline" size="icon" onClick={() => setRotation(r => r + 90)} title="Rotate right">
              <RotateCw className="w-4 h-4" />
            </Button>
            <Button variant="outline" size="icon" onClick={() => setZoom(z => Math.max(0.5, +(z - 0.1).toFixed(1)))} title="Zoom out">
              <ZoomOut className="w-4 h-4" />
            </Button>
            <Button variant="outline" size="icon" onClick={() => setZoom(z => Math.min(3, +(z + 0.1).toFixed(1)))} title="Zoom in">
              <ZoomIn className="w-4 h-4" />
            </Button>
            <Button variant="outline" size="sm" onClick={handleReset}>
              Reset
            </Button>
          </div>
          <div className="space-y-1">
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Zoom</span>
              <span>{zoom.toFixed(1)}x</span>
            </div>
            <input
              type="range"
              min="0.5"
              max="3"
              step="0.1"
              value={zoom}
              onChange={(e) => setZoom(parseFloat(e.target.value))}
              className="w-full"
            />
          </div>
          <p className="text-xs text-muted-foreground text-center">Drag the image to reposition</p>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={uploading}>Cancel</Button>
          <Button onClick={handleApply} disabled={!image || uploading}>
            {uploading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Uploading...</> : <><Check className="w-4 h-4 mr-2" />Apply</>}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}