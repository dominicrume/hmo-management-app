interface CardProps {
  children: React.ReactNode;
  className?: string;
  /** Amber border accent on the left edge */
  accent?: boolean;
  /** Clickable card — adds hover state */
  onClick?: () => void;
  padding?: 'none' | 'sm' | 'md' | 'lg';
}

const PADDING: Record<string, string> = {
  none: '',
  sm:   'p-3',
  md:   'p-5',
  lg:   'p-7',
};

export function Card({ children, className = '', accent, onClick, padding = 'md' }: CardProps) {
  return (
    <div
      onClick={onClick}
      {...(onClick && {
        role: 'button' as const,
        tabIndex: 0,
        onKeyDown: (e: React.KeyboardEvent) => { if (e.key === 'Enter' || e.key === ' ') onClick(); },
      })}
      className={`
        bg-[#0F1C2E] border border-white/10 rounded-xl
        ${accent ? 'border-l-4 border-l-amber-500' : ''}
        ${onClick ? 'cursor-pointer hover:border-white/20 transition-colors' : ''}
        ${PADDING[padding]}
        ${className}
      `}
    >
      {children}
    </div>
  );
}

export function CardHeader({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`flex items-center justify-between mb-4 ${className}`}>
      {children}
    </div>
  );
}

export function CardTitle({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="text-white font-semibold text-sm">{children}</h3>
  );
}

export function CardBody({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <div className={className}>{children}</div>;
}

export function CardFooter({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`mt-4 pt-4 border-t border-white/5 ${className}`}>
      {children}
    </div>
  );
}
