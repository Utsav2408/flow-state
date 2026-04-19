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
    const run = async () => {
      await initMockData();
      subscribeToData();
    };
    run();
  }, [initMockData, subscribeToData]);

  return children;
}
