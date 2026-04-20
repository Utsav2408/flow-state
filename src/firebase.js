import { initializeApp } from 'firebase/app';
import { initializeAppCheck, ReCaptchaV3Provider } from 'firebase/app-check';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { getDatabase, ref, onValue, set, update } from 'firebase/database';
import { ZONE_TARGETS } from './models/venueLayout';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY ?? '',
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN ?? '',
  databaseURL: import.meta.env.VITE_FIREBASE_DATABASE_URL ?? '',
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID ?? '',
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET ?? '',
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID ?? '',
  appId: import.meta.env.VITE_FIREBASE_APP_ID ?? '',
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID ?? '',
};

const canInit = Boolean(
  firebaseConfig.apiKey &&
    firebaseConfig.authDomain &&
    firebaseConfig.databaseURL &&
    firebaseConfig.projectId
);
const isProductionBuild = import.meta.env.PROD;
const appCheckEnabledInDev = import.meta.env.VITE_ENABLE_APPCHECK_IN_DEV === 'true';

let app;
let db;
let auth;
let appCheck = null;

if (canInit) {
  try {
    app = initializeApp(firebaseConfig);
    db = getDatabase(app);
    auth = getAuth(app);

    if (typeof window !== 'undefined') {
      const appCheckSiteKey = import.meta.env.VITE_RECAPTCHA_V3_SITE_KEY;
      const shouldInitAppCheck = isProductionBuild || appCheckEnabledInDev;
      if (appCheckSiteKey && shouldInitAppCheck) {
        appCheck = initializeAppCheck(app, {
          provider: new ReCaptchaV3Provider(appCheckSiteKey),
          isTokenAutoRefreshEnabled: true,
        });
      } else if (appCheckSiteKey && !shouldInitAppCheck && import.meta.env.DEV) {
        console.info(
          'Firebase App Check skipped in development. Set VITE_ENABLE_APPCHECK_IN_DEV=true to test App Check locally.'
        );
      } else if (isProductionBuild) {
        throw new Error(
          'Security check failed: VITE_RECAPTCHA_V3_SITE_KEY is required in production for Firebase App Check.'
        );
      }
    }
  } catch (e) {
    console.warn('Firebase init failed:', e);
  }
} else {
  console.warn(
    'Firebase disabled: set VITE_FIREBASE_* variables in .env (see .env.example).'
  );
}

export const googleProvider = new GoogleAuthProvider();

export { db, auth, ref, onValue, set, update };
export { appCheck };

/** Destructive: overwrites simulation, zones, stands, alerts. Enable only via VITE_SEED_DATABASE=true */
export async function populateInitialData() {
  if (!db) return;
  if (isProductionBuild) {
    console.error('populateInitialData blocked: production build detected.');
    return;
  }
  if (import.meta.env.VITE_SEED_DATABASE !== 'true') {
    console.warn('populateInitialData blocked: VITE_SEED_DATABASE is not enabled.');
    return;
  }
  await set(ref(db, 'simulation'), {
    clock: '19:30',
    speed: 1,
    state: 'MATCH_IN_PROGRESS',
    halftimeCountdownSeconds: 480,
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

    zonesInfo[z] = { density, name: `Zone ${z}`, capacity: ZONE_TARGETS[z]?.capacity ?? 1000 };
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
