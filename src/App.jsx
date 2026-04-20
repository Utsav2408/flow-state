import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
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
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/operator" element={<ProtectedOperator />} />
        <Route path="/*" element={<FanApp />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
