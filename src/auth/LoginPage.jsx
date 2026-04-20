import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from './useAuth';
import { Activity, LogIn, Mail, KeyRound, AlertCircle } from 'lucide-react';

/** Safe in-app path after login; non-admins cannot be sent to /operator. */
function resolvePostLoginTarget(rawNext, isAdmin) {
  let path = '/';
  try {
    path = rawNext ? decodeURIComponent(rawNext) : '/';
  } catch {
    path = '/';
  }
  if (!path.startsWith('/') || path.startsWith('//')) path = '/';
  const base = path.split('?')[0];
  if (base === '/operator' && !isAdmin) return '/';
  return path || '/';
}

export const LoginPage = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const next = searchParams.get('next') || '/';
  const { user, isAdmin, loading, signInGoogle, signInEmail, signUpEmail, firebaseConfigured } = useAuth();

  const [mode, setMode] = useState('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [pending, setPending] = useState(false);

  useEffect(() => {
    if (loading || !user) return;
    const target = resolvePostLoginTarget(next, isAdmin);
    navigate(target, { replace: true });
  }, [loading, user, isAdmin, navigate, next]);

  const handleGoogle = async () => {
    setError('');
    setPending(true);
    try {
      await signInGoogle();
    } catch (e) {
      setError(e?.message || 'Google sign-in failed.');
    } finally {
      setPending(false);
    }
  };

  const handleEmail = async (e) => {
    e.preventDefault();
    setError('');
    setPending(true);
    try {
      if (mode === 'signin') {
        await signInEmail(email, password);
      } else {
        await signUpEmail(email, password);
      }
    } catch (e) {
      setError(e?.message || 'Email sign-in failed.');
    } finally {
      setPending(false);
    }
  };

  if (loading) {
    return (
      <main id="main-content" className="min-h-screen flex items-center justify-center bg-slate-100">
        <div className="h-8 w-8 border-2 border-slate-300 border-t-blue-600 rounded-full animate-spin" />
      </main>
    );
  }

  if (!firebaseConfigured) {
    return (
      <main id="main-content" className="min-h-screen flex items-center justify-center bg-slate-100 p-6">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-lg p-8 text-center">
          <AlertCircle className="w-12 h-12 text-amber-500 mx-auto mb-4" />
          <h1 data-page-heading className="text-xl font-bold text-slate-900">
            Firebase not configured
          </h1>
          <p className="text-slate-600 text-sm mt-2">
            Copy <code className="bg-slate-100 px-1 rounded">.env.example</code> to{' '}
            <code className="bg-slate-100 px-1 rounded">.env</code> and add your project keys from the Firebase
            console.
          </p>
          <p className="mt-6 text-sm text-slate-500">
            Add valid keys in <code className="bg-slate-100 px-1 rounded">.env</code>, then reload this page.
          </p>
        </div>
      </main>
    );
  }

  return (
    <main
      id="main-content"
      className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900 px-6 py-12 font-sans"
      aria-label="Login content"
    >
      <div className="w-full max-w-[400px]">
        <div className="flex items-center justify-center gap-2 mb-10 text-white">
          <Activity className="w-8 h-8 text-sky-400" strokeWidth={2.5} />
          <span className="text-2xl font-extrabold tracking-tight">FlowState</span>
        </div>

        <div className="bg-white rounded-3xl shadow-2xl p-8 border border-slate-200/80">
          <h1 data-page-heading className="text-xl font-bold text-slate-900 text-center">
            Sign in to FlowState
          </h1>
          <p className="text-sm text-slate-500 text-center mt-1 mb-8">
            Use Google or email to access the venue app. Operator dashboard requires an admin role in Firebase.
          </p>

          {error && (
            <div
              id="login-error"
              role="alert"
              className="mb-4 rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-800"
            >
              {error}
            </div>
          )}

          <button
            type="button"
            disabled={pending}
            onClick={handleGoogle}
            className="w-full flex items-center justify-center gap-3 rounded-xl border border-slate-200 bg-white py-3.5 font-semibold text-slate-800 shadow-sm hover:bg-slate-50 transition-colors disabled:opacity-50"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              />
            </svg>
            Continue with Google
          </button>

          <div className="relative my-8">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-slate-200" />
            </div>
            <div className="relative flex justify-center text-xs uppercase tracking-wider">
              <span className="bg-white px-3 text-slate-400 font-semibold">or email</span>
            </div>
          </div>

          <div className="flex gap-2 mb-4 p-1 bg-slate-100 rounded-xl">
            <button
              type="button"
              onClick={() => setMode('signin')}
              className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-colors ${
                mode === 'signin' ? 'bg-white shadow text-slate-900' : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              Sign in
            </button>
            <button
              type="button"
              onClick={() => setMode('signup')}
              className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-colors ${
                mode === 'signup' ? 'bg-white shadow text-slate-900' : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              Create account
            </button>
          </div>

          <form onSubmit={handleEmail} className="space-y-4">
            <label className="block">
              <span id="email-label" className="text-xs font-bold text-slate-500 uppercase tracking-wide">
                Email
              </span>
              <div className="mt-1 relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="email"
                  autoComplete="email"
                  required
                  aria-labelledby="email-label"
                  aria-invalid={Boolean(error)}
                  aria-describedby={error ? 'login-error' : undefined}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 py-3 pl-10 pr-4 text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-shadow"
                  placeholder="you@organization.com"
                />
              </div>
            </label>
            <label className="block">
              <span id="password-label" className="text-xs font-bold text-slate-500 uppercase tracking-wide">
                Password
              </span>
              <div className="mt-1 relative">
                <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="password"
                  autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
                  required
                  minLength={6}
                  aria-labelledby="password-label"
                  aria-invalid={Boolean(error)}
                  aria-describedby={error ? 'login-error' : undefined}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 py-3 pl-10 pr-4 text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-shadow"
                  placeholder="••••••••"
                />
              </div>
            </label>
            <button
              type="submit"
              disabled={pending}
              className="w-full flex items-center justify-center gap-2 rounded-xl bg-slate-900 text-white py-3.5 font-semibold hover:bg-slate-800 transition-colors disabled:opacity-50"
            >
              <LogIn className="w-4 h-4" />
              {mode === 'signin' ? 'Sign in' : 'Create account'}
            </button>
          </form>

          <p className="text-center text-xs text-slate-500 mt-8">
            After sign-in you&apos;ll return to the venue experience (home, map, and more).
          </p>
        </div>
      </div>
    </main>
  );
};
