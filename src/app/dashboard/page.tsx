'use client';

import { useState } from 'react';
import {
  Search,
  Bell,
  Link,
  ChevronRight,
} from 'lucide-react';

import Sidebar from '@/components/layout/Sidebar';
import LetterheadSwitcher, { type Brand } from '@/components/layout/LetterheadSwitcher';
import FormsPanel, { type FormId } from '@/components/layout/FormsPanel';
import FormWorkspace from '@/components/layout/FormWorkspace';

// ── Tenant list data (static — will be replaced by Supabase query) ──────────

const TENANTS = [
  { id: '1', name: 'John Stevenson',  unit: 'Room 4B',  status: 'Active',   initials: 'JS' },
  { id: '2', name: 'Alice Murphy',    unit: 'Room 12A', status: 'Pending',  initials: 'AM' },
  { id: '3', name: 'Robert Brown',    unit: 'Room 2C',  status: 'Active',   initials: 'RB' },
  { id: '4', name: 'Sarah Jenkins',   unit: 'Room 5F',  status: 'Moved On', initials: 'SJ' },
  { id: '5', name: 'David Okafor',    unit: 'Room 7A',  status: 'Active',   initials: 'DO' },
  { id: '6', name: 'Fatima Hussain',  unit: 'Room 9B',  status: 'Active',   initials: 'FH' },
];

const STATUS_COLOURS: Record<string, string> = {
  Active:   'bg-emerald-100 text-emerald-700',
  Pending:  'bg-amber/20 text-amber-dark',
  'Moved On': 'bg-slate-100 text-slate-500',
};

// ── Dashboard page ────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const [activeBrand, setActiveBrand]   = useState<Brand>('mattys_place');
  const [activeNav, setActiveNav]       = useState('dashboard');
  const [activeTenant, setActiveTenant] = useState(TENANTS[0]);
  const [activeForm, setActiveForm]     = useState<FormId>('personal');
  const [tenantSearch, setTenantSearch] = useState('');

  const filteredTenants = TENANTS.filter((t) =>
    t.name.toLowerCase().includes(tenantSearch.toLowerCase())
  );

  return (
    <div className="flex h-screen overflow-hidden bg-cream font-sans">

      {/* ── 1. Sidebar (240px navy) ───────────────────────────────────────── */}
      <Sidebar
        activeItem={activeNav}
        onNavigate={setActiveNav}
        role="Manager"
      />

      {/* ── Centre + right wrapper ────────────────────────────────────────── */}
      <div className="flex flex-col flex-1 overflow-hidden">

        {/* ── Top header bar ─────────────────────────────────────────────── */}
        <header className="h-14 bg-white border-b border-slate-200 flex items-center px-5 gap-4 z-10 flex-shrink-0">
          {/* Search */}
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
            <input
              type="text"
              placeholder="Search tenants, forms, records…"
              className="w-full bg-slate-50 border border-slate-200 rounded-lg pl-9 pr-4 py-2
                         text-xs placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-amber/50
                         focus:border-amber transition-all"
            />
          </div>

          <div className="flex-1" />

          {/* System status */}
          <div className="hidden lg:flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-50 border border-emerald-100">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-xxs font-semibold text-emerald-700 uppercase tracking-wider">
              System Operational
            </span>
          </div>

          {/* Letterhead switcher */}
          <LetterheadSwitcher value={activeBrand} onChange={setActiveBrand} />

          {/* Blockchain audit indicator */}
          <button
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-navy/5 hover:bg-navy/10
                       border border-navy/10 transition-colors"
            title="View blockchain audit trail"
          >
            <Link className="w-3.5 h-3.5 text-navy" />
            <span className="text-xxs font-mono font-semibold text-navy">Audit</span>
          </button>

          {/* Notifications */}
          <button className="relative w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200
                              flex items-center justify-center transition-colors">
            <Bell className="w-4 h-4 text-slate-500" />
            <span className="absolute top-0.5 right-0.5 w-2 h-2 rounded-full bg-amber border-2 border-white" />
          </button>
        </header>

        {/* ── Three-panel body ────────────────────────────────────────────── */}
        <div className="flex flex-1 overflow-hidden">

          {/* ── 2. Tenant sidebar (within main area) ──────────────────────── */}
          <aside
            className="w-60 min-w-[240px] bg-white border-r border-slate-200 flex flex-col overflow-hidden"
            aria-label="Tenant list"
          >
            {/* Tenant list header */}
            <div className="px-4 py-3 border-b border-slate-100">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-xs font-bold text-navy">Tenants</h2>
                <span className="text-xxs bg-amber/20 text-amber-dark font-black px-2 py-0.5 rounded-full uppercase">
                  {TENANTS.filter(t => t.status === 'Active').length} Active
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

            {/* Tenant list */}
            <ul className="flex-1 overflow-y-auto divide-y divide-slate-50">
              {filteredTenants.map((tenant) => {
                const isActive = tenant.id === activeTenant.id;
                return (
                  <li key={tenant.id}>
                    <button
                      onClick={() => setActiveTenant(tenant)}
                      className={`
                        w-full flex items-center gap-3 px-4 py-3 text-left transition-all
                        ${isActive
                          ? 'bg-amber/10 border-l-2 border-amber'
                          : 'hover:bg-slate-50 border-l-2 border-transparent'
                        }
                      `}
                    >
                      {/* Avatar */}
                      <div
                        className={`
                          w-8 h-8 rounded-full flex items-center justify-center text-xxs font-black flex-shrink-0
                          ${isActive ? 'bg-navy text-amber' : 'bg-slate-200 text-slate-500'}
                        `}
                      >
                        {tenant.initials}
                      </div>

                      <div className="flex-1 min-w-0">
                        <p className={`text-xs font-bold truncate ${isActive ? 'text-navy' : 'text-slate-700'}`}>
                          {tenant.name}
                        </p>
                        <p className="text-xxs text-slate-400 truncate">
                          {tenant.unit}
                          {' · '}
                          <span className={`font-semibold ${
                            tenant.status === 'Active' ? 'text-emerald-600' :
                            tenant.status === 'Pending' ? 'text-amber-dark' :
                            'text-slate-400'
                          }`}>
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

            {/* Stat footer */}
            <div className="border-t border-slate-100 px-4 py-3 grid grid-cols-2 gap-2">
              <div className="bg-slate-50 rounded-lg px-2 py-2 text-center">
                <p className="text-sm font-black text-navy">24</p>
                <p className="text-xxs text-slate-400 uppercase font-semibold">Total</p>
              </div>
              <div className="bg-amber/10 rounded-lg px-2 py-2 text-center">
                <p className="text-sm font-black text-amber-dark">£450</p>
                <p className="text-xxs text-slate-400 uppercase font-semibold">Owed</p>
              </div>
            </div>
          </aside>

          {/* ── 3. Main form workspace (flex-1 cream) ─────────────────────── */}
          <FormWorkspace
            brand={activeBrand}
            activeForm={activeForm}
            activeTenant={activeTenant.name}
          />

          {/* ── 4. Forms panel (280px white) ──────────────────────────────── */}
          <FormsPanel
            activeForm={activeForm}
            onSelectForm={setActiveForm}
          />

        </div>
      </div>
    </div>
  );
}
