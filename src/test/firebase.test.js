import { afterEach, describe, expect, it, vi } from 'vitest';

describe('firebase module', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  it('does not initialize firebase when env is incomplete', async () => {
    vi.stubEnv('VITE_FIREBASE_API_KEY', '');
    vi.stubEnv('VITE_FIREBASE_AUTH_DOMAIN', '');
    vi.stubEnv('VITE_FIREBASE_DATABASE_URL', '');
    vi.stubEnv('VITE_FIREBASE_PROJECT_ID', '');

    const initializeApp = vi.fn();
    const getDatabase = vi.fn();
    const getAuth = vi.fn();

    vi.doMock('firebase/app', () => ({ initializeApp }));
    vi.doMock('firebase/auth', () => ({
      getAuth,
      GoogleAuthProvider: function GoogleAuthProvider() {},
    }));
    vi.doMock('firebase/database', () => ({
      getDatabase,
      ref: vi.fn((_db, path) => path),
      onValue: vi.fn(),
      set: vi.fn(),
      update: vi.fn(),
    }));

    const mod = await import('../firebase');

    expect(initializeApp).not.toHaveBeenCalled();
    expect(mod.db).toBeUndefined();
    await expect(mod.populateInitialData()).resolves.toBeUndefined();
  });

  it('initializes firebase and writes seeded data', async () => {
    vi.stubEnv('VITE_FIREBASE_API_KEY', 'k');
    vi.stubEnv('VITE_FIREBASE_AUTH_DOMAIN', 'a');
    vi.stubEnv('VITE_FIREBASE_DATABASE_URL', 'https://db');
    vi.stubEnv('VITE_FIREBASE_PROJECT_ID', 'p');
    vi.stubEnv('VITE_FIREBASE_STORAGE_BUCKET', 'b');
    vi.stubEnv('VITE_FIREBASE_MESSAGING_SENDER_ID', 'm');
    vi.stubEnv('VITE_FIREBASE_APP_ID', 'app');
    vi.stubEnv('VITE_SEED_DATABASE', 'true');
    vi.stubEnv('VITE_RECAPTCHA_V3_SITE_KEY', '');

    const setMock = vi.fn().mockResolvedValue(undefined);
    const refMock = vi.fn((_db, path) => path);
    const initializeApp = vi.fn(() => ({ id: 'app' }));
    const getDatabase = vi.fn(() => ({ id: 'db' }));
    const getAuth = vi.fn(() => ({ id: 'auth' }));

    vi.doMock('firebase/app', () => ({ initializeApp }));
    vi.doMock('firebase/auth', () => ({
      getAuth,
      GoogleAuthProvider: function GoogleAuthProvider() {},
    }));
    vi.doMock('firebase/database', () => ({
      getDatabase,
      ref: refMock,
      onValue: vi.fn(),
      set: setMock,
      update: vi.fn(),
    }));

    const mod = await import('../firebase');

    expect(initializeApp).toHaveBeenCalled();
    expect(getDatabase).toHaveBeenCalled();
    expect(getAuth).toHaveBeenCalled();
    expect(mod.db).toEqual({ id: 'db' });
    expect(mod.auth).toEqual({ id: 'auth' });

    await mod.populateInitialData();

    expect(refMock).toHaveBeenCalledWith({ id: 'db' }, 'simulation');
    expect(refMock).toHaveBeenCalledWith({ id: 'db' }, 'zones');
    expect(refMock).toHaveBeenCalledWith({ id: 'db' }, 'stands');
    expect(refMock).toHaveBeenCalledWith({ id: 'db' }, 'alerts');
    expect(setMock).toHaveBeenCalledTimes(4);
  });
});
