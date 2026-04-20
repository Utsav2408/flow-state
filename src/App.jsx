import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { HomePage } from './pages/HomePage';
import { MapPage } from './pages/MapPage';
import { GroupPage } from './pages/GroupPage';
import { RewardsPage } from './pages/RewardsPage';
import { EgressPage } from './pages/EgressPage';
import { LoginPage } from './pages/LoginPage';
import { ProtectedOperator } from './components/ProtectedOperator';
import { RequireAuth } from './components/RequireAuth';
import { FanAppBootstrap } from './components/FanAppBootstrap';
import { EgressTransitionGate } from './components/EgressTransitionGate';

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
