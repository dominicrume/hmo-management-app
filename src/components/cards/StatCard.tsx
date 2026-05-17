'use client';

import { TrendingUp, TrendingDown } from 'lucide-react';

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon?: React.ReactNode;
  trend?: { value: number; label: string };
  variant?: 'default' | 'warning' | 'danger' | 'success';
  onClick?: () => void;
}

const VARIANT_STYLES: Record<string, string> = {
  default: 'border-white/10',
  warning: 'border-amber-500/40 bg-amber-500/5',
  danger:  'border-red-500/40  bg-red-500/5',
  success: 'border-green-500/40 bg-green-500/5',
};

const VARIANT_VALUE: Record<string, string> = {
  default: 'text-white',
  warning: 'text-amber-400',
  danger:  'text-red-400',
  success: 'text-green-400',
};

export function StatCard({
  title, value, subtitle, icon, trend, variant = 'default', onClick,
}: StatCardProps) {
  return (
    <div
      onClick={onClick}
      {...(onClick && {
        role: 'button' as const,
        tabIndex: 0,
        'aria-label': String(title),
        onKeyDown: (e: React.KeyboardEvent) => { if (e.key === 'Enter' || e.key === ' ') onClick(); },
      })}
      className={`
        bg-[#0F1C2E] border rounded-xl p-4 flex flex-col gap-3
        ${VARIANT_STYLES[variant]}
        ${onClick ? 'cursor-pointer hover:border-amber-500/40 transition-colors' : ''}
      `}
    >
      <div className="flex items-start justify-between">
        <p className="text-white/50 text-xs font-medium uppercase tracking-wider">{title}</p>
        {icon && (
          <span className="text-white/30">{icon}</span>
        )}
      </div>

      <div>
        <p className={`text-3xl font-bold font-[JetBrains_Mono,monospace] ${VARIANT_VALUE[variant]}`}>
          {value}
        </p>
        {subtitle && (
          <p className="text-white/40 text-xs mt-0.5">{subtitle}</p>
        )}
      </div>

      {trend && (
        <div className="flex items-center gap-1">
          {trend.value >= 0
            ? <TrendingUp   className="w-3 h-3 text-green-400" />
            : <TrendingDown className="w-3 h-3 text-red-400"   />
          }
          <span className={`text-xs ${trend.value >= 0 ? 'text-green-400' : 'text-red-400'}`}>
            {trend.value >= 0 ? '+' : ''}{trend.value}%
          </span>
          <span className="text-white/30 text-xs">{trend.label}</span>
        </div>
      )}
    </div>
  );
}
