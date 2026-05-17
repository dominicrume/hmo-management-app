interface BadgeProps {
  label: string;
  variant?: 'default' | 'success' | 'warning' | 'danger' | 'info' | 'muted';
}

const VARIANTS: Record<string, string> = {
  default: 'text-white/60 bg-white/10',
  success: 'text-green-400 bg-green-500/10',
  warning: 'text-amber-400 bg-amber-500/10',
  danger:  'text-red-400 bg-red-500/10',
  info:    'text-blue-400 bg-blue-500/10',
  muted:   'text-white/30 bg-white/5',
};

export function Badge({ label, variant = 'default' }: BadgeProps) {
  return (
    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${VARIANTS[variant]}`}>
      {label}
    </span>
  );
}
