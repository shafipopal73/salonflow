import { useRef, useState, useEffect } from 'react';

function getScrollableAncestor(el) {
  let node = el;
  while (node && node !== document.body) {
    if (node.scrollHeight > node.clientHeight) {
      const style = window.getComputedStyle(node);
      if (style.overflowY === 'auto' || style.overflowY === 'scroll') {
        return node;
      }
    }
    node = node.parentElement;
  }
  return null;
}

export default function PullToRefresh({ onRefresh, children }) {
  const [pullDistance, setPullDistance] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const startY = useRef(0);
  const pulling = useRef(false);
  const pullDistRef = useRef(0);
  const refreshingRef = useRef(false);
  const onRefreshRef = useRef(onRefresh);
  const containerRef = useRef(null);

  useEffect(() => { onRefreshRef.current = onRefresh; });

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleTouchStart = (e) => {
      if (refreshingRef.current) {
        pulling.current = false;
        return;
      }
      const scrollable = getScrollableAncestor(e.target);
      const isAtTop = scrollable ? scrollable.scrollTop <= 0 : window.scrollY <= 0;
      if (isAtTop) {
        startY.current = e.touches[0].clientY;
        pulling.current = true;
      } else {
        pulling.current = false;
      }
    };

    const handleTouchMove = (e) => {
      if (!pulling.current) return;
      const distance = e.touches[0].clientY - startY.current;
      if (distance > 0) {
        const clamped = Math.min(distance * 0.4, 70);
        pullDistRef.current = clamped;
        setPullDistance(clamped);
      }
    };

    const handleTouchEnd = async () => {
      if (!pulling.current) return;
      pulling.current = false;
      if (pullDistRef.current > 50 && !refreshingRef.current) {
        refreshingRef.current = true;
        setIsRefreshing(true);
        setPullDistance(40);
        try { await onRefreshRef.current?.(); } catch {}
        refreshingRef.current = false;
        setIsRefreshing(false);
      }
      pullDistRef.current = 0;
      setPullDistance(0);
    };

    container.addEventListener('touchstart', handleTouchStart, { passive: true });
    container.addEventListener('touchmove', handleTouchMove, { passive: true });
    container.addEventListener('touchend', handleTouchEnd, { passive: true });
    return () => {
      container.removeEventListener('touchstart', handleTouchStart);
      container.removeEventListener('touchmove', handleTouchMove);
      container.removeEventListener('touchend', handleTouchEnd);
    };
  }, []);

  return (
    <div ref={containerRef}>
      {(pullDistance > 0 || isRefreshing) && (
        <div
          style={{ height: isRefreshing ? 40 : pullDistance }}
          className="flex items-center justify-center overflow-hidden"
        >
          <div className={`w-5 h-5 border-2 border-muted border-t-primary rounded-full ${isRefreshing ? 'animate-spin' : ''}`} />
        </div>
      )}
      {children}
    </div>
  );
}