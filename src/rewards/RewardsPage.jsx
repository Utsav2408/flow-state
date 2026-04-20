import React from 'react';
import { useNavigate } from 'react-router-dom';
import { BottomNav } from '../components/ui/BottomNav';
import { ChevronLeft, Map, UtensilsCrossed } from 'lucide-react';

export const RewardsPage = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-stone-50 font-sans flex flex-col">
      <header className="px-5 pt-12 pb-4 flex items-center justify-between shadow-sm bg-white/50 backdrop-blur-md sticky top-0 z-20">
        <button
          onClick={() => navigate(-1)}
          className="p-2 bg-gray-100 rounded-full text-gray-700 active:scale-95 transition-transform"
        >
          <ChevronLeft size={20} />
        </button>
        <h1 className="text-xl font-extrabold text-gray-900 absolute left-1/2 -translate-x-1/2">Rewards</h1>
        <div className="w-9" />
      </header>

      <div className="px-5 pt-4">
        {/* Points Card */}
        <div className="bg-white rounded-3xl p-5 shadow-sm border border-gray-100 mb-6 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="relative w-16 h-16 flex items-center justify-center rounded-full border-4 border-amber-400">
              <span className="text-xl font-extrabold text-gray-900">340</span>
            </div>
            <div>
              <h3 className="text-sm font-bold text-gray-900 leading-tight">
                Prompt
                <br />
                credits
              </h3>
              <p className="text-xs font-medium text-gray-500 mt-1">
                Earned today: <span className="text-emerald-600">+120 pts</span>
              </p>
            </div>
          </div>
          <button className="bg-gray-100 text-gray-900 text-xs font-bold py-2 px-4 rounded-xl active:scale-95 transition-transform hover:bg-gray-200">
            Redeem
          </button>
        </div>

        <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">ACTIVE OFFERS NEAR YOU</h3>

        <div className="space-y-3 mb-6">
          <OfferCard
            icon={<span className="text-rose-500 text-lg">🎯</span>}
            title="2x points at Stand 12"
            desc="South concourse - almost empty right now. Any purchase qualifies."
            pts="+50 pts"
            info="90m away"
            bg="bg-rose-50"
            tag="3 min left"
            tagColor="text-rose-600 bg-rose-100"
          />
          <OfferCard
            icon={<Map size={18} className="text-indigo-500" />}
            title="Explore zone C1 AR experience"
            desc="Interactive player stats overlay. Scan the pitch from the south stand."
            pts="+30 pts"
            info="120m away"
            bg="bg-indigo-50"
            tag="8 min left"
            tagColor="text-amber-600 bg-amber-100"
          />
          <OfferCard
            icon={<UtensilsCrossed size={18} className="text-emerald-500" />}
            title="Off-peak restroom bonus"
            desc="Restroom block B has 0 queue. Use it now and earn points."
            pts="+15 pts"
            info="40m away"
            bg="bg-emerald-50"
          />
        </div>

        <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">RECENT ACTIVITY</h3>
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 space-y-4">
          <ActivityRow icon="•" color="text-emerald-500" title="Visited Stand 3 during off-peak" pts="+25" />
          <ActivityRow icon="•" color="text-emerald-500" title="Used Route A (cooperative routing)" pts="+15" />
          <ActivityRow icon="•" color="text-blue-500" title="Checked in at gate on time" pts="+80" />
        </div>
      </div>
      <BottomNav />
    </div>
  );
};

const OfferCard = ({ icon, title, desc, pts, info, bg, tag, tagColor }) => (
  <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 relative mt-2">
    {tag && (
      <div className={`absolute top-0 right-4 -translate-y-1/2 px-2 py-0.5 rounded-full text-[9px] font-bold ${tagColor}`}>
        {tag}
      </div>
    )}
    <div className="flex gap-3">
      <div className={`w-10 h-10 shrink-0 rounded-2xl ${bg} flex items-center justify-center`}>{icon}</div>
      <div className="flex-1 min-w-0">
        <h4 className="text-sm font-bold text-gray-900 leading-tight pr-4">{title}</h4>
        <p className="text-[11px] font-medium text-gray-600 mt-1 leading-relaxed">{desc}</p>
        <p className="text-xs font-medium text-gray-500 mt-2 flex items-center gap-2">
          <span className="font-bold text-emerald-600">{pts}</span> <span>{info}</span>
        </p>
      </div>
      <div className="flex flex-col justify-center shrink-0">
        <button className="bg-white border border-gray-200 text-gray-900 font-bold text-xs py-2 px-4 rounded-xl shadow-sm active:scale-95 transition-transform hover:bg-gray-50">
          Go
        </button>
      </div>
    </div>
  </div>
);

const ActivityRow = ({ icon, color, title, pts }) => (
  <div className="flex items-center justify-between">
    <div className="flex items-center gap-2">
      <span className={`text-xl -mt-0.5 ${color}`}>{icon}</span>
      <span className="text-xs font-medium text-gray-700">{title}</span>
    </div>
    <span className="text-xs font-bold text-emerald-600">{pts}</span>
  </div>
);
