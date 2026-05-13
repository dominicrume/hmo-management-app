'use client';

import React, { useEffect, useState } from 'react';
import { Link, Loader2, Copy, CheckCheck, ShieldCheck } from 'lucide-react';
import type { DbTenant } from '@/types/database';

interface AuditRow {
  id: string;
  actor_name: string;
  actor_role: string;
  action: string;
  table_name: string;
  record_id: string;
  entry_method: string;
  stamped_at: string;
  payload_hash: string;
  tenant_id: string | null;
  diff_fields: string[] | null;
  new_data: Record<string, unknown> | null;
}

interface Props {
  activeTenant: DbTenant | null;
}

const ACTION_COLOURS: Record<string, string> = {
  CREATE: 'bg-emerald-100 text-emerald-700',
  EDIT:   'bg-amber/20 text-amber-dark',
  VERIFY: 'bg-sky-100 text-sky-700',
  SIGN:   'bg-purple-100 text-purple-700',
  LOGIN:  'bg-slate-100 text-slate-500',
  PRINT:  'bg-slate-100 text-slate-500',
  DELETE_REQUEST: 'bg-red-100 text-red-600',
};

export default function AuditView({ activeTenant }: Props) {
  const [logs,    setLogs]    = useState<AuditRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [copied,  setCopied]  = useState<string | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    const url = activeTenant
      ? `/api/audit?tenant_id=${activeTenant.id}&limit=100`
      : '/api/audit?limit=100';
    fetch(url)
      .then((r) => r.json())
      .then((d) => setLogs(Array.isArray(d) ? d : []))
      .catch(() => setLogs([]))
      .finally(() => setLoading(false));
  }, [activeTenant]);

  const copyHash = async (hash: string, id: string) => {
    await navigator.clipboard.writeText(hash);
    setCopied(id);
    setTimeout(() => setCopied(null), 2000);
  };

  const fmtStamp = (s: string) =>
    new Date(s).toLocaleString('en-GB', {
      day: 'numeric', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit', second: '2-digit',
    });

  return (
    <main className="flex-1 overflow-y-auto bg-cream px-6 py-5">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-lg font-black text-navy">Blockchain Audit Trail</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            {activeTenant ? activeTenant.full_name : 'All records'} · SHA-256 immutable log
          </p>
        </div>
        <div className="flex items-center gap-2 px-3 py-1.5 bg-emerald-50 border border-emerald-200 rounded-lg">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
          <span className="text-xxs font-bold text-emerald-700 uppercase tracking-wide">Tamper-proof</span>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="w-6 h-6 text-slate-300 animate-spin" />
        </div>
      ) : logs.length === 0 ? (
        <div className="bg-gradient-to-b from-white to-slate-50/50 border border-slate-200 rounded-2xl py-24 text-center shadow-sm">
          <div className="w-16 h-16 mx-auto bg-emerald-50 rounded-full flex items-center justify-center mb-4">
            <ShieldCheck className="w-8 h-8 text-emerald-500 animate-pulse" />
          </div>
          <p className="text-sm font-semibold text-navy">No audit entries yet</p>
          <p className="text-xs text-slate-400 mt-1">Every save, sign, and edit will be immutably recorded here.</p>
        </div>
      ) : (
        <div className="bg-white/80 backdrop-blur-xl border border-slate-200/60 rounded-2xl overflow-hidden shadow-sm ring-1 ring-slate-900/5">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-slate-200/60 bg-gradient-to-r from-slate-50/80 to-white/80">
                <th className="text-left px-5 py-4 text-xxs font-black text-slate-400 uppercase tracking-widest">Action</th>
                <th className="text-left px-5 py-4 text-xxs font-black text-slate-400 uppercase tracking-widest">Actor</th>
                <th className="text-left px-5 py-4 text-xxs font-black text-slate-400 uppercase tracking-widest">Table</th>
                <th className="text-left px-5 py-4 text-xxs font-black text-slate-400 uppercase tracking-widest">Timestamp</th>
                <th className="text-left px-5 py-4 text-xxs font-black text-slate-400 uppercase tracking-widest">SHA-256 Hash</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {logs.map((row) => (
                <React.Fragment key={row.id}>
                  <tr
                    className="hover:bg-slate-50 transition-colors cursor-pointer"
                    onClick={() => setExpanded(expanded === row.id ? null : row.id)}
                  >
                    <td className="px-4 py-3">
                      <span className={`text-xxs font-black uppercase px-1.5 py-0.5 rounded ${ACTION_COLOURS[row.action] ?? 'bg-slate-100 text-slate-500'}`}>
                        {row.action}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-bold text-navy">{row.actor_name}</p>
                      <p className="text-xxs text-slate-400">{row.actor_role} · {row.entry_method}</p>
                    </td>
                    <td className="px-4 py-3 text-slate-600 font-mono">{row.table_name}</td>
                    <td className="px-4 py-3 text-slate-500 whitespace-nowrap">{fmtStamp(row.stamped_at)}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xxs text-slate-400 truncate max-w-[140px]">
                          {row.payload_hash.slice(0, 16)}…
                        </span>
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); copyHash(row.payload_hash, row.id); }}
                          className="text-slate-400 hover:text-navy transition-colors flex-shrink-0"
                          title="Copy full hash"
                        >
                          {copied === row.id
                            ? <CheckCheck className="w-3.5 h-3.5 text-emerald-500" />
                            : <Copy className="w-3.5 h-3.5" />
                          }
                        </button>
                      </div>
                    </td>
                  </tr>
                  {expanded === row.id && (
                    <tr className="bg-slate-50">
                      <td colSpan={5} className="px-4 py-3">
                        <div className="space-y-2">
                          <div>
                            <span className="text-xxs font-black text-slate-400 uppercase">Full Hash: </span>
                            <span className="font-mono text-xxs text-navy break-all">{row.payload_hash}</span>
                          </div>
                          {row.diff_fields && row.diff_fields.length > 0 && (
                            <div>
                              <span className="text-xxs font-black text-slate-400 uppercase">Fields Changed: </span>
                              <span className="text-xxs text-slate-600">{row.diff_fields.join(', ')}</span>
                            </div>
                          )}
                          <div>
                            <span className="text-xxs font-black text-slate-400 uppercase">Record ID: </span>
                            <span className="font-mono text-xxs text-slate-500">{row.record_id}</span>
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </main>
  );
}
