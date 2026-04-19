import { initializeApp } from 'firebase/app';
import { getDatabase, ref, onValue, set } from 'firebase/database';

// Dummy configuration, will work in offline mode or needs real credentials
const firebaseConfig = {
  apiKey: "dummy-api-key",
  authDomain: "flow-state-demo.firebaseapp.com",
  databaseURL: "https://flow-state-demo-default-rtdb.firebaseio.com",
  projectId: "flow-state-demo",
  storageBucket: "flow-state-demo.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abcdef"
};

let app;
let db;

try {
  app = initializeApp(firebaseConfig);
  db = getDatabase(app);
} catch (e) {
  console.warn("Firebase init failed:", e);
}

export { db, ref, onValue, set };

export async function populateInitialData() {
  if (!db) return;
  // Populate /simulation
  await set(ref(db, 'simulation'), {
    clock: "19:30",
    speed: 1,
    state: "MATCH_IN_PROGRESS"
  });

  // Populate zones: A1-A4, B1-B6, C1-C6, D1-D3
  const zonesInfo = {};
  const zoneNames = [
    ...Array.from({length: 4}, (_, i) => `A${i+1}`), 
    ...Array.from({length: 6}, (_, i) => `B${i+1}`),
    ...Array.from({length: 6}, (_, i) => `C${i+1}`),
    ...Array.from({length: 3}, (_, i) => `D${i+1}`)
  ];

  zoneNames.forEach(z => {
    // Generate some realistic densities
    let density = Math.floor(Math.random() * 100);
    // Hardcode some for the wireframe: A1-A4 92%, B1-B3 78%, C1-C3 38%, C4-C6 65%, D1-D3 58%, B4-B6 45%
    if (["A1","A2","A3","A4"].includes(z)) density = 92;
    if (["B1","B2","B3"].includes(z)) density = 78;
    if (["B4","B5","B6"].includes(z)) density = 45;
    if (["C1","C2","C3"].includes(z)) density = 38;
    if (["C4","C5","C6"].includes(z)) density = 65;
    if (["D1","D2","D3"].includes(z)) density = 58;

    zonesInfo[z] = { density, name: `Zone ${z}`, capacity: 1000 };
  });
  await set(ref(db, 'zones'), zonesInfo);

  // Populate stands S1-S12
  const standsInfo = {};
  const standsNames = Array.from({length: 12}, (_, i) => `S${i+1}`);
  standsNames.forEach((s) => {
    let waitTime = Math.floor(Math.random() * 15);
    if (s === "S3") waitTime = 2;
    if (s === "S5") waitTime = 5;
    if (s === "S7") waitTime = 8;
    if (s === "S12") waitTime = 1;

    standsInfo[s] = { waitTime, name: `Food Stand ${s}`, position: { x: 0, y: 0 } };
  });
  await set(ref(db, 'stands'), standsInfo);

  // Populate alerts
  await set(ref(db, 'alerts'), [
    { message: "High congestion near Gate 1", severity: "high", timestamp: Date.now() },
    { message: "Stand S12 has low wait time", severity: "low", timestamp: Date.now() - 100000 }
  ]);
}
