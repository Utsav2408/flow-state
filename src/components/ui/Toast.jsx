import React, { useEffect, useRef, useState } from 'react';
import { usePrefersReducedMotion } from '../../utils/usePrefersReducedMotion';

/**
 * Fixed top-center toast with slide-down entry and auto-dismiss.
 * @param {{ message: string, type?: 'success' | 'info', onDismiss: () => void, durationMs?: number }} props
 */
export function Toast({ message, type = 'success', onDismiss, durationMs = 3000 }) {
  const [entered, setEntered] = useState(false);
  const dismissRef = useRef(onDismiss);
  const prefersReducedMotion = usePrefersReducedMotion();

  useEffect(() => {
    dismissRef.current = onDismiss;
  }, [onDismiss]);

  useEffect(() => {
    const show = requestAnimationFrame(() => setEntered(true));
    const timer = setTimeout(() => {
      setEntered(false);
      setTimeout(() => dismissRef.current(), 280);
    }, durationMs);
    return () => {
      cancelAnimationFrame(show);
      clearTimeout(timer);
    };
  }, [message, type, durationMs]);

  const bg = type === 'success' ? 'bg-emerald-600' : 'bg-blue-600';

  return (
    <div
      className={`fixed top-4 left-1/2 z-[1000] max-w-[min(92vw,22rem)] px-4 py-3 rounded-xl shadow-lg text-sm font-semibold text-center text-white pointer-events-none ${bg}`}
      style={{
        transform: prefersReducedMotion
          ? 'translate(-50%, 0)'
          : entered
            ? 'translate(-50%, 0)'
            : 'translate(-50%, -140%)',
        opacity: entered ? 1 : 0,
        transition: prefersReducedMotion ? 'opacity 0.15s ease-out' : 'transform 0.35s ease-out, opacity 0.35s ease-out',
      }}
      role="status"
      aria-live="polite"
      aria-atomic="true"
    >
      {message}
    </div>
  );
}
