// Generic headless table — domain tables (TenantsTable, AuditTable) compose on top of this.

interface Column<T> {
  key: keyof T | string;
  header: string;
  /** Optional render override — defaults to String(row[key]) */
  render?: (row: T, i: number) => React.ReactNode;
  className?: string;
  headerClassName?: string;
}

interface TableProps<T> {
  columns: Column<T>[];
  rows: T[];
  keyExtractor: (row: T, i: number) => string | number;
  onRowClick?: (row: T) => void;
  emptyState?: React.ReactNode;
  className?: string;
  stickyHeader?: boolean;
}

export function Table<T>({
  columns, rows, keyExtractor, onRowClick, emptyState, className = '', stickyHeader,
}: TableProps<T>) {
  return (
    <div className={`overflow-x-auto rounded-xl border border-white/10 ${className}`}>
      <table className="w-full text-sm border-collapse">
        <thead className={`${stickyHeader ? 'sticky top-0 z-10' : ''} bg-white/5`}>
          <tr>
            {columns.map((col) => (
              <th
                key={String(col.key)}
                className={`px-4 py-3 text-left text-xs font-semibold text-white/40 uppercase tracking-wider whitespace-nowrap ${col.headerClassName ?? ''}`}
              >
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-white/5">
          {rows.length === 0 ? (
            <tr>
              <td colSpan={columns.length}>
                {emptyState ?? (
                  <p className="text-center text-white/30 text-xs py-10">No records found.</p>
                )}
              </td>
            </tr>
          ) : (
            rows.map((row, i) => (
              <tr
                key={keyExtractor(row, i)}
                onClick={() => onRowClick?.(row)}
                {...(onRowClick && {
                  role: 'button' as const,
                  tabIndex: 0,
                  onKeyDown: (e: React.KeyboardEvent) => { if (e.key === 'Enter' || e.key === ' ') onRowClick(row); },
                })}
                className={`
                  transition-colors
                  ${onRowClick ? 'cursor-pointer hover:bg-white/5' : ''}
                `}
              >
                {columns.map((col) => (
                  <td
                    key={String(col.key)}
                    className={`px-4 py-3 text-white/70 whitespace-nowrap ${col.className ?? ''}`}
                  >
                    {col.render
                      ? col.render(row, i)
                      : String((row as Record<string, unknown>)[String(col.key)] ?? '—')
                    }
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
