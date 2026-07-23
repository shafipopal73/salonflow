import { useSearchParams } from 'react-router-dom';
import { useCallback } from 'react';

/**
 * Syncs a modal's open/close state with the `?modal=<name>` URL search param.
 * Opening pushes a new history entry so iOS swipe-back dismisses the modal
 * instead of navigating away. Closing replaces the current entry to avoid
 * leaving a redundant history slot.
 */
export function useUrlModal(modalName) {
  const [searchParams, setSearchParams] = useSearchParams();
  const isOpen = searchParams.get('modal') === modalName;

  const setOpen = useCallback((open) => {
    setSearchParams(prev => {
      const next = new URLSearchParams(prev);
      if (open) {
        next.set('modal', modalName);
      } else {
        next.delete('modal');
      }
      return next;
    }, { replace: !open });
  }, [modalName, setSearchParams]);

  return [isOpen, setOpen];
}