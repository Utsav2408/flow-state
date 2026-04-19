import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStore } from '../store/useStore';
import { useAuth } from '../auth/useAuth';
import { VenueMapCanvas } from '../components/VenueMapCanvas';
import { BottomNav } from '../components/Shared';
import { ChevronLeft, Search } from 'lucide-react';

export const MapPage = () => {
  const navigate = useNavigate();
  const { signOut } = useAuth();
  const [filters, setFilters] = useState({
    density: true,
    food: true,
    restrooms: true,
    exits: true
  });
  const zones = useStore(state => state.zones);
  const stands = useStore(state => state.stands);

  const toggleFilter = (key) => {
    setFilters(prev => ({ ...prev, [key]: !prev[key] }));
  };

  // Compute Quietest Zone & Fastest Food for the bottom card
  let quietestZone = { name: '--', density: 100 };
  zones.forEach((z) => {
    if (z.density < quietestZone.density && z.density > 0) {
      quietestZone = z;
    }
  });

  let fastestFood = { name: '--', waitTime: 999 };
  stands.forEach((s, id) => {
    if (s.waitTime < fastestFood.waitTime) {
      fastestFood = { name: id, waitTime: s.waitTime }; // Displaying stand ID like Wireframe
    }
  });

  return (
    <div className="pb-24 h-screen flex flex-col bg-stone-50 dark:bg-zinc-950">
      <header className="px-6 pt-10 pb-2 flex justify-between items-center z-10 shrink-0">
        <div className="flex items-center gap-4 min-w-0">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="w-10 h-10 bg-white dark:bg-zinc-900 rounded-full flex items-center justify-center shadow-sm shrink-0"
            aria-label="Back"
          >
            <ChevronLeft className="dark:text-white" />
          </button>
          <h1 className="text-2xl font-bold dark:text-white truncate">Live venue map</h1>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <button
            type="button"
            onClick={() => signOut()}
            className="text-xs font-semibold text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 px-2 py-2 whitespace-nowrap"
          >
            Sign out
          </button>
          <button type="button" className="p-2" aria-label="Search">
            <Search className="text-gray-500 dark:text-gray-400" />
          </button>
        </div>
      </header>

      <div className="px-6 py-1 flex gap-2 overflow-x-auto no-scrollbar shrink-0 z-10">
        {['density', 'food', 'restrooms', 'exits'].map(f => (
          <button 
            key={f}
            onClick={() => toggleFilter(f)}
            className={`px-4 py-2 rounded-full whitespace-nowrap text-sm font-semibold transition-all duration-300 ${filters[f] ? 'bg-blue-200 text-blue-900 dark:bg-blue-900 dark:text-blue-200' : 'bg-white text-gray-600 border border-gray-200 dark:bg-zinc-900 dark:text-gray-400 dark:border-zinc-800 shadow-sm'}`}
          >
            {f.charAt(0).toUpperCase() + f.slice(1)}
          </button>
        ))}
      </div>

      <div className="flex-1 px-4 py-2 relative min-h-0">
        <VenueMapCanvas filters={filters} />
      </div>

      <div className="px-6 shrink-0 flex gap-4 justify-center items-center text-xs sm:text-sm font-semibold text-gray-600 dark:text-gray-400 mb-2">
        <div className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-[#9FE1CB]"></span> Low</div>
        <div className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-[#FAC775]"></span> Medium</div>
        <div className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-[#F09595]"></span> High</div>
        <div className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-[#3B82F6]"></span> Food stand</div>
      </div>

      <div className="px-6 shrink-0 mb-2">
        <div className="bg-[#F5F5F0] dark:bg-zinc-900 rounded-3xl p-5 flex justify-between shadow-inner items-center">
          <div>
            <div className="text-gray-600 dark:text-gray-400 mb-1">Quietest zone: <span className="font-bold text-gray-900 dark:text-white capitalize">{quietestZone.name.replace('Zone ', '')}</span></div>
            <div className="font-bold text-xl text-gray-900 dark:text-white">({quietestZone.density}%)</div>
          </div>
          <div className="w-px h-12 bg-gray-300 dark:bg-zinc-700"></div>
          <div>
            <div className="text-gray-600 dark:text-gray-400 mb-1">Fastest food: <span className="font-bold text-gray-900 dark:text-white">{fastestFood.name}</span></div>
            <div className="font-bold text-xl text-gray-900 dark:text-white">({fastestFood.waitTime}m)</div>
          </div>
        </div>
      </div>

      <BottomNav />
    </div>
  );
};
