import { useState, useRef, useCallback, useEffect } from 'react';
import { Trash2, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Image as UIImage } from '@/components/ui/image';

const REVEAL_WIDTH = 80;
const HOLD_DURATION = 500;

export default function ConversationItem({ stylist, isSelected, hasUnread, onSelect, onDelete }) {
  const [offset, setOffset] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const containerRef = useRef(null);
  const startX = useRef(0);
  const startY = useRef(0);
  const currentX = useRef(0);
  const dragging = useRef(false);
  const holdTimer = useRef(null);
  const movedRef = useRef(false);

  const name = stylist.display_name || stylist.full_name || stylist.email;

  const close = useCallback(() => {
    setOffset(0);
    setRevealed(false);
  }, []);

  // Click outside to close when revealed (desktop press-and-hold)
  useEffect(() => {
    if (!revealed) return;
    const handlePointerDown = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        close();
      }
    };
    document.addEventListener('pointerdown', handlePointerDown);
    return () => document.removeEventListener('pointerdown', handlePointerDown);
  }, [revealed, close]);

  const handleTouchStart = (e) => {
    const touch = e.touches[0];
    startX.current = touch.clientX;
    startY.current = touch.clientY;
    currentX.current = touch.clientX;
    dragging.current = true;
    movedRef.current = false;
  };

  const handleTouchMove = (e) => {
    if (!dragging.current) return;
    const touch = e.touches[0];
    const dx = touch.clientX - startX.current;
    const dy = touch.clientY - startY.current;
    if (Math.abs(dx) > 8 || Math.abs(dy) > 8) movedRef.current = true;
    if (Math.abs(dx) > Math.abs(dy)) {
      const next = Math.min(0, Math.max(-REVEAL_WIDTH, dx));
      setOffset(next);
    }
  };

  const handleTouchEnd = () => {
    if (!dragging.current) return;
    dragging.current = false;
    if (offset < -REVEAL_WIDTH / 2) {
      setOffset(-REVEAL_WIDTH);
      setRevealed(true);
    } else {
      setOffset(0);
      setRevealed(false);
    }
  };

  const startHold = (e) => {
    // Only for mouse (desktop)
    if (e.pointerType === 'touch' || e.type === 'touchstart') return;
    movedRef.current = false;
    holdTimer.current = setTimeout(() => {
      if (!movedRef.current) {
        setOffset(-REVEAL_WIDTH);
        setRevealed(true);
      }
    }, HOLD_DURATION);
  };

  const cancelHold = () => {
    if (holdTimer.current) {
      clearTimeout(holdTimer.current);
      holdTimer.current = null;
    }
  };

  const handleClick = () => {
    if (revealed) {
      close();
      return;
    }
    if (movedRef.current) return;
    onSelect();
  };

  const handleDeleteClick = (e) => {
    e.stopPropagation();
    onDelete();
    close();
  };

  return (
    <div ref={containerRef} className="relative overflow-hidden rounded-lg">
      {/* Delete action behind */}
      <div className="absolute inset-y-0 right-0 flex items-center justify-center" style={{ width: REVEAL_WIDTH }}>
        <Button
          variant="destructive"
          size="icon"
          className="h-full w-full rounded-none"
          onClick={handleDeleteClick}
        >
          <Trash2 className="w-4 h-4" />
        </Button>
      </div>

      {/* Foreground content */}
      <div
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onPointerDown={startHold}
        onPointerUp={cancelHold}
        onPointerLeave={cancelHold}
        onPointerMove={() => { movedRef.current = true; cancelHold(); }}
        onClick={handleClick}
        style={{ transform: `translateX(${offset}px)`, transition: dragging.current ? 'none' : 'transform 0.2s ease' }}
        className={`relative w-full text-left px-3 py-2 rounded-lg flex items-center gap-2 cursor-pointer select-none ${
          isSelected ? 'bg-primary text-primary-foreground' : 'bg-transparent hover:bg-muted'
        }`}
      >
        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0 overflow-hidden">
          {stylist.profile_picture_url ? (
            <UIImage src={stylist.profile_picture_url} fittingType="fill" className="w-8 h-8" />
          ) : (
            <User className="w-4 h-4 text-primary" />
          )}
        </div>
        <span className="text-sm font-medium truncate flex-1">{name}</span>
        {hasUnread && !isSelected && (
          <span className="w-2.5 h-2.5 rounded-full bg-red-500 shrink-0" />
        )}
      </div>
    </div>
  );
}