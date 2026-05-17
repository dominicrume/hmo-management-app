import { Loader2 } from 'lucide-react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  icon?: React.ReactNode;
}

const VARIANTS: Record<string, string> = {
  primary:   'bg-amber-500 hover:bg-amber-600 text-white',
  secondary: 'bg-white/10 hover:bg-white/15 text-white',
  ghost:     'bg-transparent hover:bg-white/5 text-white/60 hover:text-white',
  danger:    'bg-red-600 hover:bg-red-700 text-white',
};

const SIZES: Record<string, string> = {
  sm: 'px-3 py-1.5 text-xs',
  md: 'px-4 py-2 text-sm',
  lg: 'px-5 py-2.5 text-base',
};

export function Button({
  variant = 'primary', size = 'md', loading, icon, children, disabled, className = '', ...props
}: ButtonProps) {
  return (
    <button
      {...props}
      disabled={disabled || loading}
      className={`
        inline-flex items-center gap-2 font-medium rounded-lg transition-colors
        disabled:opacity-40 disabled:cursor-not-allowed
        ${VARIANTS[variant]} ${SIZES[size]} ${className}
      `}
    >
      {loading
        ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
        : icon
      }
      {children}
    </button>
  );
}
