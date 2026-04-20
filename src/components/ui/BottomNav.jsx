import React from 'react';
import { NavLink } from 'react-router-dom';
import { Home, Map as MapIcon, Users, Gift, Activity, Flag } from 'lucide-react';
import { useAuth } from '../../auth/useAuth';
import { useStore } from '../../store/useStore';

export const BottomNav = () => {
  const { isAdmin, loading } = useAuth();
  const simState = useStore((state) => state.simState);
  const simPhase = String(simState?.state || '').toLowerCase();
  const showEgressTab = simPhase === 'post_match' || simPhase === 'post-match';

  return (
    <nav
      aria-label="Primary"
      className="w-full bg-white dark:bg-zinc-900 border-t border-gray-200 dark:border-zinc-800 pb-safe z-50 rounded-t-3xl shadow-[0_-4px_20px_rgba(0,0,0,0.05)] py-2 px-6 flex justify-between items-center mt-auto shrink-0"
    >
      <NavItem to="/" icon={<Home size={24} />} label="Home" />
      <NavItem to="/map" icon={<MapIcon size={24} />} label="Map" />
      <NavItem to="/group" icon={<Users size={24} />} label="Group" />
      {showEgressTab ? (
        <NavItem to="/egress" icon={<Flag size={24} />} label="Egress" />
      ) : (
        <NavItem to="/rewards" icon={<Gift size={24} />} label="Rewards" />
      )}
      {!loading && isAdmin && <NavItem to="/operator" icon={<Activity size={24} />} label="Operator" />}
    </nav>
  );
};

const NavItem = ({ to, icon, label }) => (
  <NavLink
    to={to}
    className={({ isActive }) =>
      `flex min-h-11 min-w-11 flex-col items-center justify-center p-2 rounded-xl transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2 ${
        isActive
          ? 'text-blue-500 scale-110'
          : 'text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300'
      }`
    }
  >
    {({ isActive }) => (
      <>
        <div className={`mb-1 p-2 rounded-full ${isActive ? 'bg-blue-100 dark:bg-blue-900/30' : ''}`}>{icon}</div>
        <span className="text-[10px] font-medium tracking-wide">{label}</span>
      </>
    )}
  </NavLink>
);
