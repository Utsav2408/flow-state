import { create } from 'zustand';
import { db, ref, onValue, populateInitialData } from '../firebase';
import { projectOutsideInnerGroundCircle } from '../models/venueLayout';

/** Logical map coords (see VenueMapCanvas logicalWidth / logicalHeight). Positions snap outside the inner cricket-ground circle. */
const GROUP_MEMBER_SEED = [
  { id: 'You', name: 'You', x: 550, y: 300, zone: 'Section B4, Row 12', color: '#2563EB' },
  { id: 'AK', name: 'Arjun K', x: 510, y: 270, zone: 'Section B4, near Stand 3', color: '#F43F5E' },
  { id: 'RS', name: 'Riya S', x: 220, y: 320, zone: 'Restroom block A', color: '#D97706' },
  { id: 'PV', name: 'Pradeep V', x: 430, y: 580, zone: 'South concourse', color: '#10B981' },
];

const DEFAULT_GROUP_MEMBERS = GROUP_MEMBER_SEED.map((m) => {
  const p = projectOutsideInnerGroundCircle(m.x, m.y);
  return { ...m, x: p.x, y: p.y };
});

export const useStore = create((set) => ({
  simState: {
    clock: '19:30',
    speed: 1,
    state: 'MATCH_IN_PROGRESS',
    simTimeSecs: 0,
    postMatchElapsedSecs: 0,
    /** Countdown for targeted offers / halftime UI (seconds). Overwritten by RTDB `simulation`. */
    halftimeCountdownSeconds: 480,
  },
  zones: new Map(),
  stands: new Map(),
  currentFan: { location: 'B4-B6', id: 'fan-1' },
  /** Four group members on the venue map (logical coordinates). UI recomputes meetup centroid from these. */
  groupMembers: DEFAULT_GROUP_MEMBERS,
  alerts: [],
  activeRoute: null,
  /** Incremented after each Nash batch so fan UI can re-read routing stats */
  nashRoutingEpoch: 0,
  bumpNashRoutingEpoch: () => set((s) => ({ nashRoutingEpoch: s.nashRoutingEpoch + 1 })),
  
  setSimState: (newState) => set(state => ({ simState: { ...state.simState, ...newState } })),
  updateZones: (zonesMap) => set({ zones: new Map(zonesMap) }),
  updateStands: (standsMap) => set({ stands: new Map(standsMap) }),
  setActiveRoute: (route) => set({ activeRoute: route }),
  clearActiveRoute: () => set({ activeRoute: null }),

  initMockData: async () => {
    if (import.meta.env.VITE_SEED_DATABASE !== 'true') return;
    await populateInitialData();
  },

  subscribeToData: () => {
    if (!db) return () => {};
    
    const unsub1 = onValue(ref(db, 'simulation'), (snapshot) => {
      const data = snapshot.val();
      if (data)
        set((state) => ({
          simState: { ...state.simState, ...data },
        }));
    });

    const unsub2 = onValue(ref(db, 'zones'), (snapshot) => {
      const data = snapshot.val();
      if(data) {
        const newZones = new Map(Object.entries(data));
        set({ zones: newZones });
      }
    });

    const unsub3 = onValue(ref(db, 'stands'), (snapshot) => {
      const data = snapshot.val();
      if(data) {
        const newStands = new Map(Object.entries(data));
        set({ stands: newStands });
      }
    });

    const unsub4 = onValue(ref(db, 'alerts'), (snapshot) => {
      const data = snapshot.val();
      if(data) set({ alerts: Array.isArray(data) ? data : Object.values(data) });
    });

    return () => {
      unsub1();
      unsub2();
      unsub3();
      unsub4();
    };
  },

  /** Operator dashboard is outside FanAppBootstrap; subscribe to RTDB alerts only. */
  subscribeToAlerts: () => {
    if (!db) return () => {};
    const unsub = onValue(ref(db, 'alerts'), (snapshot) => {
      const data = snapshot.val();
      if (data) set({ alerts: Array.isArray(data) ? data : Object.values(data) });
    });
    return () => unsub();
  },
}));
