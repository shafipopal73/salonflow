import { useRef } from 'react';
import { useIsMobile } from '@/hooks/use-mobile';

/**
 * Wraps tab content and enables swipe-to-navigate between tabs on mobile.
 * On desktop, renders a plain div (no drag) so it never interferes with
 * mouse-based interactions like reorder drag handles.
 *
 * On mobile, uses manual pointer events (not framer-motion drag) to detect
 * horizontal swipes. This completely avoids conflicts with Reorder.Item
 * drag gestures — if the pointer starts on a reorder grip handle
 * (data-reorder-grip), the swipe is skipped entirely.
 */
export default function Swipeable({ tabs, activeTab, onTabChange, className, children, threshold = 60 }) {
  const isMobile = useIsMobile();
  const currentIndex = tabs.indexOf(activeTab);
  const startX = useRef(null);
  const startY = useRef(null);

  if (!isMobile) {
    return <div className={className}>{children}</div>;
  }

  const handlePointerDown = (e) => {
    const target = e.target instanceof Element ? e.target : null;
    if (target?.closest('[data-reorder-grip]')) {
      startX.current = null;
      return;
    }
    startX.current = e.clientX;
    startY.current = e.clientY;
  };

  const handlePointerUp = (e) => {
    if (startX.current === null) return;
    const dx = e.clientX - startX.current;
    const dy = e.clientY - startY.current;
    startX.current = null;
    startY.current = null;

    if (Math.abs(dx) > threshold && Math.abs(dx) > Math.abs(dy) * 1.5) {
      if (dx < 0 && currentIndex < tabs.length - 1) {
        onTabChange(tabs[currentIndex + 1]);
      } else if (dx > 0 && currentIndex > 0) {
        onTabChange(tabs[currentIndex - 1]);
      }
    }
  };

  return (
    <div
      onPointerDown={handlePointerDown}
      onPointerUp={handlePointerUp}
      className={className}
      style={{ touchAction: 'pan-y' }}
    >
      {children}
    </div>
  );
}