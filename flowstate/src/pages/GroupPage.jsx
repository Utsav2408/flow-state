import React from 'react';
import { useNavigate } from 'react-router-dom';
import { BottomNav } from '../components/Shared';
import { VenueMapCanvas } from '../components/VenueMapCanvas';
import { ChevronLeft } from 'lucide-react';

export const GroupPage = () => {
  const navigate = useNavigate();
  return (
    <div className="pb-24 min-h-screen bg-stone-50 font-sans flex flex-col">
      <header className="px-5 pt-12 pb-4 flex items-center justify-between shadow-sm bg-white/50 backdrop-blur-md sticky top-0 z-20">
        <button onClick={() => navigate(-1)} className="p-2 bg-gray-100 rounded-full text-gray-700 active:scale-95 transition-transform">
          <ChevronLeft size={20} />
        </button>
        <h1 className="text-xl font-extrabold text-gray-900 absolute left-1/2 -translate-x-1/2">My group</h1>
        <span className="text-xs font-bold bg-gray-100 text-gray-600 px-3 py-1 rounded-full">Match crew</span>
      </header>

      <div className="px-5 pt-4">
        <div className="h-48 w-full bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden mb-6 relative p-2">
            <VenueMapCanvas filters={{ density: false, food: false, exits: false, group: true }} />
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-20 h-12 border-2 border-dashed border-blue-300 bg-blue-50/50 rounded-xl flex items-center justify-center">
              <span className="text-[10px] font-bold text-blue-600">Meetup</span>
            </div>
        </div>

        <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">4 MEMBERS</h3>
        
        <div className="space-y-4 mb-6">
          <MemberRow initials="You" name="You" location="Section B4, Row 12" status="At seat" color="bg-blue-50 text-blue-600 border-blue-200" statusColor="text-emerald-600" />
          <MemberRow initials="AK" name="Arjun K" location="Section B4, near Stand 3" status="~20m away" color="bg-rose-50 text-rose-600 border-rose-200" />
          <MemberRow initials="RS" name="Riya S" location="Restroom block A" status="~85m away" color="bg-amber-50 text-amber-600 border-amber-200" />
          <MemberRow initials="PV" name="Pradeep V" location="South concourse" status="~60m away" color="bg-emerald-50 text-emerald-600 border-emerald-200" />
        </div>

        <div className="rounded-2xl p-4 bg-white border border-blue-200 shadow-sm relative overflow-hidden mb-6">
           <div className="absolute top-0 left-0 right-0 h-1 bg-blue-500" />
           <p className="text-[10px] font-bold text-blue-500 tracking-wider uppercase text-center mt-1">Smart Meetup Suggestion</p>
           <h4 className="text-base font-bold text-gray-900 text-center mt-1">Section B4, Aisle 3 junction</h4>
           <p className="text-xs font-medium text-gray-600 text-center mt-2 leading-relaxed">Optimal for all 4 members. Low crowd density right now. Avg walk: 45 seconds.</p>
           <button className="w-full mt-4 bg-white border border-gray-200 text-gray-900 font-bold py-3 rounded-xl shadow-sm active:scale-[0.98] transition-transform">
             Ping everyone to meet here
           </button>
        </div>

        <div className="flex gap-3">
           <button className="flex-1 bg-orange-50 text-orange-900 text-sm font-bold py-4 rounded-2xl border border-orange-100 flex flex-col items-center gap-2 active:scale-95 transition-transform">
             <span className="text-xl">🍔</span>
             <span>Sync food run</span>
           </button>
           <button className="flex-1 bg-purple-50 text-purple-900 text-sm font-bold py-4 rounded-2xl border border-purple-100 flex flex-col items-center gap-2 active:scale-95 transition-transform">
             <span className="text-xl">💬</span>
             <span>Quick message</span>
           </button>
        </div>
      </div>
      <BottomNav />
    </div>
  );
};

const MemberRow = ({ initials, name, location, status, color, statusColor = "text-gray-600" }) => (
  <div className="flex items-center gap-3">
    <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-xs border ${color}`}>
      {initials}
    </div>
    <div className="flex-1 min-w-0">
      <h4 className="text-sm font-bold text-gray-900 truncate">{name}</h4>
      <p className="text-xs font-medium text-gray-500 truncate">{location}</p>
    </div>
    <span className={`text-xs font-bold ${statusColor}`}>{status}</span>
  </div>
);
