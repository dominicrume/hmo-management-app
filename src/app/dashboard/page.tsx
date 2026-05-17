'use client';

export const dynamic = 'force-dynamic';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Search, Bell, Link, ChevronRight, Loader2, AlertTriangle, X, Menu, Users } from 'lucide-react';

import { Sidebar }      from '@/components/sidebar';
import LetterheadSwitcher, { type Brand } from '@/components/layout/LetterheadSwitcher';
import FormsPanel,      { type FormId }   from '@/components/layout/FormsPanel';
import FormWorkspace    from '@/components/layout/FormWorkspace';

import DashboardView    from '@/components/views/DashboardView';
import SessionsView     from '@/components/views/SessionsView';
import LedgerView       from '@/components/views/LedgerView';
import RiskView         from '@/components/views/RiskView';
import AuditView        from '@/components/views/AuditView';
import PrintView        from '@/components/views/PrintView';

import { createClient as createBrowserClient } from '@/lib/supabase/client';
import type { DbTenant, DbUser } from '@/types/database';

// ── Views that use the full-width layout (no forms panel) ─────────────────────
const FULL_WIDTH_VIEWS = new Set(['dashboard', 'tenants', 'sessions', 'ledger', 'risk', 'audit', 'print', 'ai-brain', 'settings']);

export default function DashboardPage() {
  const router = useRouter();

  const [activeBrand,    setActiveBrand]    = useState<Brand>('mattys_place');
  const [activeNav,      setActiveNav]      = useState('personal');
  const [navMenuOpen,    setNavMenuOpen]    = useState(false);
  const [activeTenant,   setActiveTenant]   = useState<DbTenant | null>(null);
  const [activeForm,     setActiveForm]     = useState<FormId>('personal');
  const [tenantSearch,   setTenantSearch]   = useState('');
  const [tenants,        setTenants]        = useState<DbTenant[]>([]);
  const [currentUser,    setCurrentUser]    = useState<DbUser | null>(null);
  const [loadingTenants, setLoadingTenants] = useState(true);
  const [error,          setError]          = useState('');
  const [unpaidCount,    setUnpaidCount]    = useState(0);
  const [unpaidTotal,    setUnpaidTotal]    = useState(0);
  const [notifOpen,      setNotifOpen]      = useState(false);
  const [unpaidItems,    setUnpaidItems]    = useState<{ id: string; amount_due: number; amount_paid: number; tenant_id: string }[]>([]);
  const [sidebarOpen,    setSidebarOpen]    = useState(false);
  const [tenantPanelOpen, setTenantPanelOpen] = useState(false);

  const supabase = createBrowserClient();

  // ── Load current user + tenants ───────────────────────────────────────────

  const loadData = useCallback(async () => {
    setLoadingTenants(true);
    setError('');

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push('/login'); return; }

      const { data: dbUser, error: userErr } = await supabase
        .from('users')
        .select('*')
        .eq('auth_id', user.id)
        .single();

      if (userErr) {
        if (userErr.code === 'PGRST116' || userErr.message?.includes('permission denied')) {
          // No users row yet — auto-create Manager profile via service-role API
          const setup = await fetch('/api/setup', { method: 'POST' });
          if (setup.ok) {
            // Retry loading after setup
            loadData();
            return;
          }
          throw new Error('First-time setup failed. Please click "Setup Account" below.');
        }
        throw new Error(userErr.message ?? 'Failed to load user profile');
      }
      setCurrentUser(dbUser as DbUser);

      const { data: tenantRows, error: tenantErr } = await supabase
        .from('tenants')
        .select('*')
        .order('full_name');
      if (tenantErr) throw new Error(tenantErr.message ?? 'Failed to load tenants');

      const rows = (tenantRows ?? []) as DbTenant[];
      setTenants(rows);

      // Sync selected tenant after refresh
      setActiveTenant((prev) => {
        if (!prev && rows.length > 0) return rows[0];
        if (prev) return rows.find((r) => r.id === prev.id) ?? prev;
        return prev;
      });

      const { data: charges } = await supabase
        .from('service_charges')
        .select('id, amount_due, amount_paid, tenant_id')
        .eq('is_paid', false);

      if (charges) {
        setUnpaidCount(charges.length);
        setUnpaidTotal(charges.reduce((s: number, c: { amount_due: number; amount_paid: number }) => s + (c.amount_due - c.amount_paid), 0));
        setUnpaidItems(charges);
      }
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to load data.');
    } finally {
      setLoadingTenants(false);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { loadData(); }, [loadData]);

  // Real-time tenant updates
  useEffect(() => {
    const channel = supabase
      .channel('tenants-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tenants' }, () => loadData())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [supabase, loadData]);

  // ── Navigation handler ─────────────────────────────────────────────────────

  const handleNavigate = useCallback((id: string) => {
    if (id === 'intake') {
      router.push('/intake/new');
      return;
    }
    setActiveNav(id);
    if (id === 'ai-brain') setActiveForm('ai-brain');
    // Clicking any non-form nav resets active form to personal for next form visit
    if (!FULL_WIDTH_VIEWS.has(id)) setActiveForm(id as FormId);
  }, [router]);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push('/login');
  };

  // ── Filtered tenant list ───────────────────────────────────────────────────

  const filteredTenants = tenants.filter((t) =>
    t.full_name.toLowerCase().includes(tenantSearch.toLowerCase()) ||
    t.room_number.toLowerCase().includes(tenantSearch.toLowerCase())
  );

  const activeCount = tenants.filter((t) => t.status === 'active').length;
  const isFullWidth = FULL_WIDTH_VIEWS.has(activeNav);

  // ── Center view renderer ───────────────────────────────────────────────────

  const renderCenter = () => {
    switch (activeNav) {
      case 'dashboard':
        return (
          <DashboardView
            tenants={tenants}
            currentUser={currentUser}
            onNavigate={handleNavigate}
            onNewIntake={() => router.push('/intake/new')}
          />
        );
      case 'tenants':
        return (
          <DashboardView
            tenants={tenants}
            currentUser={currentUser}
            onNavigate={handleNavigate}
            onNewIntake={() => router.push('/intake/new')}
          />
        );
      case 'sessions':
        return (
          <SessionsView
            activeTenant={activeTenant}
            currentUser={currentUser}
            tenants={tenants}
          />
        );
      case 'ledger':
        return (
          <LedgerView
            activeTenant={activeTenant}
            currentUser={currentUser}
            tenants={tenants}
            onRefresh={loadData}
          />
        );
      case 'risk':
        return <RiskView activeTenant={activeTenant} tenants={tenants} />;
      case 'audit':
        return <AuditView activeTenant={activeTenant} />;
      case 'print':
        return <PrintView tenants={tenants} activeTenant={activeTenant} />;
      case 'settings':
        return (
          <main className="flex-1 overflow-y-auto p-8">
            <div className="max-w-2xl mx-auto">
              <h2 className="text-lg font-black text-navy mb-1">Settings</h2>
              <p className="text-xs text-slate-400 mb-8">Account and system configuration for Matty&apos;s Place.</p>
              <div className="bg-white rounded-xl border border-slate-200 divide-y divide-slate-100">
                <div className="px-6 py-4 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold text-navy">Signed in as</p>
                    <p className="text-xs text-slate-400 mt-0.5">{currentUser?.full_name ?? '—'} · {currentUser?.email ?? ''}</p>
                  </div>
                  <span className="text-xxs font-black uppercase px-2 py-1 bg-amber/20 text-amber-dark rounded-lg">
                    {currentUser?.role ?? 'Manager'}
                  </span>
                </div>
                <div className="px-6 py-4 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold text-navy">Organisation</p>
                    <p className="text-xs text-slate-400 mt-0.5">Matty&apos;s Place — Birmingham HMO</p>
                  </div>
                </div>
                <div className="px-6 py-4">
                  <button
                    type="button"
                    onClick={handleSignOut}
                    className="text-xs font-bold text-red-500 hover:text-red-700 transition-colors"
                  >
                    Sign out
                  </button>
                </div>
              </div>
            </div>
          </main>
        );
      default:
        // 'ai-brain' and any form nav — show the form workspace + forms panel
        return (
          <>
            <FormWorkspace
              brand={activeBrand}
              activeForm={activeForm}
              activeTenant={activeTenant?.full_name ?? 'No tenant selected'}
              activeTenantObj={activeTenant}
              workerId={currentUser?.id}
              onSaved={loadData}
            />
            <div className="no-print">
              <FormsPanel
                activeForm={activeForm}
                onSelectForm={(id) => {
                  setActiveForm(id);
                  setActiveNav(id === 'ai-brain' ? 'ai-brain' : activeNav);
                }}
                tenant={activeTenant}
              />
            </div>
          </>
        );
    }
  };

  return (
    <div className="flex h-screen overflow-hidden bg-cream font-sans">

      {/* ── Mobile sidebar overlay ── */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* ── Sidebar — collapsible on mobile ── */}
      <div className={`
        fixed inset-y-0 left-0 z-50 transition-transform duration-300 lg:relative lg:translate-x-0
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <Sidebar
          activeView={activeNav as import('@/components/sidebar').SidebarView}
          onNavigate={(id) => { handleNavigate(id); setSidebarOpen(false); }}
          userRole={currentUser?.role === 'SupportWorker' ? 'SupportWorker' : 'Manager'}
          onSignOut={handleSignOut}
          userName={currentUser?.full_name ?? ''}
          tenantCount={tenants.length}
          riskCount={tenants.filter((t) => t.status === 'missing').length}
        />
      </div>

      <div className="flex flex-col flex-1 overflow-hidden">

        {/* ── Dark system status bar — always visible ───────────────────── */}
        <div className="no-print bg-navy flex items-center justify-between px-5 py-1.5 flex-shrink-0">
          <span className="text-xxs font-mono font-semibold text-emerald-400 uppercase tracking-widest flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse inline-block" />
            System Status: Operational
          </span>
          <span className="text-xxs font-mono font-bold text-slate-500 uppercase tracking-widest">
            Official Use Only — Restricted Access
          </span>
          <span className="text-xxs font-mono font-semibold text-slate-500 uppercase tracking-widest">
            V2.4.0
          </span>
        </div>

        {/* ── Top header — V2.4.0 style ─────────────────────────────────── */}
        <header className="no-print h-12 bg-white border-b border-slate-200 flex items-center px-3 sm:px-4 gap-2 sm:gap-3 z-10 flex-shrink-0">

          {/* Mobile hamburger */}
          <button
            type="button"
            onClick={() => setSidebarOpen(true)}
            className="lg:hidden w-8 h-8 rounded-lg bg-slate-100 hover:bg-slate-200 flex items-center justify-center flex-shrink-0"
            aria-label="Open menu"
          >
            <Menu className="w-4 h-4 text-slate-600" />
          </button>

          {/* Mobile tenant panel toggle */}
          <button
            type="button"
            onClick={() => setTenantPanelOpen((v) => !v)}
            className="lg:hidden w-8 h-8 rounded-lg bg-slate-100 hover:bg-slate-200 flex items-center justify-center flex-shrink-0"
            aria-label="Toggle tenant list"
          >
            <Users className="w-4 h-4 text-slate-600" />
          </button>

          {/* Global search */}
          <div className="relative flex-1 min-w-0">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
            <input
              type="text"
              placeholder="Global search records, forms, or documents…"
              value={tenantSearch}
              onChange={(e) => setTenantSearch(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-lg pl-9 pr-4 py-1.5
                         text-xs placeholder-slate-400 focus:outline-none focus:ring-2
                         focus:ring-amber/50 focus:border-amber transition-all"
            />
          </div>

          {/* Entity switcher */}
          <LetterheadSwitcher value={activeBrand} onChange={setActiveBrand} />

          {/* New intake */}
          <button
            type="button"
            onClick={() => router.push('/intake/new')}
            className="w-8 h-8 rounded-lg bg-navy text-white flex items-center justify-center
                       font-black text-lg hover:bg-navy/80 transition-colors flex-shrink-0"
            title="New tenant intake"
          >
            +
          </button>

          {/* Notifications bell */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setNotifOpen((v) => !v)}
              aria-label="Notifications"
              className="relative w-8 h-8 rounded-lg bg-slate-100 hover:bg-slate-200
                         flex items-center justify-center transition-colors"
            >
              <Bell className="w-4 h-4 text-slate-500" />
              {unpaidCount > 0 && (
                <span className="absolute top-0.5 right-0.5 w-2 h-2 rounded-full bg-amber border-2 border-white" />
              )}
            </button>
            {notifOpen && (
              <div className="absolute right-0 top-10 w-72 bg-white border border-slate-200 rounded-xl shadow-xl z-50 overflow-hidden">
                <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
                  <span className="text-xs font-bold text-navy flex items-center gap-2">
                    <Bell className="w-3.5 h-3.5" /> Notifications
                  </span>
                  <button type="button" onClick={() => setNotifOpen(false)} className="text-slate-400 hover:text-navy">
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
                {unpaidCount === 0 ? (
                  <p className="px-4 py-6 text-xs text-slate-400 text-center">All caught up!</p>
                ) : (
                  <>
                    <div className="px-4 py-3 bg-amber/10 border-b border-amber/20">
                      <p className="text-xs font-bold text-amber-dark">
                        {unpaidCount} unpaid service charge{unpaidCount !== 1 ? 's' : ''}
                      </p>
                      <p className="text-xxs text-slate-500 mt-0.5">Total outstanding: £{unpaidTotal.toFixed(2)}</p>
                    </div>
                    <div className="max-h-48 overflow-y-auto divide-y divide-slate-50">
                      {unpaidItems.slice(0, 10).map((c) => {
                        const t = tenants.find((ten) => ten.id === c.tenant_id);
                        return (
                          <div key={c.id} className="px-4 py-2.5 flex items-center justify-between">
                            <div>
                              <p className="text-xs font-semibold text-navy">{t?.full_name ?? 'Unknown'}</p>
                              <p className="text-xxs text-slate-400">{t?.room_number ?? ''}</p>
                            </div>
                            <span className="text-xs font-black text-red-500 font-mono">
                              £{(c.amount_due - c.amount_paid).toFixed(2)}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                    <div className="px-4 py-3 border-t border-slate-100">
                      <button type="button" onClick={() => { setNotifOpen(false); handleNavigate('ledger'); }}
                        className="w-full text-xs text-amber font-bold hover:text-amber-dark text-center">
                        View full ledger →
                      </button>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        </header>

        {/* ── Three-panel body ──────────────────────────────────────────────── */}
        <div className="flex flex-1 overflow-hidden">

          {/* ── Tenant list — always visible ─────────────────────────────────── */}
          <aside className={`
            no-print bg-white border-r border-slate-200 flex flex-col overflow-hidden
            fixed inset-y-0 left-0 z-30 w-72 transition-transform duration-300
            lg:relative lg:translate-x-0 lg:w-60 lg:min-w-[240px]
            ${tenantPanelOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
          `}>
            <div className="px-4 py-3 border-b border-slate-100">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-xs font-bold text-navy">Tenants</h2>
                <div className="flex items-center gap-2">
                  <span className="text-xxs bg-amber/20 text-amber-dark font-black px-2 py-0.5 rounded-full">
                    {activeCount} Active
                  </span>
                  <button
                    type="button"
                    onClick={() => router.push('/intake/new')}
                    title="Add new tenant"
                    className="w-5 h-5 rounded-full bg-amber/20 hover:bg-amber text-amber-dark hover:text-navy flex items-center justify-center transition-colors font-black text-sm"
                  >
                    +
                  </button>
                </div>
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

            {error && (
              <div className="m-3 flex flex-col gap-2 px-3 py-2 bg-red-50 border border-red-200 rounded-lg">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="w-3.5 h-3.5 text-red-500 flex-shrink-0 mt-0.5" />
                  <p className="text-xxs text-red-600">{error}</p>
                </div>
                <div className="flex gap-2 flex-wrap">
                  <button
                    type="button"
                    onClick={async () => {
                      await fetch('/api/setup', { method: 'POST' });
                      loadData();
                    }}
                    className="text-xxs font-bold text-amber-dark underline"
                  >
                    Setup Account
                  </button>
                  <button type="button" onClick={loadData} className="text-xxs font-bold text-red-600 underline">
                    Retry
                  </button>
                  <button type="button" onClick={handleSignOut} className="text-xxs font-bold text-red-600 underline">
                    Sign out
                  </button>
                </div>
              </div>
            )}

            {loadingTenants ? (
              <div className="flex-1 flex items-center justify-center">
                <Loader2 className="w-5 h-5 text-slate-300 animate-spin" />
              </div>
            ) : (
              <ul className="flex-1 overflow-y-auto divide-y divide-slate-50">
                {filteredTenants.length === 0 ? (
                  <li className="px-4 py-6 text-center text-xs text-slate-400">
                    {tenantSearch ? 'No matches.' : (
                      <span>
                        No tenants yet.{' '}
                        <button type="button" onClick={() => router.push('/intake/new')} className="text-amber font-semibold">
                          Start intake →
                        </button>
                      </span>
                    )}
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
                        onClick={() => {
                          setActiveTenant(tenant);
                          // Only navigate to forms view if selecting a tenant from the global dashboard view.
                          // Otherwise, stay in the current view (e.g. Ledger) to see that tenant's specific data.
                          if (activeNav === 'dashboard' || activeNav === 'tenants') {
                            setActiveNav(activeForm);
                          }
                        }}
                        className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-all
                          ${isActive
                            ? 'bg-amber/10 border-l-2 border-amber'
                            : 'hover:bg-slate-50 border-l-2 border-transparent'
                          }`}
                      >
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center
                          text-xxs font-black flex-shrink-0 relative
                          ${isActive ? 'bg-navy text-amber' : 'bg-slate-200 text-slate-500'}`}>
                          {initials}
                          {tenant.status === 'missing' && (
                            <span className="absolute -top-0.5 -right-0.5 w-3 h-3 rounded-full bg-red-500 border-2 border-white" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className={`text-xs font-bold truncate ${isActive ? 'text-navy' : 'text-slate-700'}`}>
                            {tenant.full_name}
                          </p>
                          <p className="text-xxs text-slate-400 truncate">
                            {tenant.room_number} ·{' '}
                            <span className={
                              tenant.status === 'active'   ? 'text-emerald-600' :
                              tenant.status === 'missing'  ? 'text-red-500 font-bold' :
                              tenant.status === 'inactive' ? 'text-amber-dark' : 'text-slate-400'
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
                <button
                  type="button"
                  onClick={() => handleNavigate('ledger')}
                  className="w-full"
                >
                  <p className="text-sm font-black text-amber-dark">
                    £{unpaidTotal.toFixed(0)}
                  </p>
                  <p className="text-xxs text-slate-400 uppercase font-semibold">Owed</p>
                </button>
              </div>
            </div>
          </aside>

          {/* Mobile tenant panel overlay */}
          {tenantPanelOpen && (
            <div
              className="fixed inset-0 bg-black/30 z-20 lg:hidden"
              onClick={() => setTenantPanelOpen(false)}
            />
          )}

          {/* ── Main content area — switches by activeNav ──────────────────── */}
          {renderCenter()}

        </div>
      </div>
    </div>
  );
}
