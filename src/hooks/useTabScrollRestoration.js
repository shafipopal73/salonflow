import { useRef, useEffect, useLayoutEffect } from 'react';
import { useSearchParams } from 'react-router-dom';

/**
 * Saves and restores scroll position per tab so switching tabs
 * doesn't reset the scroll to the top.
 * Also preserves per-tab URL search params (e.g. chat=open, item views)
 * so switching tabs doesn't reset active conversation windows or item views.
 * Returns a ref to attach to the scrollable container.
 */
export function useTabScrollRestoration(activeTab) {
  const containerRef = useRef(null);
  const scrollPositions = useRef({});
  const prevTabRef = useRef(activeTab);
  const tabParams = useRef({});
  const [searchParams, setSearchParams] = useSearchParams();

  // Continuously save URL params (minus 'tab') for the active tab
  useEffect(() => {
    const params = new URLSearchParams(searchParams);
    params.delete('tab');
    tabParams.current[activeTab] = params.toString();
  }, [activeTab, searchParams]);

  // Save previous tab's scroll & restore new tab's scroll and params on tab change
  useLayoutEffect(() => {
    const container = containerRef.current;
    if (prevTabRef.current !== activeTab) {
      if (container) {
        scrollPositions.current[prevTabRef.current] = container.scrollTop;
        container.scrollTop = scrollPositions.current[activeTab] || 0;
      }
      // Restore saved params for the new tab (preserving nested state like chat=open)
      const saved = tabParams.current[activeTab];
      const next = new URLSearchParams();
      next.set('tab', activeTab);
      if (saved) {
        const savedParams = new URLSearchParams(saved);
        for (const [key, value] of savedParams) {
          next.set(key, value);
        }
      }
      setSearchParams(next, { replace: true });
      prevTabRef.current = activeTab;
    }
  }, [activeTab]);

  // Continuously track scroll position for the active tab
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    let rafId = null;
    const handleScroll = () => {
      if (rafId) return;
      rafId = requestAnimationFrame(() => {
        scrollPositions.current[activeTab] = container.scrollTop;
        rafId = null;
      });
    };
    container.addEventListener('scroll', handleScroll, { passive: true });
    return () => {
      container.removeEventListener('scroll', handleScroll);
      if (rafId) cancelAnimationFrame(rafId);
    };
  }, [activeTab]);

  return containerRef;
}