import React, { useCallback, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { BottomNav } from '../../components/ui/BottomNav';
import { VenueMapCanvas } from '../map/VenueMapCanvas';
import { Toast } from '../../components/ui/Toast';
import { useStore } from '../../store/useStore';
import { LOGICAL_MAP, getClosestStandToPoint, ZONE_GROUPS } from '../../models/venueLayout';
import { ChevronLeft, Check } from 'lucide-react';

function pickStandForGroup(stands, members) {
  if (!members?.length) {
    return getClosestStandToPoint(stands, LOGICAL_MAP.cx + 150, LOGICAL_MAP.cy - 100);
  }
  const sx = members.reduce((a, m) => a + m.x, 0) / members.length;
  const sy = members.reduce((a, m) => a + m.y, 0) / members.length;
  return getClosestStandToPoint(stands, sx, sy);
}

export const GroupPage = () => {
  const navigate = useNavigate();
  const stands = useStore((s) => s.stands);
  const groupMembers = useStore((s) => s.groupMembers);
  const [toast, setToast] = useState(null);
  const [pingSent, setPingSent] = useState(false);

  const meetupSuggestion = useMemo(() => {
    if (!groupMembers?.length) {
      return {
        title: 'Section B4, nearest junction',
        point: { x: LOGICAL_MAP.cx + 220, y: LOGICAL_MAP.cy - 100 },
      };
    }

    const sx = groupMembers.reduce((a, m) => a + m.x, 0) / groupMembers.length;
    const sy = groupMembers.reduce((a, m) => a + m.y, 0) / groupMembers.length;

    let closestZone = ZONE_GROUPS[0];
    let minD = Infinity;

    for (const z of ZONE_GROUPS) {
      const d = Math.hypot(z.x - sx, z.y - sy);
      if (d < minD) {
        minD = d;
        closestZone = z;
      }
    }

    return {
      title: `Section ${closestZone.alias[0]}, nearest junction`,
      point: { x: closestZone.x, y: closestZone.y },
    };
  }, [groupMembers]);

  const dismissToast = useCallback(() => setToast(null), []);

  const handlePing = () => {
    setToast({ message: 'Meetup request sent to 3 members!', type: 'success' });
    setPingSent(true);
    setTimeout(() => setPingSent(false), 2000);
  };

  const handleSyncFood = () => {
    const pick = pickStandForGroup(stands, groupMembers);
    const waitLabel = Math.round(Number(pick.waitTime));
    setToast({
      message: `Routing all 4 members to ${pick.id} — ${waitLabel} min wait`,
      type: 'info',
    });
    setTimeout(() => navigate('/map'), 1500);
  };

  return (
    <div className="h-screen bg-stone-50 font-sans flex flex-col">
      <header className="px-5 pt-12 pb-4 flex items-center justify-between shadow-sm bg-white/50 backdrop-blur-md sticky top-0 z-20">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="p-2 bg-gray-100 rounded-full text-gray-700 active:scale-95 transition-transform"
        >
          <ChevronLeft size={20} />
        </button>
        <h1 className="text-xl font-extrabold text-gray-900 absolute left-1/2 -translate-x-1/2">My group</h1>
        <span className="text-xs font-bold bg-gray-100 text-gray-600 px-3 py-1 rounded-full">Match crew</span>
      </header>

      <div className="flex-1 min-h-0 overflow-y-auto px-5 pt-4">
        <div className="h-100 w-full bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden mb-6 relative">
          <VenueMapCanvas
            filters={{ density: true, food: false, exits: false, group: true, route: false }}
            showMeetupCentroid
            customMeetupPoint={meetupSuggestion.point}
          />
        </div>

        <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">4 MEMBERS</h3>

        <div className="space-y-4 mb-6">
          <MemberRow
            initials="You"
            name="You"
            location="Section B4, Row 12"
            status="At seat"
            color="bg-blue-50 text-blue-600 border-blue-200"
            statusColor="text-emerald-600"
          />
          <MemberRow
            initials="AK"
            name="Arjun K"
            location="Section B4, near Stand 3"
            status="~20m away"
            color="bg-rose-50 text-rose-600 border-rose-200"
          />
          <MemberRow
            initials="RS"
            name="Riya S"
            location="Restroom block A"
            status="~85m away"
            color="bg-amber-50 text-amber-600 border-amber-200"
          />
          <MemberRow
            initials="PV"
            name="Pradeep V"
            location="South concourse"
            status="~60m away"
            color="bg-emerald-50 text-emerald-600 border-emerald-200"
          />
        </div>

        <div className="rounded-2xl p-4 bg-white border border-blue-200 shadow-sm relative overflow-hidden mb-6">
          <div className="absolute top-0 left-0 right-0 h-1 bg-blue-500" />
          <p className="text-[10px] font-bold text-blue-500 tracking-wider uppercase text-center mt-1">
            Smart Meetup Suggestion
          </p>
          <h4 className="text-base font-bold text-gray-900 text-center mt-1">{meetupSuggestion.title}</h4>
          <p className="text-xs font-medium text-gray-600 text-center mt-2 leading-relaxed">
            Optimal for all 4 members. Low crowd density right now. Avg walk: 45 seconds.
          </p>
          <button
            type="button"
            onClick={handlePing}
            className="w-full mt-4 bg-white border border-gray-200 text-gray-900 font-bold py-3 rounded-xl shadow-sm active:scale-[0.98] transition-transform inline-flex items-center justify-center gap-2"
          >
            {pingSent ? (
              <>
                <Check className="w-5 h-5 text-emerald-600" strokeWidth={2.5} aria-hidden />
                <span>Sent!</span>
              </>
            ) : (
              'Ping everyone to meet here'
            )}
          </button>
        </div>

        <div className="flex gap-3">
          <button
            type="button"
            onClick={handleSyncFood}
            className="flex-1 bg-orange-50 text-orange-900 text-sm font-bold py-4 rounded-2xl border border-orange-100 flex flex-col items-center gap-2 active:scale-95 transition-transform"
          >
            <span className="text-xl">🍔</span>
            <span>Sync food run</span>
          </button>
          <button
            type="button"
            className="flex-1 bg-purple-50 text-purple-900 text-sm font-bold py-4 rounded-2xl border border-purple-100 flex flex-col items-center gap-2 active:scale-95 transition-transform"
          >
            <span className="text-xl">💬</span>
            <span>Quick message</span>
          </button>
        </div>
      </div>
      <BottomNav />
      {toast && (
        <Toast
          key={`${toast.message}-${toast.type}`}
          message={toast.message}
          type={toast.type}
          onDismiss={dismissToast}
        />
      )}
    </div>
  );
};

const MemberRow = ({ initials, name, location, status, color, statusColor = 'text-gray-600' }) => (
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
