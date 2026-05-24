'use client';

import { useEffect, useState, useCallback } from 'react';
import { CheckCircle2, Circle, Loader2, Plus, Receipt, AlertCircle } from 'lucide-react';
import type { DbTenant, DbUser } from '@/types/database';

interface Charge {
  id: string;
  tenant_id: string;
  weekly_rate: number;
  payment_method: string;
  period_start: string;
  period_end: string;
  amount_due: number;
  amount_paid: number;
  is_paid: boolean;
  paid_at: string | null;
  notes: string | null;
  tenants?: { full_name: string; room_number: string };
}

interface Props {
  activeTenant: DbTenant | null;
  currentUser:  DbUser | null;
  tenants:      DbTenant[];
  onRefresh:    () => void;
}

export default function LedgerView({ activeTenant, currentUser, tenants, onRefresh }: Props) {
  const [charges,  setCharges]  = useState<Charge[]>([]);
  const [loading,  setLoading]  = useState(false);
  const [toggling, setToggling] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [saving,   setSaving]   = useState(false);

  // new charge form
  const [fcTenant,  setFcTenant]  = useState(activeTenant?.id ?? '');
  const [fcRate,    setFcRate]    = useState('');
  const [fcMethod,  setFcMethod]  = useState('Cash');
  const [fcDate,    setFcDate]    = useState(new Date().toISOString().split('T')[0]);

  const load = useCallback(async () => {
    setLoading(true);
    const url = activeTenant
      ? `/api/charges?tenant_id=${activeTenant.id}`
      : '/api/charges';
    const data = await fetch(url).then((r) => r.json()).catch(() => []);
    setCharges(Array.isArray(data) ? data : []);
    setLoading(false);
  }, [activeTenant]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { setFcTenant(activeTenant?.id ?? ''); }, [activeTenant]);

  const togglePaid = async (id: string, current: boolean) => {
    setToggling(id);
    await fetch('/api/charges', {
      method:  'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ id, is_paid: !current }),
    });
    setToggling(null);
    load();
    onRefresh();
  };

  const handleNewCharge = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fcTenant || !fcRate) return;
    setSaving(true);
    await fetch('/api/forms/save', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        form_id:   'service',
        tenant_id: fcTenant,
        data: { weekly_rate: fcRate, payment_method: fcMethod, agreement_start_date: fcDate },
        stamp: true,
      }),
    });
    setSaving(false);
    setShowForm(false);
    setFcRate('');
    load();
    onRefresh();
  };

  const fmt = (n: number) => `£${n.toFixed(2)}`;
  const fmtDate = (d: string) => new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });

  const totalOwed = charges.filter((c) => !c.is_paid).reduce((s, c) => s + (c.amount_due - c.amount_paid), 0);

  return (
    <main className="flex-1 overflow-y-auto bg-cream px-6 py-5">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-lg font-black text-navy">Service Charge Ledger</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            {activeTenant ? activeTenant.full_name : 'All tenants'} ·{' '}
            <span className="text-red-500 font-bold">{fmt(totalOwed)} outstanding</span>
          </p>
        </div>
        {currentUser?.role === 'Manager' && (
          <button
            type="button"
            onClick={() => setShowForm((v) => !v)}
            className="flex items-center gap-2 bg-amber text-navy font-bold text-xs px-4 py-2.5 rounded-lg hover:bg-amber-light transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            New Charge
          </button>
        )}
      </div>

      {/* New charge form */}
      {showForm && (
        <form onSubmit={handleNewCharge} className="bg-white border border-slate-200 rounded-xl p-5 mb-5">
          <h2 className="text-xs font-black text-navy uppercase tracking-widest mb-4">Add Service Charge</h2>
          <div className="grid grid-cols-2 gap-4">
            {!activeTenant && (
              <div className="col-span-2 space-y-1">
                <label htmlFor="fc-tenant" className="text-xxs font-black text-slate-400 uppercase tracking-wider">Tenant</label>
                <select id="fc-tenant" value={fcTenant} onChange={(e) => setFcTenant(e.target.value)} required
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm text-navy bg-white focus:outline-none focus:ring-2 focus:ring-amber/50">
                  <option value="">Select tenant…</option>
                  {tenants.map((t) => <option key={t.id} value={t.id}>{t.full_name} — {t.room_number}</option>)}
                </select>
              </div>
            )}
            <div className="space-y-1">
              <label htmlFor="fc-rate" className="text-xxs font-black text-slate-400 uppercase tracking-wider">Weekly Rate (£)</label>
              <input id="fc-rate" type="number" step="0.01" value={fcRate} onChange={(e) => setFcRate(e.target.value)} required placeholder="150.00"
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm text-navy focus:outline-none focus:ring-2 focus:ring-amber/50" />
            </div>
            <div className="space-y-1">
              <label htmlFor="fc-method" className="text-xxs font-black text-slate-400 uppercase tracking-wider">Payment Method</label>
              <select id="fc-method" value={fcMethod} onChange={(e) => setFcMethod(e.target.value)}
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm text-navy bg-white focus:outline-none focus:ring-2 focus:ring-amber/50">
                {['Cash', 'Bank Transfer', 'Housing Benefit Direct', 'Standing Order'].map((m) => <option key={m}>{m}</option>)}
              </select>
            </div>
            <div className="space-y-1">
              <label htmlFor="fc-date" className="text-xxs font-black text-slate-400 uppercase tracking-wider">Effective From</label>
              <input id="fc-date" type="date" value={fcDate} onChange={(e) => setFcDate(e.target.value)} required
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm text-navy focus:outline-none focus:ring-2 focus:ring-amber/50" />
            </div>
          </div>
          <div className="flex gap-3 justify-end mt-4">
            <button type="button" onClick={() => setShowForm(false)} className="text-xs text-slate-500 hover:text-navy px-4 py-2 border border-slate-200 rounded-lg">Cancel</button>
            <button type="submit" disabled={saving}
              className="flex items-center gap-2 bg-navy text-white text-xs font-bold px-5 py-2 rounded-lg hover:bg-navy-light disabled:opacity-50 transition-colors">
              {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              Save &amp; Stamp
            </button>
          </div>
        </form>
      )}

      {/* Charges table */}
      {loading ? (
        <div className="flex justify-center py-16"><Loader2 className="w-6 h-6 text-slate-300 animate-spin" /></div>
      ) : charges.length === 0 ? (
        <div className="bg-gradient-to-b from-white to-slate-50/50 border border-slate-200 rounded-2xl py-24 text-center shadow-sm">
          <div className="w-16 h-16 mx-auto bg-amber/10 rounded-full flex items-center justify-center mb-4">
            <Receipt className="w-8 h-8 text-amber animate-pulse" />
          </div>
          <p className="text-sm font-semibold text-navy">No service charges recorded</p>
          <p className="text-xs text-slate-400 mt-1">Generate your first ledger entry above.</p>
        </div>
      ) : (
        <div className="bg-white/80 backdrop-blur-xl border border-slate-200/60 rounded-2xl overflow-hidden shadow-sm ring-1 ring-slate-900/5">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-slate-200/60 bg-gradient-to-r from-slate-50/80 to-white/80">
                <th className="text-left px-5 py-4 text-xxs font-black text-slate-400 uppercase tracking-widest">Tenant</th>
                <th className="text-left px-5 py-4 text-xxs font-black text-slate-400 uppercase tracking-widest">Period</th>
                <th className="text-right px-5 py-4 text-xxs font-black text-slate-400 uppercase tracking-widest">Due</th>
                <th className="text-right px-5 py-4 text-xxs font-black text-slate-400 uppercase tracking-widest">Paid</th>
                <th className="text-left px-5 py-4 text-xxs font-black text-slate-400 uppercase tracking-widest">Method</th>
                <th className="text-center px-5 py-4 text-xxs font-black text-slate-400 uppercase tracking-widest">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {charges.map((c) => (
                <tr key={c.id} className={`hover:bg-slate-50 transition-colors ${!c.is_paid ? 'bg-red-50/30' : ''}`}>
                  <td className="px-4 py-3">
                    <p className="font-bold text-navy truncate max-w-[140px]">
                      {c.tenants?.full_name ?? '—'}
                    </p>
                    <div className="flex flex-col gap-0.5 mt-0.5">
                      <p className="text-xxs text-slate-500">Room {c.tenants?.room_number ?? ''}</p>
                      <p className="text-[10px] font-mono text-amber font-bold bg-amber/10 px-1.5 py-0.5 rounded w-max" title="Use this code as the bank transfer reference">
                        Ref: TEN-{c.tenant_id.substring(0,8).toUpperCase()}
                      </p>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-slate-600">
                    <p>{fmtDate(c.period_start)}</p>
                    <p className="text-xxs text-slate-400">→ {fmtDate(c.period_end)}</p>
                  </td>
                  <td className="px-4 py-3 text-right font-mono font-bold text-navy">{fmt(c.amount_due)}</td>
                  <td className="px-4 py-3 text-right font-mono text-emerald-600">{fmt(c.amount_paid)}</td>
                  <td className="px-4 py-3 text-slate-500">{c.payment_method}</td>
                  <td className="px-4 py-3 text-center">
                    <button
                      type="button"
                      onClick={() => togglePaid(c.id, c.is_paid)}
                      disabled={toggling === c.id || currentUser?.role === 'SupportWorker'}
                      title={c.is_paid ? 'Mark unpaid' : 'Mark paid'}
                      className="inline-flex items-center gap-1.5 disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      {toggling === c.id
                        ? <Loader2 className="w-4 h-4 animate-spin text-slate-400" />
                        : c.is_paid
                          ? <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                          : <Circle className="w-4 h-4 text-red-400" />
                      }
                      <span className={`text-xxs font-bold ${c.is_paid ? 'text-emerald-600' : 'text-red-500'}`}>
                        {c.is_paid ? 'Paid' : 'Unpaid'}
                      </span>
                    </button>
                    {!c.is_paid && (
                      <div className="flex items-center justify-center gap-1 mt-0.5">
                        <AlertCircle className="w-2.5 h-2.5 text-red-400" />
                        <span className="text-xxs text-red-400 font-mono">{fmt(c.amount_due - c.amount_paid)} owed</span>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-slate-200 bg-slate-50">
                <td colSpan={2} className="px-4 py-3 text-xs font-black text-navy">Total Outstanding</td>
                <td colSpan={4} className="px-4 py-3 text-right text-sm font-black text-red-500 font-mono">{fmt(totalOwed)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </main>
  );
}
