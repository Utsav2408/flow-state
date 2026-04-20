import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { HomePage } from './features/home/HomePage';
import { MapPage } from './features/map/MapPage';
import { GroupPage } from './features/group/GroupPage';
import { RewardsPage } from './features/rewards/RewardsPage';
import { EgressPage } from './features/egress/EgressPage';
import { LoginPage } from './auth/LoginPage';
import { ProtectedOperator } from './auth/ProtectedOperator';
import { RequireAuth } from './auth/RequireAuth';
import { FanAppBootstrap } from './app/FanAppBootstrap';
import { EgressTransitionGate } from './features/egress/EgressTransitionGate';
import { trackPageView } from './services/analyticsService';

function FanShell() {
  return (
    <div className="w-full max-w-md mx-auto bg-white dark:bg-zinc-950 min-h-screen relative shadow-2xl overflow-hidden font-sans">
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/map" element={<MapPage />} />
        <Route path="/group" element={<GroupPage />} />
        <Route path="/rewards" element={<RewardsPage />} />
        <Route path="/egress" element={<EgressPage />} />
        <Route path="/profile" element={<Navigate to="/" replace />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      <EgressTransitionGate />
    </div>
  );
}

function RouteFocusManager() {
  const location = useLocation();

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const preferredHeading =
        document.querySelector('[data-page-heading]') || document.querySelector('main h1, h1');
      if (!preferredHeading) return;
      if (!preferredHeading.hasAttribute('tabindex')) {
        preferredHeading.setAttribute('tabindex', '-1');
      }
      preferredHeading.focus({ preventScroll: true });
    }, 0);
    return () => window.clearTimeout(timer);
  }, [location.pathname]);

  useEffect(() => {
    trackPageView(location.pathname);
  }, [location.pathname]);

  return null;
}

function FanApp() {
  return (
    <RequireAuth>
      <FanAppBootstrap>
        <FanShell />
      </FanAppBootstrap>
    </RequireAuth>
  );
}

function App() {
  return (
    <BrowserRouter>
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[10000] focus:rounded-lg focus:bg-white focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-slate-900 focus:shadow-lg focus:ring-2 focus:ring-blue-600"
      >
        Skip to main content
      </a>
      <RouteFocusManager />
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/operator" element={<ProtectedOperator />} />
        <Route path="/*" element={<FanApp />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
