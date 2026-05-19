'use client';

export const dynamic = 'force-dynamic';

import { useState, useEffect } from 'react';
import { createClient as createBrowserClient } from '@/lib/supabase/client';
import { checkPasswordStrength } from '@/lib/security/password';
import { Lock, Mail, Eye, EyeOff, ArrowLeft, CheckCircle2, AlertCircle } from 'lucide-react';
import Link from 'next/link';

type PageState = 'request' | 'sent' | 'update' | 'done';

export default function ResetPasswordPage() {
  const [pageState, setPageState] = useState<PageState>('request');
  const [email,     setEmail]     = useState('');
  const [password,  setPassword]  = useState('');
  const [confirm,   setConfirm]   = useState('');
  const [showPwd,   setShowPwd]   = useState(false);
  const [error,     setError]     = useState('');
  const [loading,   setLoading]   = useState(false);

  // If user arrives with an active session (after clicking the reset link),
  // skip straight to the set-new-password form.
  useEffect(() => {
    const check = async () => {
      const supabase = createBrowserClient();
      const { data } = await supabase.auth.getUser();
      if (data.user) setPageState('update');
    };
    check();
  }, []);

  const handleRequestReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) { setError('Email is required.'); return; }
    setLoading(true);
    setError('');

    const supabase = createBrowserClient();
    const redirectTo = `${window.location.origin}/auth/callback?next=/reset-password`;
    const { error: err } = await supabase.auth.resetPasswordForEmail(
      email.trim().toLowerCase(),
      { redirectTo }
    );

    setLoading(false);
    if (err) { setError(err.message); return; }
    setPageState('sent');
  };

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const strength = checkPasswordStrength(password);
    if (!strength.valid) { setError(strength.errors.join(' · ')); return; }
    if (password !== confirm) { setError('Passwords do not match.'); return; }

    setLoading(true);
    const supabase = createBrowserClient();
    const { error: err } = await supabase.auth.updateUser({ password });
    setLoading(false);

    if (err) { setError(err.message); return; }
    await supabase.auth.signOut({ scope: 'others' });
    setPageState('done');
  };

  const strength = checkPasswordStrength(password);
  const barColour = ['bg-red-500', 'bg-orange-500', 'bg-amber-500', 'bg-green-500'][Math.max(0, strength.score - 1)] ?? 'bg-slate-700';

  return (
    <div className="min-h-screen bg-navy flex items-center justify-center px-4">
      <div className="w-full max-w-sm">

        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-amber mb-4">
            <Lock className="w-5 h-5 text-navy" aria-hidden="true" />
          </div>
          <h1 className="text-white font-black text-xl tracking-tight">Matty&apos;s Place</h1>
          <p className="text-slate-400 text-xs mt-1">Password Reset</p>
        </div>

        <div className="bg-navy-light border border-navy-border rounded-2xl p-6 shadow-2xl">

          {/* ── Request reset ── */}
          {pageState === 'request' && (
            <form onSubmit={handleRequestReset} className="space-y-4" noValidate>
              <div>
                <h2 className="text-white font-bold text-sm">Forgot your password?</h2>
                <p className="text-slate-400 text-xs mt-1">Enter your email and we&apos;ll send a reset link.</p>
              </div>
              {error && (
                <div className="flex items-start gap-2 px-3 py-2.5 bg-red-900/30 border border-red-700/40 rounded-lg">
                  <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" aria-hidden="true" />
                  <p className="text-xs text-red-300">{error}</p>
                </div>
              )}
              <div className="space-y-1.5">
                <label htmlFor="reset-email" className="text-xxs font-black text-slate-400 uppercase tracking-wider">Email Address</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500" aria-hidden="true" />
                  <input
                    id="reset-email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    autoComplete="email"
                    placeholder="you@example.com"
                    className="w-full bg-navy border border-navy-border rounded-lg pl-9 pr-4 py-2.5
                               text-white text-sm placeholder-slate-600
                               focus:outline-none focus:ring-2 focus:ring-amber/50 transition-all"
                  />
                </div>
              </div>
              <button type="submit" disabled={loading}
                className="w-full bg-amber text-navy font-black text-sm py-2.5 rounded-lg hover:bg-amber-light transition-colors disabled:opacity-50">
                {loading ? 'Sending…' : 'Send Reset Link'}
              </button>
            </form>
          )}

          {/* ── Email sent ── */}
          {pageState === 'sent' && (
            <div className="text-center space-y-3 py-2">
              <CheckCircle2 className="w-10 h-10 text-green-400 mx-auto" aria-hidden="true" />
              <h2 className="text-white font-bold text-sm">Check your email</h2>
              <p className="text-slate-400 text-xs">
                Reset link sent to <span className="text-amber">{email}</span>. Expires in 1 hour.
              </p>
              <button type="button" onClick={() => { setPageState('request'); setEmail(''); }}
                className="text-xxs text-slate-500 hover:text-slate-300 transition-colors underline">
                Try a different email
              </button>
            </div>
          )}

          {/* ── Set new password ── */}
          {pageState === 'update' && (
            <form onSubmit={handleUpdatePassword} className="space-y-4" noValidate>
              <div>
                <h2 className="text-white font-bold text-sm">Set a new password</h2>
                <p className="text-slate-400 text-xs mt-1">Min 8 chars, uppercase, number, and symbol.</p>
              </div>
              {error && (
                <div className="flex items-start gap-2 px-3 py-2.5 bg-red-900/30 border border-red-700/40 rounded-lg">
                  <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" aria-hidden="true" />
                  <p className="text-xs text-red-300">{error}</p>
                </div>
              )}
              <div className="space-y-1.5">
                <label htmlFor="new-password" className="text-xxs font-black text-slate-400 uppercase tracking-wider">New Password</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500" aria-hidden="true" />
                  <input
                    id="new-password"
                    type={showPwd ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    autoComplete="new-password"
                    placeholder="••••••••"
                    className="w-full bg-navy border border-navy-border rounded-lg pl-9 pr-10 py-2.5
                               text-white text-sm placeholder-slate-600
                               focus:outline-none focus:ring-2 focus:ring-amber/50 transition-all"
                  />
                  <button type="button" onClick={() => setShowPwd((v) => !v)}
                    aria-label={showPwd ? 'Hide password' : 'Show password'}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300">
                    {showPwd ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                </div>
                {password.length > 0 && (
                  <div className="flex gap-1 mt-1.5">
                    {[1, 2, 3, 4].map((i) => (
                      <div key={i} className={`h-1 flex-1 rounded-full transition-colors ${i <= strength.score ? barColour : 'bg-slate-700'}`} />
                    ))}
                  </div>
                )}
              </div>
              <div className="space-y-1.5">
                <label htmlFor="confirm-password" className="text-xxs font-black text-slate-400 uppercase tracking-wider">Confirm Password</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500" aria-hidden="true" />
                  <input
                    id="confirm-password"
                    type={showPwd ? 'text' : 'password'}
                    value={confirm}
                    onChange={(e) => setConfirm(e.target.value)}
                    required
                    autoComplete="new-password"
                    placeholder="••••••••"
                    className={`w-full bg-navy border rounded-lg pl-9 pr-4 py-2.5 text-white text-sm placeholder-slate-600
                               focus:outline-none focus:ring-2 focus:ring-amber/50 transition-all
                               ${confirm.length > 0 && confirm !== password ? 'border-red-500/60' : 'border-navy-border'}`}
                  />
                </div>
              </div>
              <button type="submit" disabled={loading || !strength.valid}
                className="w-full bg-amber text-navy font-black text-sm py-2.5 rounded-lg hover:bg-amber-light transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                {loading ? 'Updating…' : 'Set New Password'}
              </button>
            </form>
          )}

          {/* ── Done ── */}
          {pageState === 'done' && (
            <div className="text-center space-y-3 py-2">
              <CheckCircle2 className="w-10 h-10 text-green-400 mx-auto" aria-hidden="true" />
              <h2 className="text-white font-bold text-sm">Password updated</h2>
              <p className="text-slate-400 text-xs">All other sessions have been signed out.</p>
              <Link href="/login"
                className="inline-flex items-center gap-1.5 text-xxs text-amber hover:text-amber-light transition-colors">
                <ArrowLeft className="w-3 h-3" aria-hidden="true" /> Back to Sign In
              </Link>
            </div>
          )}
        </div>

        {pageState === 'request' && (
          <div className="text-center mt-4">
            <Link href="/login" className="text-xxs text-slate-500 hover:text-slate-300 transition-colors flex items-center justify-center gap-1">
              <ArrowLeft className="w-3 h-3" aria-hidden="true" /> Back to Sign In
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
