'use client';

import { useEffect, useState } from 'react';
import {
  Users, TrendingUp, AlertTriangle, Receipt,
  CalendarDays, Link, ArrowRight, Plus,
} from 'lucide-react';
import type { DbTenant, DbUser } from '@/types/database';

interface AuditRow {
  id: string;
  actor_name: string;
  actor_role: string;
  action: string;
  table_name: string;
  stamped_at: string;
  payload_hash: string;
  tenant_id: string | null;
}

interface Stats {
  totalTenants:    number;
  activeTenants:   number;
  unpaidCount:     number;
  unpaidTotal:     number;
  riskCount:       number;
  sessionsThisWeek: number;
  recentAudit:     AuditRow[];
}

interface Props {
  tenants:     DbTenant[];
  currentUser: DbUser | null;
  onNavigate:  (view: string) => void;
  onNewIntake: () => void;
}

const ACTION_COLOURS: Record<string, string> = {
  CREATE: 'bg-emerald-100 text-emerald-700',
  EDIT:   'bg-amber/20 text-amber-dark',
  VERIFY: 'bg-sky-100 text-sky-700',
  SIGN:   'bg-purple-100 text-purple-700',
  LOGIN:  'bg-slate-100 text-slate-600',
  PRINT:  'bg-slate-100 text-slate-600',
};

export default function DashboardView({ tenants, currentUser, onNavigate, onNewIntake }: Props) {
  const [stats, setStats] = useState<Stats | null>(null);

  useEffect(() => {
    fetch('/api/stats')
      .then((r) => r.json())
      .then(setStats)
      .catch(() => null);
  }, []);

  const fmt = (n: number) => n.toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const fmtDate = (s: string) =>
    new Date(s).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });

  const missingTenants = tenants.filter((t) => t.status === 'missing');
  const recentTenants  = [...tenants].slice(0, 5);

  return (
    <main className="flex-1 overflow-y-auto bg-cream px-6 py-5">
      {/* Welcome banner */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-lg font-black text-navy">
            Good {new Date().getHours() < 12 ? 'morning' : 'afternoon'}, {currentUser?.full_name?.split(' ')[0] ?? 'Manager'}.
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            {new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
          </p>
        </div>
        <button
          type="button"
          onClick={onNewIntake}
          className="flex items-center gap-2 bg-amber text-navy font-bold text-xs px-4 py-2.5 rounded-lg hover:bg-amber-light transition-colors shadow-sm"
        >
          <Plus className="w-3.5 h-3.5" />
          New Intake
        </button>
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
        <KPICard
          icon={<Users className="w-4 h-4" />}
          label="Active Tenants"
          value={stats ? String(stats.activeTenants) : '—'}
          sub={`${stats?.totalTenants ?? '—'} total`}
          colour="bg-navy"
          onClick={() => onNavigate('tenants')}
        />
        <KPICard
          icon={<Receipt className="w-4 h-4" />}
          label="Unpaid Charges"
          value={stats ? `£${fmt(stats.unpaidTotal)}` : '—'}
          sub={`${stats?.unpaidCount ?? '—'} invoices`}
          colour="bg-amber"
          textDark
          onClick={() => onNavigate('ledger')}
        />
        <KPICard
          icon={<AlertTriangle className="w-4 h-4" />}
          label="Risk Flags"
          value={stats ? String(stats.riskCount) : '—'}
          sub="AI-detected"
          colour="bg-red-500"
          onClick={() => onNavigate('risk')}
        />
        <KPICard
          icon={<CalendarDays className="w-4 h-4" />}
          label="Sessions This Week"
          value={stats ? String(stats.sessionsThisWeek) : '—'}
          sub="all workers"
          colour="bg-emerald-600"
          onClick={() => onNavigate('sessions')}
        />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">

        {/* Recent audit trail */}
        <div className="xl:col-span-2 bg-white/80 backdrop-blur-xl rounded-2xl border border-slate-200/60 overflow-hidden shadow-sm ring-1 ring-slate-900/5">
          <div className="flex items-center justify-between px-5 py-3 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <Link className="w-3.5 h-3.5 text-navy" />
              <h2 className="text-xs font-bold text-navy">Recent Audit Trail</h2>
            </div>
            <button type="button" onClick={() => onNavigate('audit')} className="text-xxs text-amber font-semibold hover:text-amber-dark flex items-center gap-1">
              View all <ArrowRight className="w-3 h-3" />
            </button>
          </div>
          <div className="divide-y divide-slate-50">
            {stats?.recentAudit.length === 0 && (
              <p className="px-5 py-6 text-xs text-slate-400 text-center">No audit entries yet.</p>
            )}
            {(stats?.recentAudit ?? []).map((row) => (
              <div key={row.id} className="flex items-center gap-3 px-5 py-3">
                <span className={`text-xxs font-black uppercase px-1.5 py-0.5 rounded flex-shrink-0 ${ACTION_COLOURS[row.action] ?? 'bg-slate-100 text-slate-600'}`}>
                  {row.action}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-navy font-semibold truncate">{row.actor_name}</p>
                  <p className="text-xxs text-slate-400 truncate font-mono">{row.payload_hash.slice(0, 20)}…</p>
                </div>
                <span className="text-xxs text-slate-400 flex-shrink-0">{fmtDate(row.stamped_at)}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Right column */}
        <div className="space-y-4">

          {/* Missing persons alert */}
          {missingTenants.length > 0 && (
            <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3">
              <div className="flex items-center gap-2 mb-2">
                <AlertTriangle className="w-3.5 h-3.5 text-red-500" />
                <span className="text-xs font-black text-red-600 uppercase tracking-wide">Missing Persons</span>
              </div>
              {missingTenants.map((t) => (
                <div key={t.id} className="text-xs text-red-700 font-semibold py-0.5">{t.full_name} — {t.room_number}</div>
              ))}
            </div>
          )}

          {/* Recent tenants */}
          <div className="bg-white/80 backdrop-blur-xl rounded-2xl border border-slate-200/60 overflow-hidden shadow-sm ring-1 ring-slate-900/5">
            <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <TrendingUp className="w-3.5 h-3.5 text-navy" />
                <h2 className="text-xs font-bold text-navy">Recent Tenants</h2>
              </div>
              <button type="button" onClick={() => onNavigate('tenants')} className="text-xxs text-amber font-semibold hover:text-amber-dark flex items-center gap-1">
                All <ArrowRight className="w-3 h-3" />
              </button>
            </div>
            <ul className="divide-y divide-slate-50">
              {recentTenants.map((t) => {
                const initials = t.full_name.split(' ').slice(0, 2).map((n) => n[0]).join('').toUpperCase();
                return (
                  <li key={t.id} className="flex items-center gap-3 px-4 py-2.5">
                    <div className="w-7 h-7 rounded-full bg-slate-200 flex items-center justify-center text-xxs font-black text-slate-500 flex-shrink-0">
                      {initials}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold text-navy truncate">{t.full_name}</p>
                      <p className="text-xxs text-slate-400">{t.room_number}</p>
                    </div>
                    <span className={`text-xxs font-semibold px-1.5 py-0.5 rounded-full ${
                      t.status === 'active'   ? 'bg-emerald-50 text-emerald-600' :
                      t.status === 'missing'  ? 'bg-red-50 text-red-500' :
                      'bg-slate-100 text-slate-500'
                    }`}>{t.status}</span>
                  </li>
                );
              })}
              {recentTenants.length === 0 && (
                <li className="px-4 py-6 text-center text-xs text-slate-400">No tenants yet — run intake.</li>
              )}
            </ul>
          </div>

          {/* Quick links */}
          <div className="bg-gradient-to-b from-navy to-[#0f172a] rounded-2xl p-4 space-y-2 shadow-lg ring-1 ring-white/10">
            <p className="text-xxs font-black text-slate-400 uppercase tracking-widest mb-3">Quick Actions</p>
            {[
              { label: 'Start Intake',        nav: 'intake' },
              { label: 'Log a Session',       nav: 'sessions' },
              { label: 'Record Payment',      nav: 'ledger' },
              { label: 'Generate AI Report',  nav: 'ai-brain' },
              { label: 'Print Weekly Report', nav: 'print' },
            ].map((item) => (
              <button
                key={item.label}
                type="button"
                onClick={() => onNavigate(item.nav)}
                className="w-full flex items-center justify-between px-3 py-2 rounded-lg bg-navy-light
                           hover:bg-amber/20 text-white hover:text-amber text-xs font-medium transition-colors"
              >
                {item.label}
                <ArrowRight className="w-3 h-3 opacity-50" />
              </button>
            ))}
          </div>
        </div>
      </div>
    </main>
  );
}

function KPICard({
  icon, label, value, sub, colour, textDark = false, onClick,
}: {
  icon: React.ReactNode; label: string; value: string; sub: string;
  colour: string; textDark?: boolean; onClick?: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="bg-white/80 backdrop-blur-xl rounded-2xl border border-slate-200/60 p-5 text-left shadow-sm hover:shadow-lg hover:-translate-y-1 transition-all group ring-1 ring-slate-900/5"
    >
      <div className={`w-8 h-8 rounded-lg ${colour} flex items-center justify-center mb-3 ${textDark ? 'text-navy' : 'text-white'}`}>
        {icon}
      </div>
      <p className="text-xxs font-semibold text-slate-400 uppercase tracking-wider">{label}</p>
      <p className="text-2xl font-black text-navy mt-1 group-hover:text-amber transition-colors">{value}</p>
      <p className="text-xxs text-slate-400 mt-0.5">{sub}</p>
    </button>
  );
}
