'use client';

export const dynamic = 'force-dynamic';

import { useState } from 'react';
import { createClient as createBrowserClient } from '@/lib/supabase/client';
import { Mail, ArrowLeft, CheckCircle2 } from 'lucide-react';

export default function ResetPasswordPage() {
  const [email,   setEmail]   = useState('');
  const [sent,    setSent]    = useState(false);
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState('');

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const supabase = createBrowserClient();
    const { error: authError } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/callback?next=/dashboard`,
    });

    if (authError) { setError(authError.message); setLoading(false); return; }
    setSent(true);
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-navy flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="bg-navy-light border border-navy-border rounded-2xl p-6 shadow-2xl">
          {sent ? (
            <div className="text-center py-4">
              <CheckCircle2 className="w-10 h-10 text-emerald-400 mx-auto mb-3" />
              <h2 className="text-white font-bold text-sm">Check your email</h2>
              <p className="text-slate-400 text-xs mt-2">
                A password reset link has been sent to <span className="text-white">{email}</span>.
              </p>
              <a href="/login" className="inline-flex items-center gap-1.5 mt-4 text-amber text-xs font-semibold">
                <ArrowLeft className="w-3.5 h-3.5" />
                Back to sign in
              </a>
            </div>
          ) : (
            <form onSubmit={handleReset} className="space-y-4">
              <div>
                <h2 className="text-white font-bold text-sm">Reset Password</h2>
                <p className="text-slate-400 text-xs mt-1">
                  Enter your email and we&apos;ll send a reset link.
                </p>
              </div>

              {error && (
                <p className="text-xs text-red-400 bg-red-900/20 border border-red-700/30 rounded-lg px-3 py-2">
                  {error}
                </p>
              )}

              <div className="space-y-1.5">
                <label className="text-xxs font-black text-slate-400 uppercase tracking-wider">Email</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    placeholder="you@example.com"
                    className="w-full bg-navy border border-navy-border rounded-lg pl-9 pr-4 py-2.5
                               text-white text-sm placeholder-slate-600 focus:outline-none
                               focus:ring-2 focus:ring-amber/50 transition-all"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-amber text-navy font-black text-sm py-2.5 rounded-lg
                           hover:bg-amber-light transition-colors disabled:opacity-50"
              >
                {loading ? 'Sending…' : 'Send Reset Link'}
              </button>

              <a href="/login" className="flex items-center justify-center gap-1.5 text-xs text-slate-400 hover:text-white transition-colors">
                <ArrowLeft className="w-3.5 h-3.5" />
                Back to sign in
              </a>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
