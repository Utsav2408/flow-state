import { create } from 'zustand';
import { db, ref, onValue, populateInitialData } from '../firebase';

/** Logical map coords (see VenueMapCanvas logicalWidth / logicalHeight). Centroid of these four points is the meetup suggestion. */
const DEFAULT_GROUP_MEMBERS = [
  { id: 'You', name: 'You', x: 550, y: 300, zone: 'Section B4, Row 12', color: '#2563EB' },
  { id: 'AK', name: 'Arjun K', x: 510, y: 270, zone: 'Section B4, near Stand 3', color: '#F43F5E' },
  { id: 'RS', name: 'Riya S', x: 220, y: 320, zone: 'Restroom block A', color: '#D97706' },
  { id: 'PV', name: 'Pradeep V', x: 430, y: 580, zone: 'South concourse', color: '#10B981' },
];

export const useStore = create((set) => ({
  simState: { clock: '19:30', speed: 1, state: 'MATCH_IN_PROGRESS' },
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
    if (!db) return;
    
    onValue(ref(db, 'simulation'), (snapshot) => {
      const data = snapshot.val();
      if(data) set({ simState: data });
    });

    onValue(ref(db, 'zones'), (snapshot) => {
      const data = snapshot.val();
      if(data) {
        const newZones = new Map(Object.entries(data));
        set({ zones: newZones });
      }
    });

    onValue(ref(db, 'stands'), (snapshot) => {
      const data = snapshot.val();
      if(data) {
        const newStands = new Map(Object.entries(data));
        set({ stands: newStands });
      }
    });

    onValue(ref(db, 'alerts'), (snapshot) => {
      const data = snapshot.val();
      if(data) set({ alerts: Array.isArray(data) ? data : Object.values(data) });
    });
  }
}));
