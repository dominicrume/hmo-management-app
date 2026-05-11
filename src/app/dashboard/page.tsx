'use client';

export const dynamic = 'force-dynamic';

import { useState, useEffect, useCallback } from 'react';
import { Search, Bell, Link, ChevronRight, Loader2, AlertTriangle } from 'lucide-react';

import Sidebar from '@/components/layout/Sidebar';
import LetterheadSwitcher, { type Brand } from '@/components/layout/LetterheadSwitcher';
import FormsPanel, { type FormId } from '@/components/layout/FormsPanel';
import FormWorkspace from '@/components/layout/FormWorkspace';
import { createClient as createBrowserClient } from '@/lib/supabase/client';
import type { DbTenant, DbUser } from '@/types/database';

// ── Dashboard page ────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const [activeBrand,    setActiveBrand]    = useState<Brand>('mattys_place');
  const [activeNav,      setActiveNav]      = useState('dashboard');
  const [activeTenant,   setActiveTenant]   = useState<DbTenant | null>(null);
  const [activeForm,     setActiveForm]     = useState<FormId>('personal');
  const [tenantSearch,   setTenantSearch]   = useState('');
  const [tenants,        setTenants]        = useState<DbTenant[]>([]);
  const [currentUser,    setCurrentUser]    = useState<DbUser | null>(null);
  const [loadingTenants, setLoadingTenants] = useState(true);
  const [error,          setError]          = useState('');
  const [unpaidCount,    setUnpaidCount]    = useState(0);
  const [unpaidTotal,    setUnpaidTotal]    = useState(0);

  const supabase = createBrowserClient();

  // ── Load current user and tenants ─────────────────────────────────────────

  const loadData = useCallback(async () => {
    setLoadingTenants(true);
    setError('');

    try {
      // Get auth user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { window.location.href = '/login'; return; }

      // Get DB profile
      const { data: dbUser, error: userErr } = await supabase
        .from('users')
        .select('*')
        .eq('auth_id', user.id)
        .single();
      if (userErr) {
        if (userErr.code === 'PGRST116') {
          throw new Error(`Staff profile not found for ${user.email}. Run the setup SQL in Supabase to create your Manager account.`);
        }
        throw userErr;
      }
      setCurrentUser(dbUser as DbUser);

      // Get tenants (RLS auto-scopes by role)
      const { data: tenantRows, error: tenantErr } = await supabase
        .from('tenants')
        .select('*')
        .order('full_name');
      if (tenantErr) throw tenantErr;
      const rows = (tenantRows ?? []) as DbTenant[];
      setTenants(rows);
      if (rows.length > 0 && !activeTenant) setActiveTenant(rows[0]);

      // Get unpaid charges summary
      const { data: charges } = await supabase
        .from('service_charges')
        .select('amount_due, amount_paid')
        .eq('is_paid', false);
      if (charges) {
        setUnpaidCount(charges.length);
        setUnpaidTotal(
          charges.reduce((sum, c) => sum + (c.amount_due - c.amount_paid), 0)
        );
      }
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to load data.');
    } finally {
      setLoadingTenants(false);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { loadData(); }, [loadData]);

  // ── Real-time subscription — tenants table ─────────────────────────────────

  useEffect(() => {
    const channel = supabase
      .channel('tenants-realtime')
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'tenants' },
        () => { loadData(); }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [supabase, loadData]);

  // ── Filtered tenant list ───────────────────────────────────────────────────

  const filteredTenants = tenants.filter((t) =>
    t.full_name.toLowerCase().includes(tenantSearch.toLowerCase()) ||
    t.room_number.toLowerCase().includes(tenantSearch.toLowerCase())
  );

  const activeCount = tenants.filter((t) => t.status === 'active').length;

  // ── Sign out ───────────────────────────────────────────────────────────────

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    window.location.href = '/login';
  };

  return (
    <div className="flex h-screen overflow-hidden bg-cream font-sans">

      {/* ── Sidebar ─────────────────────────────────────────────────────────── */}
      <Sidebar
        activeItem={activeNav}
        onNavigate={(id) => {
          setActiveNav(id);
          if (id === 'ai-brain') setActiveForm('ai-brain');
        }}
        role={currentUser?.role === 'SupportWorker' ? 'SupportWorker' : 'Manager'}
        onSignOut={handleSignOut}
        userName={currentUser?.full_name ?? ''}
        userRole={currentUser?.role ?? 'Manager'}
      />

      <div className="flex flex-col flex-1 overflow-hidden">

        {/* ── Top header ──────────────────────────────────────────────────── */}
        <header className="h-14 bg-white border-b border-slate-200 flex items-center px-5 gap-4 z-10 flex-shrink-0">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
            <input
              type="text"
              placeholder="Search tenants, rooms…"
              value={tenantSearch}
              onChange={(e) => setTenantSearch(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-lg pl-9 pr-4 py-2
                         text-xs placeholder-slate-400 focus:outline-none focus:ring-2
                         focus:ring-amber/50 focus:border-amber transition-all"
            />
          </div>
          <div className="flex-1" />

          <div className="hidden lg:flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-50 border border-emerald-100">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-xxs font-semibold text-emerald-700 uppercase tracking-wider">Live</span>
          </div>

          <LetterheadSwitcher value={activeBrand} onChange={setActiveBrand} />

          <button
            type="button"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-navy/5
                       hover:bg-navy/10 border border-navy/10 transition-colors"
            title="Blockchain audit trail"
          >
            <Link className="w-3.5 h-3.5 text-navy" />
            <span className="text-xxs font-mono font-semibold text-navy">Audit</span>
          </button>

          <button
            type="button"
            title={unpaidCount > 0 ? `${unpaidCount} unpaid charge(s)` : 'Notifications'}
            aria-label={unpaidCount > 0 ? `${unpaidCount} unpaid charge(s)` : 'Notifications'}
            className="relative w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200
                       flex items-center justify-center transition-colors"
          >
            <Bell className="w-4 h-4 text-slate-500" />
            {unpaidCount > 0 && (
              <span className="absolute top-0.5 right-0.5 w-2 h-2 rounded-full bg-amber border-2 border-white" />
            )}
          </button>
        </header>

        {/* ── Three-panel body ──────────────────────────────────────────────── */}
        <div className="flex flex-1 overflow-hidden">

          {/* ── Tenant list ─────────────────────────────────────────────────── */}
          <aside className="w-60 min-w-[240px] bg-white border-r border-slate-200 flex flex-col overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-100">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-xs font-bold text-navy">Tenants</h2>
                <span className="text-xxs bg-amber/20 text-amber-dark font-black px-2 py-0.5 rounded-full">
                  {activeCount} Active
                </span>
              </div>
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-400" />
                <input
                  type="text"
                  value={tenantSearch}
                  onChange={(e) => setTenantSearch(e.target.value)}
                  placeholder="Search…"
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg py-1.5 pl-8 pr-3
                             text-xs placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-amber/50"
                />
              </div>
            </div>

            {/* Error state */}
            {error && (
              <div className="m-3 flex items-start gap-2 px-3 py-2 bg-red-50 border border-red-200 rounded-lg">
                <AlertTriangle className="w-3.5 h-3.5 text-red-500 flex-shrink-0 mt-0.5" />
                <p className="text-xxs text-red-600">{error}</p>
              </div>
            )}

            {/* Loading state */}
            {loadingTenants ? (
              <div className="flex-1 flex items-center justify-center">
                <Loader2 className="w-5 h-5 text-slate-300 animate-spin" />
              </div>
            ) : (
              <ul className="flex-1 overflow-y-auto divide-y divide-slate-50">
                {filteredTenants.length === 0 ? (
                  <li className="px-4 py-6 text-center text-xs text-slate-400">
                    {tenantSearch ? 'No matches.' : 'No tenants yet.'}
                  </li>
                ) : filteredTenants.map((tenant) => {
                  const isActive = tenant.id === activeTenant?.id;
                  const initials = tenant.full_name
                    .split(' ').slice(0, 2).map((n) => n[0]).join('').toUpperCase();

                  return (
                    <li key={tenant.id}>
                      <button
                        type="button"
                        aria-label={`Select tenant ${tenant.full_name}`}
                        onClick={() => setActiveTenant(tenant)}
                        className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-all
                          ${isActive
                            ? 'bg-amber/10 border-l-2 border-amber'
                            : 'hover:bg-slate-50 border-l-2 border-transparent'
                          }`}
                      >
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center
                          text-xxs font-black flex-shrink-0
                          ${isActive ? 'bg-navy text-amber' : 'bg-slate-200 text-slate-500'}`}>
                          {initials}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className={`text-xs font-bold truncate ${isActive ? 'text-navy' : 'text-slate-700'}`}>
                            {tenant.full_name}
                          </p>
                          <p className="text-xxs text-slate-400 truncate">
                            {tenant.room_number} ·{' '}
                            <span className={
                              tenant.status === 'active'   ? 'text-emerald-600' :
                              tenant.status === 'inactive' ? 'text-amber-dark'  : 'text-slate-400'
                            }>
                              {tenant.status}
                            </span>
                          </p>
                        </div>
                        {isActive && <ChevronRight className="w-3.5 h-3.5 text-amber flex-shrink-0" />}
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}

            {/* Stats footer */}
            <div className="border-t border-slate-100 px-4 py-3 grid grid-cols-2 gap-2">
              <div className="bg-slate-50 rounded-lg px-2 py-2 text-center">
                <p className="text-sm font-black text-navy">{tenants.length}</p>
                <p className="text-xxs text-slate-400 uppercase font-semibold">Total</p>
              </div>
              <div className="bg-amber/10 rounded-lg px-2 py-2 text-center">
                <p className="text-sm font-black text-amber-dark">
                  £{unpaidTotal.toFixed(0)}
                </p>
                <p className="text-xxs text-slate-400 uppercase font-semibold">Owed</p>
              </div>
            </div>
          </aside>

          {/* ── Form workspace ──────────────────────────────────────────────── */}
          <FormWorkspace
            brand={activeBrand}
            activeForm={activeForm}
            activeTenant={activeTenant?.full_name ?? 'No tenant selected'}
            activeTenantObj={activeTenant}
            workerId={currentUser?.id}
            onSaved={loadData}
          />

          {/* ── Forms panel ─────────────────────────────────────────────────── */}
          <FormsPanel
            activeForm={activeForm}
            onSelectForm={setActiveForm}
            tenant={activeTenant}
          />
        </div>
      </div>
    </div>
  );
}
