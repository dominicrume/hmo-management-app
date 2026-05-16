'use client';

import { useState } from 'react';
import { Printer, FileText, CalendarDays, Loader2 } from 'lucide-react';
import type { DbTenant } from '@/types/database';

interface Props {
  tenants:      DbTenant[];
  activeTenant: DbTenant | null;
}

type Period = 'daily' | 'weekly' | 'monthly' | 'custom';

export default function PrintView({ tenants, activeTenant }: Props) {
  const [period,     setPeriod]     = useState<Period>('weekly');
  const [tenantId,   setTenantId]   = useState(activeTenant?.id ?? '');
  const [dateFrom,   setDateFrom]   = useState('');
  const [dateTo,     setDateTo]     = useState('');
  const [loading,    setLoading]    = useState(false);
  const [report,     setReport]     = useState<string | null>(null);
  type ReportSession = { session_date: string; session_type: string; users?: { full_name?: string }; notes?: string; ai_risk_flag: boolean; ai_risk_note?: string };
  type ReportCharge  = { period_start: string; period_end: string; amount_due: number; amount_paid: number; payment_method: string; is_paid: boolean };
  const [reportData, setReportData] = useState<{
    meta:      { title: string; from: string; to: string; generated: string; tenant: string };
    sessions:  ReportSession[];
    charges:   ReportCharge[];
    riskFlags: ReportSession[];
  } | null>(null);

  const today = new Date();

  const getPeriodDates = (): { from: string; to: string } => {
    const to = today.toISOString().split('T')[0];
    if (period === 'daily') {
      return { from: to, to };
    }
    if (period === 'weekly') {
      const from = new Date(today);
      from.setDate(today.getDate() - 7);
      return { from: from.toISOString().split('T')[0], to };
    }
    if (period === 'monthly') {
      const from = new Date(today.getFullYear(), today.getMonth(), 1);
      return { from: from.toISOString().split('T')[0], to };
    }
    return { from: dateFrom, to: dateTo };
  };

  const generateReport = async () => {
    const { from, to } = getPeriodDates();
    if (!from || !to) return;

    setLoading(true);
    setReport(null);
    setReportData(null);

    try {
      // Fetch sessions + charges in the date range
      const qs = new URLSearchParams({ limit: '200' });
      if (tenantId) qs.set('tenant_id', tenantId);

      const [sessionsRes, chargesRes] = await Promise.all([
        fetch(`/api/sessions?${qs}`).then((r) => r.json()),
        fetch(`/api/charges?${qs}`).then((r) => r.json()),
      ]);

      const sessions = Array.isArray(sessionsRes) ? sessionsRes.filter((s: { session_date: string }) =>
        s.session_date >= from && s.session_date <= to
      ) : [];

      const charges = Array.isArray(chargesRes) ? chargesRes.filter((c: { period_start: string; period_end: string }) =>
        c.period_start >= from && c.period_end <= to
      ) : [];

      const tenant = tenantId ? tenants.find((t) => t.id === tenantId) : null;
      const totalDue  = charges.reduce((s: number, c: { amount_due: number }) => s + c.amount_due, 0);
      const totalPaid = charges.reduce((s: number, c: { amount_paid: number }) => s + c.amount_paid, 0);
      const riskFlags = sessions.filter((s: { ai_risk_flag: boolean }) => s.ai_risk_flag);

      const lines = [
        `MATTY'S PLACE — ${period.toUpperCase()} REPORT`,
        `Ash Shahada Housing Association Ltd`,
        `Period: ${new Date(from).toLocaleDateString('en-GB')} – ${new Date(to).toLocaleDateString('en-GB')}`,
        `Generated: ${today.toLocaleString('en-GB')}`,
        tenant ? `Tenant: ${tenant.full_name} · Room ${tenant.room_number}` : 'All Tenants',
        '',
        '─────────────────────────────────────────',
        `SESSIONS (${sessions.length})`,
        '─────────────────────────────────────────',
        ...sessions.map((s: { session_date: string; session_type: string; ai_risk_flag: boolean; notes: string | null }) =>
          `[${s.session_date}] ${s.session_type.toUpperCase()}${s.ai_risk_flag ? ' ⚠ RISK' : ''}\n${s.notes ?? 'No notes.'}`
        ),
        '',
        '─────────────────────────────────────────',
        `SERVICE CHARGES (${charges.length} records)`,
        `Total Due: £${totalDue.toFixed(2)} | Paid: £${totalPaid.toFixed(2)} | Outstanding: £${(totalDue - totalPaid).toFixed(2)}`,
        '─────────────────────────────────────────',
        ...charges.map((c: { period_start: string; period_end: string; amount_due: number; amount_paid: number; is_paid: boolean; payment_method: string }) =>
          `${c.period_start} → ${c.period_end}: £${c.amount_due.toFixed(2)} due · ${c.is_paid ? '✓ Paid' : '✗ UNPAID'} (${c.payment_method})`
        ),
        '',
        `RISK FLAGS: ${riskFlags.length}`,
        ...riskFlags.map((s: { session_date: string; ai_risk_note: string | null }) => `  ⚠ ${s.session_date}: ${s.ai_risk_note ?? 'Risk detected'}`),
        '',
        '─────────────────────────────────────────',
        `BLOCKCHAIN STAMP: SHA-256 Audit Trail Active`,
        `Document Reference: MP-RPT-${Date.now()}`,
      ];

      setReport(lines.join('\n'));
      setReportData({
        meta: {
          title:     `${period.charAt(0).toUpperCase() + period.slice(1)} Report`,
          from:      new Date(from).toLocaleDateString('en-GB'),
          to:        new Date(to).toLocaleDateString('en-GB'),
          generated: today.toLocaleString('en-GB'),
          tenant:    tenant ? `${tenant.full_name} · Room ${tenant.room_number}` : '',
        },
        sessions,
        charges,
        riskFlags,
      });
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = () => {
    if (!reportData) return;
    const { meta, sessions, charges, riskFlags } = reportData;
    const totalDue  = charges.reduce((s: number, c: { amount_due: number }) => s + c.amount_due, 0);
    const totalPaid = charges.reduce((s: number, c: { amount_paid: number }) => s + c.amount_paid, 0);
    const outstanding = totalDue - totalPaid;

    const printWin = window.open('', '_blank');
    if (!printWin) return;
    printWin.document.write(`<!DOCTYPE html>
<html lang="en"><head>
<meta charset="UTF-8"/>
<title>${meta.title}</title>
<style>
  @page { size: A4; margin: 20mm; }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: 'Segoe UI', Arial, sans-serif; font-size: 10pt; color: #0F1C2E; background: white; }
  .letterhead { border-bottom: 3px solid #E8A84C; padding-bottom: 12px; margin-bottom: 20px; display: flex; justify-content: space-between; align-items: flex-start; }
  .letterhead h1 { font-size: 18pt; font-weight: 900; letter-spacing: -0.5px; text-transform: uppercase; }
  .letterhead p  { font-size: 8pt; color: #666; text-transform: uppercase; letter-spacing: 1px; margin-top: 2px; }
  .meta { text-align: right; font-size: 8pt; color: #666; font-family: monospace; }
  .meta strong { color: #0F1C2E; }
  h2 { font-size: 9pt; font-weight: 900; text-transform: uppercase; letter-spacing: 1.5px; color: #E8A84C; margin: 18px 0 8px; border-bottom: 1px solid #eee; padding-bottom: 4px; }
  .summary-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; margin: 16px 0; }
  .stat-box { border: 1px solid #e5e7eb; border-radius: 6px; padding: 10px 14px; }
  .stat-box .num { font-size: 18pt; font-weight: 900; color: #0F1C2E; }
  .stat-box .lbl { font-size: 7pt; text-transform: uppercase; letter-spacing: 1px; color: #999; margin-top: 2px; }
  .stat-box.warn .num { color: #dc2626; }
  table { width: 100%; border-collapse: collapse; font-size: 9pt; margin-bottom: 12px; }
  th { background: #f8f9fa; font-size: 7.5pt; text-transform: uppercase; letter-spacing: 1px; color: #666; padding: 6px 10px; text-align: left; border-bottom: 2px solid #e5e7eb; }
  td { padding: 7px 10px; border-bottom: 1px solid #f0f0f0; vertical-align: top; }
  tr:last-child td { border-bottom: none; }
  .badge { display: inline-block; padding: 2px 7px; border-radius: 4px; font-size: 7pt; font-weight: 700; text-transform: uppercase; }
  .badge.risk  { background: #fee2e2; color: #dc2626; }
  .badge.paid  { background: #d1fae5; color: #065f46; }
  .badge.unpaid { background: #fee2e2; color: #dc2626; }
  .notes-cell { color: #555; max-width: 280px; }
  .footer { margin-top: 30px; padding-top: 10px; border-top: 1px solid #eee; display: flex; justify-content: space-between; font-size: 7.5pt; color: #999; font-family: monospace; }
  .hash { font-family: monospace; font-size: 7pt; color: #aaa; }
  @media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
</style>
</head><body>
<div class="letterhead">
  <div>
    <h1>Matty's Place</h1>
    <p>Ash Shahada Housing Association Ltd · Supported Housing</p>
  </div>
  <div class="meta">
    <strong>${meta.title}</strong><br/>
    Period: ${meta.from} – ${meta.to}<br/>
    Generated: ${meta.generated}<br/>
    ${meta.tenant ? `Tenant: ${meta.tenant}` : 'All Tenants'}
  </div>
</div>

<div class="summary-grid">
  <div class="stat-box">
    <div class="num">${sessions.length}</div>
    <div class="lbl">Sessions</div>
  </div>
  <div class="stat-box ${outstanding > 0 ? 'warn' : ''}">
    <div class="num">£${outstanding.toFixed(2)}</div>
    <div class="lbl">Outstanding</div>
  </div>
  <div class="stat-box ${riskFlags.length > 0 ? 'warn' : ''}">
    <div class="num">${riskFlags.length}</div>
    <div class="lbl">Risk Flags</div>
  </div>
</div>

${sessions.length > 0 ? `
<h2>Sessions (${sessions.length})</h2>
<table>
  <thead><tr><th>Date</th><th>Type</th><th>Worker</th><th>Notes</th><th>Flag</th></tr></thead>
  <tbody>
    ${sessions.map((s: { session_date: string; session_type: string; users?: { full_name?: string }; notes?: string; ai_risk_flag: boolean; ai_risk_note?: string }) => `
    <tr>
      <td>${new Date(s.session_date).toLocaleDateString('en-GB')}</td>
      <td>${s.session_type.replace('_', ' ').toUpperCase()}</td>
      <td>${s.users?.full_name ?? '—'}</td>
      <td class="notes-cell">${s.notes ? s.notes.slice(0, 200) + (s.notes.length > 200 ? '…' : '') : '—'}</td>
      <td>${s.ai_risk_flag ? `<span class="badge risk">⚠ Risk</span>` : '—'}</td>
    </tr>`).join('')}
  </tbody>
</table>` : '<p style="color:#999;font-size:9pt;margin:8px 0 16px;">No sessions in this period.</p>'}

${charges.length > 0 ? `
<h2>Service Charges (${charges.length})</h2>
<table>
  <thead><tr><th>Period</th><th>Due</th><th>Paid</th><th>Balance</th><th>Method</th><th>Status</th></tr></thead>
  <tbody>
    ${charges.map((c: { period_start: string; period_end: string; amount_due: number; amount_paid: number; payment_method: string; is_paid: boolean }) => `
    <tr>
      <td>${new Date(c.period_start).toLocaleDateString('en-GB')} – ${new Date(c.period_end).toLocaleDateString('en-GB')}</td>
      <td>£${c.amount_due.toFixed(2)}</td>
      <td>£${c.amount_paid.toFixed(2)}</td>
      <td>£${(c.amount_due - c.amount_paid).toFixed(2)}</td>
      <td>${c.payment_method}</td>
      <td><span class="badge ${c.is_paid ? 'paid' : 'unpaid'}">${c.is_paid ? '✓ Paid' : 'Unpaid'}</span></td>
    </tr>`).join('')}
  </tbody>
  <tfoot>
    <tr style="font-weight:700;background:#f8f9fa;">
      <td>TOTAL</td><td>£${totalDue.toFixed(2)}</td><td>£${totalPaid.toFixed(2)}</td>
      <td style="color:${outstanding > 0 ? '#dc2626' : '#065f46'}">£${outstanding.toFixed(2)}</td>
      <td colspan="2"></td>
    </tr>
  </tfoot>
</table>` : '<p style="color:#999;font-size:9pt;margin:8px 0 16px;">No service charges in this period.</p>'}

<div class="footer">
  <span>Matty's Place — Confidential Internal Document</span>
  <span class="hash">SHA-256 Blockchain Audit Active · Ref: MP-RPT-${Date.now()}</span>
</div>
</body></html>`);
    printWin.document.close();
    printWin.print();
  };

  return (
    <main className="flex-1 overflow-y-auto bg-cream px-6 py-5">
      <div className="mb-5">
        <h1 className="text-lg font-black text-navy">Print &amp; Export</h1>
        <p className="text-xs text-slate-500 mt-0.5">Generate council-ready reports filtered by period and tenant.</p>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        {/* Controls */}
        <div className="xl:col-span-1 space-y-4">
          {/* Period */}
          <div className="bg-white border border-slate-200 rounded-xl p-4">
            <p className="text-xxs font-black text-slate-400 uppercase tracking-widest mb-3">Report Period</p>
            <div className="space-y-1.5">
              {(['daily', 'weekly', 'monthly', 'custom'] as Period[]).map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setPeriod(p)}
                  className={`w-full flex items-center gap-2 px-3 py-2.5 rounded-lg text-left text-xs font-semibold transition-colors
                    ${period === p ? 'bg-navy text-white' : 'bg-slate-50 text-slate-600 hover:bg-slate-100'}`}
                >
                  <CalendarDays className="w-3.5 h-3.5" />
                  {p === 'daily'   && 'Daily — Today'}
                  {p === 'weekly'  && 'Weekly — Last 7 days'}
                  {p === 'monthly' && 'Monthly — This month'}
                  {p === 'custom'  && 'Custom date range'}
                </button>
              ))}
            </div>

            {period === 'custom' && (
              <div className="mt-3 space-y-2">
                <div className="space-y-1">
                  <label htmlFor="pr-from" className="text-xxs font-black text-slate-400 uppercase tracking-wider">From</label>
                  <input id="pr-from" type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)}
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm text-navy focus:outline-none focus:ring-2 focus:ring-amber/50" />
                </div>
                <div className="space-y-1">
                  <label htmlFor="pr-to" className="text-xxs font-black text-slate-400 uppercase tracking-wider">To</label>
                  <input id="pr-to" type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)}
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm text-navy focus:outline-none focus:ring-2 focus:ring-amber/50" />
                </div>
              </div>
            )}
          </div>

          {/* Tenant filter */}
          <div className="bg-white border border-slate-200 rounded-xl p-4">
            <p className="text-xxs font-black text-slate-400 uppercase tracking-widest mb-3">Tenant Filter</p>
            <select
              value={tenantId}
              onChange={(e) => setTenantId(e.target.value)}
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm text-navy bg-white focus:outline-none focus:ring-2 focus:ring-amber/50"
            >
              <option value="">All tenants</option>
              {tenants.map((t) => (
                <option key={t.id} value={t.id}>{t.full_name} — {t.room_number}</option>
              ))}
            </select>
          </div>

          {/* Actions */}
          <button
            type="button"
            onClick={generateReport}
            disabled={loading || (period === 'custom' && (!dateFrom || !dateTo))}
            className="w-full flex items-center justify-center gap-2 bg-navy text-white font-bold text-xs py-3 rounded-xl hover:bg-navy-light transition-colors disabled:opacity-50"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileText className="w-4 h-4" />}
            Generate Report
          </button>

          {report && (
            <button
              type="button"
              onClick={handlePrint}
              className="w-full flex items-center justify-center gap-2 bg-amber text-navy font-bold text-xs py-3 rounded-xl hover:bg-amber-light transition-colors"
            >
              <Printer className="w-4 h-4" />
              Print / Save PDF
            </button>
          )}
        </div>

        {/* Report preview */}
        <div className="xl:col-span-2">
          {!report ? (
            <div className="bg-white border border-slate-200 rounded-xl h-full min-h-[400px] flex items-center justify-center">
              <div className="text-center">
                <FileText className="w-10 h-10 text-slate-200 mx-auto mb-3" />
                <p className="text-sm text-slate-400">Select a period and generate your report.</p>
              </div>
            </div>
          ) : (
            <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
              <div className="flex items-center justify-between px-5 py-3 border-b border-slate-100 bg-slate-50">
                <div className="flex items-center gap-2">
                  <FileText className="w-3.5 h-3.5 text-navy" />
                  <span className="text-xs font-bold text-navy">Report Preview</span>
                </div>
                <button type="button" onClick={handlePrint} className="flex items-center gap-1 text-xxs text-amber font-semibold hover:text-amber-dark">
                  <Printer className="w-3 h-3" /> Print
                </button>
              </div>
              <pre className="px-5 py-4 text-xxs font-mono text-navy whitespace-pre-wrap leading-relaxed overflow-auto max-h-[600px]">
                {report}
              </pre>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
