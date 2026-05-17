'use client';

import { useState } from 'react';
import { ChevronUp, ChevronDown, AlertTriangle } from 'lucide-react';

interface Tenant {
  id: string;
  full_name: string;
  room_number: string;
  status: string;
  benefit_type: string;
  moved_in: string;
  ai_risk_flag?: boolean;
}

interface TenantsTableProps {
  tenants: Tenant[];
  onRowClick?: (tenant: Tenant) => void;
  loading?: boolean;
}

type SortKey = keyof Pick<Tenant, 'full_name' | 'room_number' | 'status' | 'moved_in'>;

const STATUS_COLOUR: Record<string, string> = {
  active:    'text-green-400 bg-green-500/10',
  inactive:  'text-white/40 bg-white/5',
  evicted:   'text-red-400 bg-red-500/10',
  moved_out: 'text-blue-400 bg-blue-500/10',
  missing:   'text-amber-400 bg-amber-500/10',
};

export function TenantsTable({ tenants, onRowClick, loading }: TenantsTableProps) {
  const [sortKey, setSortKey]     = useState<SortKey>('full_name');
  const [sortDir, setSortDir]     = useState<'asc' | 'desc'>('asc');

  const handleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    else { setSortKey(key); setSortDir('asc'); }
  };

  const sorted = [...tenants].sort((a, b) => {
    const av = a[sortKey] ?? '';
    const bv = b[sortKey] ?? '';
    return sortDir === 'asc' ? String(av).localeCompare(String(bv)) : String(bv).localeCompare(String(av));
  });

  const SortIcon = ({ col }: { col: SortKey }) =>
    sortKey === col
      ? sortDir === 'asc'
        ? <ChevronUp   className="w-3 h-3 text-amber-400" />
        : <ChevronDown className="w-3 h-3 text-amber-400" />
      : <ChevronUp className="w-3 h-3 text-white/20" />;

  const COLS: { key: SortKey; label: string }[] = [
    { key: 'full_name',   label: 'Tenant'     },
    { key: 'room_number', label: 'Room'       },
    { key: 'status',      label: 'Status'     },
    { key: 'moved_in',    label: 'Moved In'   },
  ];

  if (loading) {
    return (
      <div className="bg-[#0F1C2E] border border-white/10 rounded-xl overflow-hidden">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="h-12 border-b border-white/5 animate-pulse bg-white/2" />
        ))}
      </div>
    );
  }

  const ariaSort = (col: SortKey): React.AriaAttributes['aria-sort'] =>
    sortKey === col ? (sortDir === 'asc' ? 'ascending' : 'descending') : 'none';

  return (
    <div className="bg-[#0F1C2E] border border-white/10 rounded-xl overflow-hidden">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-white/10">
            {COLS.map(({ key, label }) => (
              <th
                key={key}
                onClick={() => handleSort(key)}
                aria-sort={ariaSort(key)}
                className="px-4 py-3 text-left text-white/40 text-xs font-medium uppercase tracking-wider cursor-pointer hover:text-white/70 transition-colors"
              >
                <span className="flex items-center gap-1">
                  {label} <SortIcon col={key} />
                </span>
              </th>
            ))}
            <th className="px-4 py-3 text-left text-white/40 text-xs font-medium uppercase tracking-wider">
              Benefit
            </th>
            <th className="px-4 py-3 text-left text-white/40 text-xs font-medium uppercase tracking-wider w-8">
              Risk
            </th>
          </tr>
        </thead>
        <tbody>
          {sorted.length === 0 && (
            <tr>
              <td colSpan={6} className="px-4 py-8 text-center text-white/30 text-sm">
                No tenants found.
              </td>
            </tr>
          )}
          {sorted.map((t) => (
            <tr
              key={t.id}
              onClick={() => onRowClick?.(t)}
              aria-label={`Open ${t.full_name}`}
              className="border-b border-white/5 hover:bg-white/3 cursor-pointer transition-colors group"
            >
              <td className="px-4 py-3 text-white font-medium group-hover:text-amber-400 transition-colors">
                {t.full_name}
              </td>
              <td className="px-4 py-3 text-white/60 font-[JetBrains_Mono,monospace] text-xs">
                {t.room_number}
              </td>
              <td className="px-4 py-3">
                <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full capitalize ${STATUS_COLOUR[t.status] ?? STATUS_COLOUR.inactive}`}>
                  {t.status.replace('_', ' ')}
                </span>
              </td>
              <td className="px-4 py-3 text-white/40 text-xs">
                {t.moved_in ? new Date(t.moved_in).toLocaleDateString('en-GB') : '—'}
              </td>
              <td className="px-4 py-3 text-white/50 text-xs">{t.benefit_type}</td>
              <td className="px-4 py-3">
                {t.ai_risk_flag && (
                  <AlertTriangle className="w-4 h-4 text-red-400" aria-label="AI risk flag" role="img" />
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
