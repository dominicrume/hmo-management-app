import { Loader2 } from 'lucide-react';

// ── Spinner ───────────────────────────────────────────────────────────────────

interface SpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const SPIN_SIZE: Record<string, string> = {
  sm: 'w-4 h-4',
  md: 'w-6 h-6',
  lg: 'w-8 h-8',
};

export function Spinner({ size = 'md', className = '' }: SpinnerProps) {
  return (
    <Loader2
      className={`animate-spin text-amber-400 ${SPIN_SIZE[size]} ${className}`}
      aria-hidden="true"
    />
  );
}

// ── Full-page loader ──────────────────────────────────────────────────────────

export function PageLoader({ label = 'Loading…' }: { label?: string }) {
  return (
    <div className="flex flex-col items-center justify-center flex-1 min-h-[200px] gap-3" role="status" aria-label={label}>
      <Spinner size="lg" />
      <span className="text-white/30 text-xs">{label}</span>
    </div>
  );
}

// ── Skeleton block ────────────────────────────────────────────────────────────

interface SkeletonProps {
  /** Tailwind height class e.g. "h-4" */
  height?: string;
  /** Tailwind width class e.g. "w-32" or "w-full" */
  width?: string;
  rounded?: boolean;
  className?: string;
}

export function Skeleton({ height = 'h-4', width = 'w-full', rounded, className = '' }: SkeletonProps) {
  return (
    <div
      aria-hidden="true"
      className={`animate-pulse bg-white/5 ${height} ${width} ${rounded ? 'rounded-full' : 'rounded-md'} ${className}`}
    />
  );
}

// ── Skeleton card — common pattern ────────────────────────────────────────────

export function SkeletonCard({ rows = 3 }: { rows?: number }) {
  return (
    <div className="bg-[#0F1C2E] border border-white/10 rounded-xl p-5 space-y-3" aria-hidden="true">
      <Skeleton height="h-3" width="w-24" />
      <Skeleton height="h-8" width="w-16" />
      {Array.from({ length: rows }).map((_, i) => (
        <Skeleton key={i} height="h-3" width={i % 2 === 0 ? 'w-full' : 'w-3/4'} />
      ))}
    </div>
  );
}
