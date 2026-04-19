import { create } from 'zustand';
import { db, ref, onValue, populateInitialData } from '../firebase';

export const useStore = create((set, get) => ({
  simState: { clock: '19:30', speed: 1, state: 'MATCH_IN_PROGRESS' },
  zones: new Map(),
  stands: new Map(),
  currentFan: { location: 'B4-B6', id: 'fan-1' },
  alerts: [],
  
  setSimState: (newState) => set(state => ({ simState: { ...state.simState, ...newState } })),
  updateZones: (zonesMap) => set({ zones: new Map(zonesMap) }),
  updateStands: (standsMap) => set({ stands: new Map(standsMap) }),

  initMockData: async () => {
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
