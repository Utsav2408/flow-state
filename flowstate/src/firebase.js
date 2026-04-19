import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { getDatabase, ref, onValue, set } from 'firebase/database';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY ?? '',
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN ?? '',
  databaseURL: import.meta.env.VITE_FIREBASE_DATABASE_URL ?? '',
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID ?? '',
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET ?? '',
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID ?? '',
  appId: import.meta.env.VITE_FIREBASE_APP_ID ?? '',
};

const canInit = Boolean(
  firebaseConfig.apiKey &&
    firebaseConfig.authDomain &&
    firebaseConfig.databaseURL &&
    firebaseConfig.projectId
);

let app;
let db;
let auth;

if (canInit) {
  try {
    app = initializeApp(firebaseConfig);
    db = getDatabase(app);
    auth = getAuth(app);
  } catch (e) {
    console.warn('Firebase init failed:', e);
  }
} else {
  console.warn(
    'Firebase disabled: set VITE_FIREBASE_* variables in .env (see .env.example).'
  );
}

export const googleProvider = new GoogleAuthProvider();

export { db, auth, ref, onValue, set };

/** Destructive: overwrites simulation, zones, stands, alerts. Enable only via VITE_SEED_DATABASE=true */
export async function populateInitialData() {
  if (!db) return;
  await set(ref(db, 'simulation'), {
    clock: '19:30',
    speed: 1,
    state: 'MATCH_IN_PROGRESS',
  });

  const zonesInfo = {};
  const zoneNames = [
    ...Array.from({ length: 4 }, (_, i) => `A${i + 1}`),
    ...Array.from({ length: 6 }, (_, i) => `B${i + 1}`),
    ...Array.from({ length: 6 }, (_, i) => `C${i + 1}`),
    ...Array.from({ length: 3 }, (_, i) => `D${i + 1}`),
  ];

  zoneNames.forEach((z) => {
    let density = Math.floor(Math.random() * 100);
    if (['A1', 'A2', 'A3', 'A4'].includes(z)) density = 92;
    if (['B1', 'B2', 'B3'].includes(z)) density = 78;
    if (['B4', 'B5', 'B6'].includes(z)) density = 45;
    if (['C1', 'C2', 'C3'].includes(z)) density = 38;
    if (['C4', 'C5', 'C6'].includes(z)) density = 65;
    if (['D1', 'D2', 'D3'].includes(z)) density = 58;

    zonesInfo[z] = { density, name: `Zone ${z}`, capacity: 1000 };
  });
  await set(ref(db, 'zones'), zonesInfo);

  const standsInfo = {};
  const standsNames = Array.from({ length: 12 }, (_, i) => `S${i + 1}`);
  standsNames.forEach((s) => {
    let waitTime = Math.floor(Math.random() * 15);
    if (s === 'S3') waitTime = 2;
    if (s === 'S5') waitTime = 5;
    if (s === 'S7') waitTime = 8;
    if (s === 'S12') waitTime = 1;

    standsInfo[s] = { waitTime, name: `Food Stand ${s}`, position: { x: 0, y: 0 } };
  });
  await set(ref(db, 'stands'), standsInfo);

  await set(ref(db, 'alerts'), [
    { message: 'High congestion near Gate 1', severity: 'high', timestamp: Date.now() },
    { message: 'Stand S12 has low wait time', severity: 'low', timestamp: Date.now() - 100000 },
  ]);
}
