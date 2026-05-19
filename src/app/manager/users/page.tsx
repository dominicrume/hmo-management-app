'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Users, UserPlus, ShieldCheck, ShieldOff, Mail,
  ChevronDown, Loader2, CheckCircle2, AlertTriangle, X,
} from 'lucide-react';

interface StaffUser {
  id: string;
  auth_id: string;
  full_name: string;
  email: string;
  role: 'Manager' | 'SupportWorker' | 'Tenant';
  brand: string;
  is_active: boolean;
  phone?: string;
  created_at: string;
}

type InviteState = 'idle' | 'loading' | 'success' | 'error';

const ROLE_COLOUR: Record<string, string> = {
  Manager:       'bg-amber-500/20 text-amber-400',
  SupportWorker: 'bg-blue-500/20 text-blue-400',
  Tenant:        'bg-green-500/20 text-green-400',
};

export default function UsersAdminPage() {
  const [users,       setUsers]       = useState<StaffUser[]>([]);
  const [loading,     setLoading]     = useState(true);
  const [showInvite,  setShowInvite]  = useState(false);
  const [inviteState, setInviteState] = useState<InviteState>('idle');
  const [inviteError, setInviteError] = useState('');
  const [inviteSuccess, setInviteSuccess] = useState('');
  const [patchLoading, setPatchLoading] = useState<string | null>(null);

  // Invite form state
  const [form, setForm] = useState({
    email: '', full_name: '', role: 'SupportWorker' as StaffUser['role'], phone: '',
  });

  const loadUsers = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/users');
      if (res.ok) setUsers(await res.json());
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadUsers(); }, [loadUsers]);

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.email || !form.full_name) return;
    setInviteState('loading');
    setInviteError('');

    const res = await fetch('/api/admin/users/invite', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify(form),
    });

    const json = await res.json();
    if (!res.ok) {
      setInviteState('error');
      setInviteError(json.error ?? 'Invite failed.');
      return;
    }

    setInviteState('success');
    setInviteSuccess(`Invite sent to ${form.email}`);
    setForm({ email: '', full_name: '', role: 'SupportWorker', phone: '' });
    await loadUsers();
    setTimeout(() => { setInviteState('idle'); setShowInvite(false); setInviteSuccess(''); }, 3000);
  };

  const toggleActive = async (user: StaffUser) => {
    setPatchLoading(user.id);
    await fetch('/api/admin/users', {
      method:  'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ user_id: user.id, is_active: !user.is_active }),
    });
    await loadUsers();
    setPatchLoading(null);
  };

  const changeRole = async (user: StaffUser, role: StaffUser['role']) => {
    setPatchLoading(user.id);
    await fetch('/api/admin/users', {
      method:  'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ user_id: user.id, role }),
    });
    await loadUsers();
    setPatchLoading(null);
  };

  const active   = users.filter((u) => u.is_active);
  const inactive = users.filter((u) => !u.is_active);

  return (
    <div className="min-h-screen bg-navy p-6 max-w-5xl mx-auto">

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-500/20 flex items-center justify-center">
            <Users className="w-5 h-5 text-amber-400" aria-hidden="true" />
          </div>
          <div>
            <h1 className="text-white font-black text-lg">Staff Management</h1>
            <p className="text-slate-400 text-xs">{active.length} active · {inactive.length} inactive</p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => { setShowInvite((v) => !v); setInviteState('idle'); setInviteError(''); }}
          className="flex items-center gap-2 bg-amber text-navy text-xs font-black px-4 py-2.5 rounded-lg hover:bg-amber-light transition-colors"
          aria-label="Invite new staff member"
        >
          <UserPlus className="w-4 h-4" aria-hidden="true" /> Invite Staff
        </button>
      </div>

      {/* Invite form */}
      {showInvite && (
        <div className="bg-navy-light border border-navy-border rounded-2xl p-5 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-white font-bold text-sm flex items-center gap-2">
              <Mail className="w-4 h-4 text-amber" aria-hidden="true" /> Invite New Staff Member
            </h2>
            <button
              type="button"
              onClick={() => setShowInvite(false)}
              aria-label="Close invite form"
              className="text-slate-500 hover:text-slate-300 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {inviteState === 'success' && (
            <div className="flex items-center gap-2 px-3 py-2.5 bg-green-900/30 border border-green-700/40 rounded-lg mb-4">
              <CheckCircle2 className="w-4 h-4 text-green-400" aria-hidden="true" />
              <p className="text-xs text-green-300">{inviteSuccess}</p>
            </div>
          )}
          {inviteState === 'error' && inviteError && (
            <div className="flex items-center gap-2 px-3 py-2.5 bg-red-900/30 border border-red-700/40 rounded-lg mb-4">
              <AlertTriangle className="w-4 h-4 text-red-400" aria-hidden="true" />
              <p className="text-xs text-red-300">{inviteError}</p>
            </div>
          )}

          <form onSubmit={handleInvite} className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label htmlFor="invite-name" className="text-xxs font-black text-slate-400 uppercase tracking-wider">Full Name</label>
              <input
                id="invite-name"
                type="text"
                value={form.full_name}
                onChange={(e) => setForm((f) => ({ ...f, full_name: e.target.value }))}
                required
                placeholder="Jane Smith"
                className="w-full bg-navy border border-navy-border rounded-lg px-3 py-2 text-white text-sm placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-amber/50"
              />
            </div>
            <div className="space-y-1">
              <label htmlFor="invite-email" className="text-xxs font-black text-slate-400 uppercase tracking-wider">Email</label>
              <input
                id="invite-email"
                type="email"
                value={form.email}
                onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                required
                placeholder="jane@example.com"
                className="w-full bg-navy border border-navy-border rounded-lg px-3 py-2 text-white text-sm placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-amber/50"
              />
            </div>
            <div className="space-y-1">
              <label htmlFor="invite-role" className="text-xxs font-black text-slate-400 uppercase tracking-wider">Role</label>
              <div className="relative">
                <select
                  id="invite-role"
                  value={form.role}
                  onChange={(e) => setForm((f) => ({ ...f, role: e.target.value as StaffUser['role'] }))}
                  className="w-full bg-navy border border-navy-border rounded-lg px-3 py-2 text-white text-sm appearance-none focus:outline-none focus:ring-2 focus:ring-amber/50"
                >
                  <option value="SupportWorker">Support Worker</option>
                  <option value="Manager">Manager</option>
                  <option value="Tenant">Tenant</option>
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500 pointer-events-none" aria-hidden="true" />
              </div>
            </div>
            <div className="space-y-1">
              <label htmlFor="invite-phone" className="text-xxs font-black text-slate-400 uppercase tracking-wider">Phone (optional)</label>
              <input
                id="invite-phone"
                type="tel"
                value={form.phone}
                onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                placeholder="+44 7700 000000"
                className="w-full bg-navy border border-navy-border rounded-lg px-3 py-2 text-white text-sm placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-amber/50"
              />
            </div>
            <div className="col-span-2 flex justify-end pt-1">
              <button
                type="submit"
                disabled={inviteState === 'loading'}
                className="flex items-center gap-2 bg-amber text-navy font-black text-xs px-5 py-2.5 rounded-lg hover:bg-amber-light transition-colors disabled:opacity-50"
              >
                {inviteState === 'loading'
                  ? <><Loader2 className="w-3.5 h-3.5 animate-spin" aria-hidden="true" /> Sending…</>
                  : <><Mail className="w-3.5 h-3.5" aria-hidden="true" /> Send Invite</>
                }
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Users table */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-6 h-6 animate-spin text-amber" aria-label="Loading staff list" />
        </div>
      ) : (
        <div className="bg-navy-light border border-navy-border rounded-2xl overflow-hidden">
          <table className="w-full text-sm" aria-label="Staff members">
            <thead>
              <tr className="border-b border-navy-border">
                {['Name', 'Email', 'Role', 'Status', 'Joined', 'Actions'].map((h) => (
                  <th key={h} className="px-4 py-3 text-left text-xxs font-black text-slate-500 uppercase tracking-wider">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {users.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-10 text-center text-slate-500 text-sm">
                    No staff members yet. Invite someone above.
                  </td>
                </tr>
              )}
              {users.map((user) => (
                <tr key={user.id} className="border-b border-navy-border/50 hover:bg-white/2 transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-full bg-amber-500/20 flex items-center justify-center text-amber-400 text-xs font-bold shrink-0">
                        {user.full_name.charAt(0).toUpperCase()}
                      </div>
                      <span className="text-white font-medium text-xs">{user.full_name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-slate-400 text-xs">{user.email}</td>
                  <td className="px-4 py-3">
                    <div className="relative inline-block">
                      <select
                        value={user.role}
                        onChange={(e) => changeRole(user, e.target.value as StaffUser['role'])}
                        disabled={!!patchLoading}
                        aria-label={`Change role for ${user.full_name}`}
                        className={`text-xxs font-bold px-2.5 py-1 rounded-full appearance-none cursor-pointer border-0 focus:outline-none focus:ring-2 focus:ring-amber/50 ${ROLE_COLOUR[user.role]}`}
                      >
                        <option value="Manager">Manager</option>
                        <option value="SupportWorker">Support Worker</option>
                        <option value="Tenant">Tenant</option>
                      </select>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-xxs font-bold px-2.5 py-1 rounded-full ${
                      user.is_active
                        ? 'bg-green-500/10 text-green-400'
                        : 'bg-slate-700 text-slate-400'
                    }`}>
                      {user.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-500 text-xs">
                    {new Date(user.created_at).toLocaleDateString('en-GB')}
                  </td>
                  <td className="px-4 py-3">
                    {patchLoading === user.id ? (
                      <Loader2 className="w-4 h-4 animate-spin text-slate-400" aria-label="Updating…" />
                    ) : (
                      <button
                        type="button"
                        onClick={() => toggleActive(user)}
                        aria-label={user.is_active ? `Deactivate ${user.full_name}` : `Activate ${user.full_name}`}
                        className={`flex items-center gap-1.5 text-xxs font-bold px-3 py-1.5 rounded-lg transition-colors ${
                          user.is_active
                            ? 'text-red-400 hover:bg-red-500/10'
                            : 'text-green-400 hover:bg-green-500/10'
                        }`}
                      >
                        {user.is_active
                          ? <><ShieldOff className="w-3.5 h-3.5" aria-hidden="true" /> Deactivate</>
                          : <><ShieldCheck className="w-3.5 h-3.5" aria-hidden="true" /> Activate</>
                        }
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <p className="text-center text-xxs text-slate-600 mt-8">
        Ash Shahada Housing Association Ltd · Manager Portal
      </p>
    </div>
  );
}
