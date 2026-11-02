import { useEffect, useRef } from 'react';

/**
 * setInterval that is safe to use in components:
 * - always cleared on unmount / when `delay` changes
 * - paused while the browser tab is hidden (saves CPU/battery)
 */
export function useInterval(callback: () => void, delay: number | null): void {
  const savedCallback = useRef(callback);

  useEffect(() => {
    savedCallback.current = callback;
  }, [callback]);

  useEffect(() => {
    if (delay === null) return;
    const tick = () => {
      if (typeof document === 'undefined' || !document.hidden) {
        savedCallback.current();
      }
    };
    const id = setInterval(tick, delay);
    return () => clearInterval(id);
  }, [delay]);
}
