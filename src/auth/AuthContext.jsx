import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut as firebaseSignOut,
  onAuthStateChanged,
} from 'firebase/auth';
import { auth, db, googleProvider, ref, onValue } from '../firebase';
import { AuthContext } from './context.js';
import { trackEvent } from '../services/analyticsService';

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [role, setRole] = useState(null);
  const [authReady, setAuthReady] = useState(() => !auth);
  const [roleReady, setRoleReady] = useState(true);

  useEffect(() => {
    if (!auth) return;
    const unsub = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setAuthReady(true);
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    if (!db || !user) {
      queueMicrotask(() => {
        setRole(null);
        setRoleReady(true);
      });
      return;
    }
    queueMicrotask(() => setRoleReady(false));
    const r = ref(db, `userRoles/${user.uid}`);
    const unsub = onValue(
      r,
      (snap) => {
        const v = snap.val();
        const resolved = v === 'admin' ? 'admin' : 'fan';
        if (import.meta.env.DEV) {
          console.info('[FlowState] userRoles snapshot', {
            uid: user.uid,
            email: user.email ?? null,
            path: `userRoles/${user.uid}`,
            raw: v,
            role: resolved,
            isAdmin: resolved === 'admin',
          });
        }
        setRole(resolved);
        setRoleReady(true);
      },
      (err) => {
        if (import.meta.env.DEV) {
          console.warn('[FlowState] userRoles listener error', err);
        }
        setRole('fan');
        setRoleReady(true);
      }
    );
    return () => unsub();
  }, [user]);

  const signInGoogle = useCallback(async () => {
    if (!auth) throw new Error('Firebase Auth is not configured.');
    try {
      await signInWithPopup(auth, googleProvider);
      trackEvent('login', { method: 'google' });
    } catch (error) {
      trackEvent('login_failed', { method: 'google' });
      throw error;
    }
  }, []);

  const signInEmail = useCallback(async (email, password) => {
    if (!auth) throw new Error('Firebase Auth is not configured.');
    try {
      await signInWithEmailAndPassword(auth, email, password);
      trackEvent('login', { method: 'email' });
    } catch (error) {
      trackEvent('login_failed', { method: 'email' });
      throw error;
    }
  }, []);

  const signUpEmail = useCallback(async (email, password) => {
    if (!auth) throw new Error('Firebase Auth is not configured.');
    try {
      await createUserWithEmailAndPassword(auth, email, password);
      trackEvent('sign_up', { method: 'email' });
    } catch (error) {
      trackEvent('sign_up_failed', { method: 'email' });
      throw error;
    }
  }, []);

  const signOut = useCallback(async () => {
    if (!auth) return;
    await firebaseSignOut(auth);
    trackEvent('logout');
  }, []);

  const loading = !authReady || (!!user && !roleReady);
  const isAdmin = role === 'admin';

  const value = useMemo(
    () => ({
      user,
      role,
      isAdmin,
      loading,
      firebaseConfigured: Boolean(auth && db),
      signInGoogle,
      signInEmail,
      signUpEmail,
      signOut,
    }),
    [
      user,
      role,
      isAdmin,
      loading,
      signInGoogle,
      signInEmail,
      signUpEmail,
      signOut,
    ]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
