import React, { useEffect, useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useStore } from '../../store/useStore';

export function EgressTransitionGate() {
  const navigate = useNavigate();
  const location = useLocation();
  const simState = useStore((state) => state.simState);

  const isPostMatch = useMemo(() => {
    const state = String(simState?.state || '').toLowerCase();
    return state === 'post_match' || state === 'post-match';
  }, [simState?.state]);
  const shouldShowOverlay =
    isPostMatch && location.pathname !== '/egress' && location.pathname !== '/operator';

  useEffect(() => {
    if (!shouldShowOverlay) return undefined;

    const timer = setTimeout(() => {
      navigate('/egress', { replace: true });
    }, 3000);

    return () => clearTimeout(timer);
  }, [navigate, shouldShowOverlay]);

  if (!shouldShowOverlay) return null;

  return (
    <div className="absolute inset-0 z-[60] bg-slate-950/85 backdrop-blur-sm flex items-center justify-center px-6">
      <div className="w-full max-w-xs rounded-3xl bg-white p-6 text-center shadow-2xl">
        <p className="text-3xl mb-2">🏁</p>
        <h2 className="text-xl font-extrabold text-gray-900">Match over!</h2>
        <p className="text-sm text-gray-600 mt-1">Your exit plan is ready</p>
        <button
          type="button"
          onClick={() => navigate('/egress')}
          className="mt-5 w-full rounded-xl bg-blue-600 text-white font-bold py-3 hover:bg-blue-700 transition-colors"
        >
          View exit plan
        </button>
        <p className="mt-2 text-xs text-gray-500">Auto-opening in 3 seconds...</p>
      </div>
    </div>
  );
}
