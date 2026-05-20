import { AlertCircle, AlertTriangle, CheckCircle2, Info, X } from 'lucide-react';

type AlertVariant = 'info' | 'success' | 'warning' | 'danger';

interface AlertProps {
  variant?: AlertVariant;
  title?: string;
  message: string;
  onDismiss?: () => void;
  className?: string;
}

const CONFIG: Record<AlertVariant, { icon: React.ElementType; bg: string; border: string; title: string; msg: string }> = {
  info:    { icon: Info,          bg: 'bg-blue-500/10',   border: 'border-blue-500/30',  title: 'text-blue-300',  msg: 'text-blue-200/70'  },
  success: { icon: CheckCircle2,  bg: 'bg-green-500/10',  border: 'border-green-500/30', title: 'text-green-300', msg: 'text-green-200/70' },
  warning: { icon: AlertTriangle, bg: 'bg-amber-500/10',  border: 'border-amber-500/30', title: 'text-amber-300', msg: 'text-amber-200/70' },
  danger:  { icon: AlertCircle,   bg: 'bg-red-500/10',    border: 'border-red-500/30',   title: 'text-red-300',   msg: 'text-red-200/70'   },
};

export function Alert({ variant = 'info', title, message, onDismiss, className = '' }: AlertProps) {
  const { icon: Icon, bg, border, title: titleCls, msg: msgCls } = CONFIG[variant];

  return (
    <div className={`flex gap-3 rounded-xl border px-4 py-3 ${bg} ${border} ${className}`} role="alert">
      <Icon className={`w-4 h-4 mt-0.5 shrink-0 ${titleCls}`} aria-hidden="true" />
      <div className="flex-1 min-w-0">
        {title && <p className={`text-xs font-semibold ${titleCls}`}>{title}</p>}
        <p className={`text-xs ${msgCls} ${title ? 'mt-0.5' : ''}`}>{message}</p>
      </div>
      {onDismiss && (
        <button
          type="button"
          aria-label="Dismiss alert"
          onClick={onDismiss}
          className="text-white/20 hover:text-white/50 transition-colors shrink-0"
        >
          <X className="w-3.5 h-3.5" aria-hidden="true" />
        </button>
      )}
    </div>
  );
}
