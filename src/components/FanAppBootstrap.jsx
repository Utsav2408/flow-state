import React, { useEffect, useRef } from 'react';
import { useStore } from '../store/useStore';

/**
 * Runs RTDB seed (when enabled) and live listeners only for signed-in fan app users.
 */
export function FanAppBootstrap({ children }) {
  const bootstrapped = useRef(false);
  const initMockData = useStore((state) => state.initMockData);
  const subscribeToData = useStore((state) => state.subscribeToData);

  useEffect(() => {
    if (bootstrapped.current) return;
    bootstrapped.current = true;
    let unsub = () => {};
    const run = async () => {
      await initMockData();
      unsub = subscribeToData();
    };
    run();
    return () => unsub();
  }, [initMockData, subscribeToData]);

  return children;
}
