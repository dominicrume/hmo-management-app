'use client';

import { useState, useEffect } from 'react';
import { createClient as createBrowserClient } from '@/lib/supabase/client';
import { useRouter, useSearchParams } from 'next/navigation';
import { Lock, Mail, Eye, EyeOff, AlertCircle, ShieldAlert } from 'lucide-react';
import { Suspense } from 'react';

type AuthError = { message: string };

function LoginInner() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [email,    setEmail]    = useState('');
  const [password, setPassword] = useState('');
  const [showPwd,  setShowPwd]  = useState(false);
  const [error,    setError]    = useState('');
  const [loading,  setLoading]  = useState(false);
  const [attempts, setAttempts] = useState(0);
  const [locked,   setLocked]   = useState(false);

  // Show error from redirect (e.g. account_deactivated)
  useEffect(() => {
    const err = searchParams.get('error');
    if (err === 'account_deactivated') {
      setError('Your account has been deactivated. Contact your administrator.');
    } else if (err === 'auth_callback_failed') {
      setError('Authentication failed. Please try again.');
    }
  }, [searchParams]);

  // Client-side lockout after 5 failed attempts
  const MAX_ATTEMPTS = 5;
  const LOCKOUT_MS = 15 * 60 * 1000; // 15 minutes

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();

    if (locked) {
      setError('Too many failed attempts. Please wait 15 minutes.');
      return;
    }

    setLoading(true);
    setError('');

    // Basic input validation
    if (!email.trim() || !password.trim()) {
      setError('Email and password are required.');
      setLoading(false);
      return;
    }

    const supabase = createBrowserClient();
    const { data, error: authError } = await supabase.auth.signInWithPassword({
      email: email.trim().toLowerCase(),
      password,
    });

    if (authError) {
      const newAttempts = attempts + 1;
      setAttempts(newAttempts);

      if (newAttempts >= MAX_ATTEMPTS) {
        setLocked(true);
        setError(`Account locked. Too many failed attempts (${MAX_ATTEMPTS}). Please wait 15 minutes.`);
        setTimeout(() => { setLocked(false); setAttempts(0); }, LOCKOUT_MS);
      } else {
        // Generic error message — don't reveal whether email exists
        setError('Invalid email or password.');
      }

      setLoading(false);
      return;
    }

    // Successful login — reset attempts
    setAttempts(0);

    // Audit the login server-side
    if (data.user) {
      try {
        await fetch('/api/auth/audit-login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ method: 'password' }),
        });
      } catch {
        // Don't block login on audit failure
      }
    }

    // Redirect to intended destination or dashboard
    const next = searchParams.get('next') ?? '/dashboard';
    router.push(next);
    router.refresh();
  };

  return (
    <div className="min-h-screen bg-navy flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        {/* Brand */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-amber mb-4">
            <Lock className="w-5 h-5 text-navy" />
          </div>
          <h1 className="text-white font-black text-xl tracking-tight">Matty&apos;s Place</h1>
          <p className="text-slate-400 text-xs mt-1">Staff Portal — Sign In</p>
        </div>

        {/* Card */}
        <div className="bg-navy-light border border-navy-border rounded-2xl p-6 shadow-2xl">
          <form onSubmit={handleLogin} className="space-y-4" noValidate>
            {/* Error */}
            {error && (
              <div className="flex items-start gap-2 px-3 py-2.5 bg-red-900/30 border border-red-700/40 rounded-lg">
                {locked ? (
                  <ShieldAlert className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
                )}
                <p className="text-xs text-red-300">{error}</p>
              </div>
            )}

            {/* Email */}
            <div className="space-y-1.5">
              <label htmlFor="login-email" className="text-xxs font-black text-slate-400 uppercase tracking-wider">
                Email Address
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500" />
                <input
                  id="login-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoComplete="email"
                  placeholder="you@example.com"
                  disabled={locked}
                  className="w-full bg-navy border border-navy-border rounded-lg pl-9 pr-4 py-2.5
                             text-white text-sm placeholder-slate-600
                             focus:outline-none focus:ring-2 focus:ring-amber/50 focus:border-amber/50
                             transition-all disabled:opacity-50"
                />
              </div>
            </div>

            {/* Password */}
            <div className="space-y-1.5">
              <label htmlFor="login-password" className="text-xxs font-black text-slate-400 uppercase tracking-wider">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500" />
                <input
                  id="login-password"
                  type={showPwd ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoComplete="current-password"
                  placeholder="••••••••"
                  disabled={locked}
                  className="w-full bg-navy border border-navy-border rounded-lg pl-9 pr-10 py-2.5
                             text-white text-sm placeholder-slate-600
                             focus:outline-none focus:ring-2 focus:ring-amber/50 focus:border-amber/50
                             transition-all disabled:opacity-50"
                />
                <button
                  type="button"
                  onClick={() => setShowPwd((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
                  aria-label={showPwd ? 'Hide password' : 'Show password'}
                >
                  {showPwd ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>

            {/* Forgot password */}
            <div className="text-right">
              <a href="/reset-password" className="text-xxs text-amber hover:text-amber-light transition-colors">
                Forgot password?
              </a>
            </div>

            {/* Attempt counter */}
            {attempts > 0 && !locked && (
              <p className="text-xxs text-slate-500 text-center">
                {MAX_ATTEMPTS - attempts} attempt{MAX_ATTEMPTS - attempts !== 1 ? 's' : ''} remaining
              </p>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={loading || locked}
              className="w-full bg-amber text-navy font-black text-sm py-2.5 rounded-lg
                         hover:bg-amber-light transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {locked ? 'Account Locked' : loading ? 'Signing in…' : 'Sign In'}
            </button>
          </form>
        </div>

        <p className="text-center text-xxs text-slate-600 mt-6">
          Ash Shahada Housing Association Ltd · Matty&apos;s Place · Reliance Housing
        </p>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginInner />
    </Suspense>
  );
}
