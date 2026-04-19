import React from 'react';
import { NavLink } from 'react-router-dom';
import { Home, Map as MapIcon, Users, Gift, User, Activity } from 'lucide-react';

export const BottomNav = () => {
  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white dark:bg-zinc-900 border-t border-gray-200 dark:border-zinc-800 pb-safe z-50 rounded-t-3xl shadow-[0_-4px_20px_rgba(0,0,0,0.05)] py-2 px-6 flex justify-between items-center">
      <NavItem to="/" icon={<Home size={24} />} label="Home" />
      <NavItem to="/map" icon={<MapIcon size={24} />} label="Map" />
      <NavItem to="/group" icon={<Users size={24} />} label="Group" />
      <NavItem to="/rewards" icon={<Gift size={24} />} label="Rewards" />
      {/* <NavItem to="/profile" icon={<User size={24} />} label="Profile" /> */}
      <NavItem to="/operator" icon={<Activity size={24} />} label="Operator" />
    </div>
  );
};

const NavItem = ({ to, icon, label }) => {
  return (
    <NavLink 
      to={to}
      className={({ isActive }) => `flex flex-col items-center p-2 rounded-xl transition-all duration-300 ${isActive ? 'text-blue-500 scale-110' : 'text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300'}`}
    >
      <div className={({ isActive }) => `mb-1 p-2 rounded-full ${isActive ? 'bg-blue-100 dark:bg-blue-900/30' : ''}`}>
        {icon}
      </div>
      <span className="text-[10px] font-medium tracking-wide">{label}</span>
    </NavLink>
  );
};

export const ComfortGauge = ({ value }) => {
  // Value 0-100.
  const radius = 30;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (value / 100) * circumference;

  let color = '#9FE1CB'; // Green
  if (value > 40) color = '#FAC775'; // Amber
  if (value > 70) color = '#F09595'; // Red

  return (
    <div className="relative flex items-center justify-center w-20 h-20">
      <svg className="transform -rotate-90 w-20 h-20">
        <circle
          cx="40"
          cy="40"
          r={radius}
          stroke="currentColor"
          strokeWidth="6"
          fill="transparent"
          className="text-gray-200 dark:text-zinc-800"
        />
        <circle
          cx="40"
          cy="40"
          r={radius}
          stroke={color}
          strokeWidth="6"
          fill="transparent"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          className="transition-all duration-1000 ease-out"
        />
      </svg>
      <div className="absolute flex flex-col items-center justify-center">
        <span className="text-xl font-bold dark:text-white" style={{color}}>{value}%</span>
      </div>
    </div>
  );
};

export const ZoneChip = ({ zoneName, density }) => {
  let colorClass = 'bg-stone-200 text-stone-800'; // Default
  if (density !== undefined) {
    if (density < 40) colorClass = 'bg-[#9FE1CB]/20 text-[#2B7D5F]';
    else if (density <= 70) colorClass = 'bg-[#FAC775]/20 text-[#9C6100]';
    else colorClass = 'bg-[#F09595]/20 text-[#A82020]';
  }

  return (
    <span className={`px-3 py-1 rounded-full text-sm font-semibold tracking-wide flex items-center gap-1.5 backdrop-blur-md ${colorClass}`}>
      <span className={`w-2 h-2 rounded-full ${density < 40 ? 'bg-[#9FE1CB]' : density <= 70 ? 'bg-[#FAC775]' : 'bg-[#F09595]'}`}></span>
      {zoneName}
    </span>
  );
};
