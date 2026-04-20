import { logEvent } from 'firebase/analytics';
import { getApp, getApps } from 'firebase/app';
import { getAnalytics } from 'firebase/analytics';

let analyticsInstance;

function sanitizeParams(params = {}) {
  return Object.fromEntries(
    Object.entries(params).filter(([, value]) => value !== undefined && value !== null)
  );
}

export function trackEvent(name, params = {}) {
  if (!name || typeof window === 'undefined') return;

  if (!analyticsInstance) {
    const measurementId = import.meta.env.VITE_FIREBASE_MEASUREMENT_ID;
    if (!measurementId || getApps().length === 0) return;
    try {
      analyticsInstance = getAnalytics(getApp());
    } catch {
      return;
    }
  }

  try {
    logEvent(analyticsInstance, name, sanitizeParams(params));
  } catch (error) {
    if (import.meta.env.DEV) {
      console.warn('[FlowState] analytics event failed', name, error);
    }
  }
}

export function trackPageView(pathname) {
  if (!pathname) return;
  trackEvent('screen_view', {
    screen_name: pathname,
    screen_class: 'web',
  });
}
