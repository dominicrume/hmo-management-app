'use client';

import { useEffect, useState, useCallback } from 'react';
import { Plus, Loader2, CalendarDays, Mic, FileText, ChevronDown, ChevronUp, AlertTriangle } from 'lucide-react';
import type { DbTenant, DbUser } from '@/types/database';

interface Session {
  id: string;
  tenant_id: string;
  worker_id: string;
  session_type: string;
  session_date: string;
  notes: string | null;
  entry_method: string;
  ai_risk_flag: boolean;
  ai_risk_note: string | null;
  is_signed: boolean;
  created_at: string;
  users?: { full_name: string; role: string };
}

interface Props {
  activeTenant: DbTenant | null;
  currentUser:  DbUser | null;
  tenants:      DbTenant[];
}

const SESSION_TYPES = ['daily', 'weekly', 'monthly', 'ad_hoc'];

export default function SessionsView({ activeTenant, currentUser, tenants }: Props) {
  const [sessions,     setSessions]     = useState<Session[]>([]);
  const [loading,      setLoading]      = useState(false);
  const [showForm,     setShowForm]     = useState(false);
  const [expanded,     setExpanded]     = useState<string | null>(null);
  const [saving,       setSaving]       = useState(false);
  const [selectedTenant, setSelectedTenant] = useState<string>(activeTenant?.id ?? '');

  // form state
  const [sessionType, setSessionType] = useState('daily');
  const [sessionDate, setSessionDate] = useState(new Date().toISOString().split('T')[0]);
  const [notes,       setNotes]       = useState('');

  const loadSessions = useCallback(async () => {
    setLoading(true);
    const url = selectedTenant
      ? `/api/sessions?tenant_id=${selectedTenant}&limit=50`
      : '/api/sessions?limit=50';
    const data = await fetch(url).then((r) => r.json()).catch(() => []);
    setSessions(Array.isArray(data) ? data : []);
    setLoading(false);
  }, [selectedTenant]);

  useEffect(() => { loadSessions(); }, [loadSessions]);
  useEffect(() => { setSelectedTenant(activeTenant?.id ?? ''); }, [activeTenant]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTenant) return;
    setSaving(true);
    await fetch('/api/sessions', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        tenant_id:    selectedTenant,
        session_type: sessionType,
        session_date: sessionDate,
        notes,
      }),
    });
    setSaving(false);
    setShowForm(false);
    setNotes('');
    loadSessions();
  };

  const fmtDate = (d: string) =>
    new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });

  const entryIcon = (method: string) =>
    method === 'voice' ? <Mic className="w-3 h-3" /> : <FileText className="w-3 h-3" />;

  return (
    <main className="flex-1 overflow-y-auto bg-cream px-6 py-5">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-lg font-black text-navy">Sessions</h1>
          <p className="text-xs text-slate-500 mt-0.5">Log contacts and support sessions for each tenant.</p>
        </div>
        <button
          type="button"
          onClick={() => setShowForm((v) => !v)}
          className="flex items-center gap-2 bg-amber text-navy font-bold text-xs px-4 py-2.5 rounded-lg hover:bg-amber-light transition-colors"
        >
          <Plus className="w-3.5 h-3.5" />
          Log Session
        </button>
      </div>

      {/* Log session form */}
      {showForm && (
        <form onSubmit={handleSubmit} className="bg-white border border-slate-200 rounded-xl p-5 mb-5 space-y-4">
          <h2 className="text-xs font-black text-navy uppercase tracking-widest">New Session</h2>

          {/* Tenant picker (if no active tenant) */}
          {!activeTenant && (
            <div className="space-y-1">
              <label htmlFor="session-tenant" className="text-xxs font-black text-slate-400 uppercase tracking-wider">Tenant</label>
              <select
                id="session-tenant"
                value={selectedTenant}
                onChange={(e) => setSelectedTenant(e.target.value)}
                required
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm text-navy bg-white focus:outline-none focus:ring-2 focus:ring-amber/50"
              >
                <option value="">Select tenant…</option>
                {tenants.map((t) => (
                  <option key={t.id} value={t.id}>{t.full_name} — {t.room_number}</option>
                ))}
              </select>
            </div>
          )}
          {activeTenant && (
            <p className="text-sm font-bold text-navy">
              Tenant: <span className="text-amber">{activeTenant.full_name}</span>
            </p>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label htmlFor="sess-type" className="text-xxs font-black text-slate-400 uppercase tracking-wider">Session Type</label>
              <select
                id="sess-type"
                value={sessionType}
                onChange={(e) => setSessionType(e.target.value)}
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm text-navy bg-white focus:outline-none focus:ring-2 focus:ring-amber/50"
              >
                {SESSION_TYPES.map((t) => (
                  <option key={t} value={t}>{t.replace('_', ' ').replace(/^\w/, (c) => c.toUpperCase())}</option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <label htmlFor="sess-date" className="text-xxs font-black text-slate-400 uppercase tracking-wider">Session Date</label>
              <input
                id="sess-date"
                type="date"
                value={sessionDate}
                onChange={(e) => setSessionDate(e.target.value)}
                required
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm text-navy focus:outline-none focus:ring-2 focus:ring-amber/50"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label htmlFor="sess-notes" className="text-xxs font-black text-slate-400 uppercase tracking-wider">Session Notes</label>
            <textarea
              id="sess-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={4}
              placeholder="What was discussed? Actions agreed? Any concerns?"
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm text-navy resize-none focus:outline-none focus:ring-2 focus:ring-amber/50"
            />
          </div>

          <div className="flex gap-3 justify-end">
            <button type="button" onClick={() => setShowForm(false)} className="text-xs text-slate-500 hover:text-navy px-4 py-2 border border-slate-200 rounded-lg">
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving || !selectedTenant}
              className="flex items-center gap-2 bg-navy text-white text-xs font-bold px-5 py-2 rounded-lg hover:bg-navy-light transition-colors disabled:opacity-50"
            >
              {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              Save &amp; Stamp
            </button>
          </div>
        </form>
      )}

      {/* Filter bar */}
      <div className="flex items-center gap-3 mb-4">
        <div className="text-xs text-slate-500 font-semibold">
          {activeTenant ? `Showing: ${activeTenant.full_name}` : 'All tenants'}
        </div>
        <span className="text-xxs bg-navy/10 text-navy font-black px-2 py-0.5 rounded-full">
          {sessions.length} sessions
        </span>
      </div>

      {/* Sessions list */}
      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="w-6 h-6 text-slate-300 animate-spin" />
        </div>
      ) : sessions.length === 0 ? (
        <div className="bg-gradient-to-b from-white to-slate-50/50 border border-slate-200 rounded-2xl py-24 text-center shadow-sm">
          <div className="w-16 h-16 mx-auto bg-amber/10 rounded-full flex items-center justify-center mb-4">
            <CalendarDays className="w-8 h-8 text-amber animate-pulse" />
          </div>
          <p className="text-sm font-semibold text-navy">No sessions recorded</p>
          <button type="button" onClick={() => setShowForm(true)} className="mt-3 text-xs text-amber font-bold hover:text-amber-dark hover:underline transition-all">
            Log the first session →
          </button>
        </div>
      ) : (
        <div className="space-y-2">
          {sessions.map((s) => {
            const isOpen = expanded === s.id;
            return (
              <div key={s.id} className={`bg-white border rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-all ${s.ai_risk_flag ? 'border-red-200 ring-1 ring-red-100' : 'border-slate-200'}`}>
                <button
                  type="button"
                  onClick={() => setExpanded(isOpen ? null : s.id)}
                  className={`w-full flex items-center gap-4 px-5 py-4 text-left transition-colors ${isOpen ? 'bg-slate-50/50' : 'hover:bg-slate-50'}`}
                >
                  <div className={`p-1.5 rounded-lg flex-shrink-0 ${s.ai_risk_flag ? 'bg-red-100 text-red-500' : 'bg-slate-100 text-navy'}`}>
                    {entryIcon(s.entry_method)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-navy">
                        {fmtDate(s.session_date)}
                      </span>
                      <span className="text-xxs bg-navy/10 text-navy px-1.5 py-0.5 rounded font-semibold">
                        {s.session_type.replace('_', ' ')}
                      </span>
                      {s.ai_risk_flag && (
                        <span className="flex items-center gap-1 text-xxs text-red-500 font-bold">
                          <AlertTriangle className="w-3 h-3" /> Risk flagged
                        </span>
                      )}
                    </div>
                    <p className="text-xxs text-slate-400 mt-0.5">
                      {s.users?.full_name ?? 'Unknown worker'} · {s.entry_method}
                    </p>
                  </div>
                  {isOpen ? <ChevronUp className="w-4 h-4 text-slate-400 flex-shrink-0" /> : <ChevronDown className="w-4 h-4 text-slate-400 flex-shrink-0" />}
                </button>

                {isOpen && (
                  <div className="px-5 pb-4 border-t border-slate-100">
                    {s.ai_risk_note && (
                      <div className="flex items-start gap-2 mt-3 px-3 py-2 bg-red-50 border border-red-100 rounded-lg mb-3">
                        <AlertTriangle className="w-3.5 h-3.5 text-red-500 flex-shrink-0 mt-0.5" />
                        <p className="text-xs text-red-600">{s.ai_risk_note}</p>
                      </div>
                    )}
                    <p className="text-sm text-slate-700 mt-3 whitespace-pre-wrap leading-relaxed">
                      {s.notes ?? <span className="text-slate-400 italic">No notes recorded.</span>}
                    </p>
                    <p className="text-xxs text-slate-300 font-mono mt-3">
                      Logged: {new Date(s.created_at).toLocaleString('en-GB')} · {s.is_signed ? '✓ Signed' : 'Draft'}
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
