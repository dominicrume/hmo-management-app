'use client';

import { ShieldCheck } from 'lucide-react';

interface AuditEntry {
  id: string;
  stamped_at: string;
  actor_name: string;
  actor_role: string;
  action: string;
  table_name: string;
  tenant_name?: string;
  payload_hash: string;
}

interface AuditTableProps {
  entries: AuditEntry[];
  loading?: boolean;
}

const ACTION_COLOUR: Record<string, string> = {
  CREATE:         'text-green-400 bg-green-500/10',
  EDIT:           'text-blue-400 bg-blue-500/10',
  SIGN:           'text-amber-400 bg-amber-500/10',
  VERIFY:         'text-purple-400 bg-purple-500/10',
  LOGIN:          'text-white/50 bg-white/5',
  EXPORT:         'text-cyan-400 bg-cyan-500/10',
  PRINT:          'text-cyan-400 bg-cyan-500/10',
  DELETE_REQUEST: 'text-red-400 bg-red-500/10',
};

export function AuditTable({ entries, loading }: AuditTableProps) {
  if (loading) {
    return (
      <div className="bg-[#0F1C2E] border border-white/10 rounded-xl overflow-hidden">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="h-12 border-b border-white/5 animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div className="bg-[#0F1C2E] border border-white/10 rounded-xl overflow-hidden">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-white/10">
            {['Timestamp', 'Actor', 'Action', 'Table', 'Tenant', 'Hash'].map((h) => (
              <th key={h} className="px-4 py-3 text-left text-white/40 text-xs font-medium uppercase tracking-wider">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {entries.length === 0 && (
            <tr>
              <td colSpan={6} className="px-4 py-8 text-center text-white/30 text-sm">
                No audit entries found.
              </td>
            </tr>
          )}
          {entries.map((e) => (
            <tr key={e.id} className="border-b border-white/5 hover:bg-white/3 transition-colors">
              <td className="px-4 py-3 text-white/50 text-xs font-[JetBrains_Mono,monospace] whitespace-nowrap">
                {new Date(e.stamped_at).toLocaleString('en-GB')}
              </td>
              <td className="px-4 py-3">
                <p className="text-white text-xs font-medium">{e.actor_name}</p>
                <p className="text-white/30 text-[10px]">{e.actor_role}</p>
              </td>
              <td className="px-4 py-3">
                <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${ACTION_COLOUR[e.action] ?? 'text-white/40 bg-white/5'}`}>
                  {e.action}
                </span>
              </td>
              <td className="px-4 py-3 text-white/40 text-xs">{e.table_name}</td>
              <td className="px-4 py-3 text-white/60 text-xs">{e.tenant_name ?? '—'}</td>
              <td className="px-4 py-3">
                <span
                  title={e.payload_hash}
                  className="flex items-center gap-1 text-green-400 text-[10px] font-[JetBrains_Mono,monospace]"
                >
                  <ShieldCheck className="w-3 h-3 shrink-0" />
                  {e.payload_hash.slice(0, 10)}…
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
