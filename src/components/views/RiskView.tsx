'use client';

import { useEffect, useState } from 'react';
import { AlertTriangle, Loader2, ShieldAlert, ChevronDown, ChevronUp } from 'lucide-react';
import type { DbTenant } from '@/types/database';

interface FlaggedSession {
  id: string;
  tenant_id: string;
  session_date: string;
  session_type: string;
  notes: string | null;
  ai_risk_flag: boolean;
  ai_risk_note: string | null;
  entry_method: string;
  created_at: string;
  users?: { full_name: string };
}

interface Props {
  activeTenant: DbTenant | null;
  tenants:      DbTenant[];
}

const SEVERITY_LEVELS = ['Critical', 'High', 'Medium', 'Low'];

export default function RiskView({ activeTenant, tenants }: Props) {
  const [sessions,  setSessions]  = useState<FlaggedSession[]>([]);
  const [loading,   setLoading]   = useState(false);
  const [expanded,  setExpanded]  = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    const base = activeTenant ? `/api/sessions?tenant_id=${activeTenant.id}&limit=200` : '/api/sessions?limit=200';
    fetch(base)
      .then((r) => r.json())
      .then((data: FlaggedSession[]) => setSessions(Array.isArray(data) ? data.filter((s) => s.ai_risk_flag ?? false) : []))
      .catch(() => setSessions([]))
      .finally(() => setLoading(false));
  }, [activeTenant]);

  const fmtDate = (d: string) =>
    new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });

  // Tenants with missing status
  const missingTenants = tenants.filter((t) => t.status === 'missing');

  return (
    <main className="flex-1 overflow-y-auto bg-cream px-6 py-5">
      <div className="mb-5">
        <h1 className="text-lg font-black text-navy">Risk Flags</h1>
        <p className="text-xs text-slate-500 mt-0.5">AI-detected safeguarding concerns and flagged sessions.</p>
      </div>

      {/* Missing persons banner */}
      {missingTenants.length > 0 && (
        <div className="mb-5 bg-red-600 text-white rounded-xl px-5 py-4">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle className="w-4 h-4" />
            <span className="font-black text-sm uppercase tracking-wide">⚠ Missing Persons — Police Protocol Active</span>
          </div>
          <div className="space-y-1">
            {missingTenants.map((t) => (
              <p key={t.id} className="text-sm font-bold">
                {t.full_name} · {t.room_number}
                {t.physical_description && (
                  <span className="font-normal text-red-200"> — {t.physical_description.slice(0, 80)}</span>
                )}
              </p>
            ))}
          </div>
        </div>
      )}

      {/* Risk summary cards */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-3 mb-6">
        {SEVERITY_LEVELS.map((level) => {
          const colours: Record<string, string> = {
            Critical: 'bg-red-600 text-white',
            High:     'bg-orange-500 text-white',
            Medium:   'bg-amber text-navy',
            Low:      'bg-emerald-500 text-white',
          };
          return (
            <div key={level} className={`rounded-xl px-4 py-3 ${colours[level]}`}>
              <p className="text-xxs font-black uppercase tracking-widest opacity-80">{level} Risk</p>
              <p className="text-2xl font-black mt-1">
                {sessions.filter((s) => s.ai_risk_note?.toLowerCase().includes(level.toLowerCase())).length}
              </p>
            </div>
          );
        })}
      </div>

      {/* Flagged sessions */}
      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="w-6 h-6 text-slate-300 animate-spin" />
        </div>
      ) : sessions.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-xl py-16 text-center">
          <ShieldAlert className="w-8 h-8 text-emerald-200 mx-auto mb-3" />
          <p className="text-sm text-slate-400">No risk flags detected.</p>
          <p className="text-xs text-slate-300 mt-1">Sessions with AI risk analysis will appear here.</p>
        </div>
      ) : (
        <div className="space-y-2">
          <p className="text-xxs text-slate-400 font-semibold uppercase tracking-wider mb-2">
            {sessions.length} flagged session{sessions.length !== 1 ? 's' : ''}
          </p>
          {sessions.map((s) => {
            const isOpen = expanded === s.id;
            return (
              <div key={s.id} className="bg-white border border-red-200 rounded-xl overflow-hidden">
                <button
                  type="button"
                  onClick={() => setExpanded(isOpen ? null : s.id)}
                  className="w-full flex items-center gap-3 px-5 py-3.5 text-left hover:bg-red-50/40 transition-colors"
                >
                  <AlertTriangle className="w-4 h-4 text-red-500 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-navy">{fmtDate(s.session_date)}</span>
                      <span className="text-xxs bg-red-100 text-red-600 px-1.5 py-0.5 rounded font-bold">
                        {s.session_type.replace('_', ' ')}
                      </span>
                    </div>
                    <p className="text-xxs text-red-500 mt-0.5 font-semibold truncate">
                      {s.ai_risk_note ?? 'Risk indicators detected'}
                    </p>
                  </div>
                  {isOpen ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
                </button>
                {isOpen && (
                  <div className="px-5 pb-4 border-t border-red-100">
                    <p className="text-sm text-slate-700 mt-3 whitespace-pre-wrap leading-relaxed">
                      {s.notes ?? <span className="text-slate-400 italic">No session notes.</span>}
                    </p>
                    <p className="text-xxs text-slate-400 font-mono mt-3">
                      Logged by {s.users?.full_name ?? 'Unknown'} · {new Date(s.created_at).toLocaleString('en-GB')}
                    </p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </main>
  );
}
