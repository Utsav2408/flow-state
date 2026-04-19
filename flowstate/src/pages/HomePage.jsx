import React from 'react';
import { useStore } from '../store/useStore';
import { BottomNav, ComfortGauge, ZoneChip } from '../components/Shared';
import { Bell, MapPin } from 'lucide-react';

export const HomePage = () => {
  const currentFan = useStore(state => state.currentFan);
  const zones = useStore(state => state.zones);
  const alerts = useStore(state => state.alerts);
  const simState = useStore(state => state.simState);

  // Default to a known zone if currentFan location is missing
  const zoneId = currentFan?.location || 'B4-B6';
  const zoneData = zones.get(zoneId) || { density: 45, name: `Zone ${zoneId}` };

  const activeAlerts = alerts.filter(a => a.severity === 'high');

  return (
    <div className="pb-24 min-h-screen bg-stone-50 dark:bg-zinc-950 px-6 pt-12">
      <header className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold dark:text-white tracking-tight">FlowState</h1>
          <p className="text-gray-500 font-medium">{simState.clock} • {simState.state}</p>
        </div>
        <div className="relative p-3 bg-white dark:bg-zinc-900 rounded-full shadow-sm">
          <Bell className="text-gray-700 dark:text-gray-300" />
          {activeAlerts.length > 0 && (
            <span className="absolute top-2 right-2 w-2.5 h-2.5 bg-red-500 rounded-full animate-ping"></span>
          )}
        </div>
      </header>

      <section className="mb-8">
        <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-4 px-1">Your Location</h2>
        <div className="bg-white dark:bg-zinc-900 rounded-3xl p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-zinc-900/50 flex items-center justify-between">
          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-2 text-gray-500 font-medium">
              <MapPin size={18} />
              Chinnaswamy Stadium
            </div>
            <div className="text-2xl font-bold dark:text-white">{zoneData.name}</div>
            <ZoneChip zoneName="Current Zone" density={zoneData.density} />
          </div>
          <div className="flex flex-col items-center">
            <ComfortGauge value={zoneData.density} />
            <span className="text-sm text-gray-500 mt-2 font-medium">Congestion</span>
          </div>
        </div>
      </section>

      {activeAlerts.length > 0 && (
        <section className="mb-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-4 px-1">Live Updates</h2>
          <div className="flex flex-col gap-3">
            {activeAlerts.map((alert, idx) => (
              <div key={idx} className="bg-red-50 dark:bg-red-950/30 border border-red-100 dark:border-red-900/50 p-4 rounded-2xl flex items-start gap-3">
                <div className="bg-red-100 dark:bg-red-900 p-2 rounded-full mt-0.5">
                  <Bell size={16} className="text-red-600 dark:text-red-400" />
                </div>
                <div>
                  <h4 className="font-semibold text-red-900 dark:text-red-300">Congestion Alert</h4>
                  <p className="text-red-700 dark:text-red-400 text-sm">{alert.message}</p>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      <BottomNav />
    </div>
  );
};
