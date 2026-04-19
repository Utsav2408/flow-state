import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useStore } from './store/useStore';
import { HomePage } from './pages/HomePage';
import { MapPage } from './pages/MapPage';
import { OperatorPage } from './pages/OperatorPage';

function AppShell() {
  const location = useLocation();
  const isOperator = location.pathname === '/operator';

  if (isOperator) {
    return (
      <Routes>
        <Route path="/operator" element={<OperatorPage />} />
      </Routes>
    );
  }

  return (
    <div className="w-full max-w-md mx-auto bg-white dark:bg-zinc-950 min-h-screen relative shadow-2xl overflow-hidden font-sans">
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/map" element={<MapPage />} />
        <Route path="/group" element={<Navigate to="/" replace />} />
        <Route path="/rewards" element={<Navigate to="/" replace />} />
        <Route path="/profile" element={<Navigate to="/" replace />} />
      </Routes>
    </div>
  );
}

function App() {
  const initMockData = useStore(state => state.initMockData);
  const subscribeToData = useStore(state => state.subscribeToData);

  useEffect(() => {
    const setup = async () => {
      await initMockData();
      subscribeToData();
    };
    setup();
  }, [initMockData, subscribeToData]);

  return (
    <BrowserRouter>
      <AppShell />
    </BrowserRouter>
  );
}

export default App;
