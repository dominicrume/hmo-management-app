'use client';

import { useEffect } from 'react';
import { X } from 'lucide-react';

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  subtitle?: string;
  /** Max width class — defaults to max-w-lg */
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
  children: React.ReactNode;
  /** Hide the X button */
  hideClose?: boolean;
  footer?: React.ReactNode;
}

const SIZE: Record<string, string> = {
  sm:   'max-w-sm',
  md:   'max-w-lg',
  lg:   'max-w-2xl',
  xl:   'max-w-4xl',
  full: 'max-w-[95vw]',
};

export function Modal({ open, onClose, title, subtitle, size = 'md', children, hideClose, footer }: ModalProps) {
  // Close on Escape key
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={title}
      className="fixed inset-0 z-50 flex items-center justify-center px-4"
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        aria-hidden="true"
        onClick={onClose}
      />

      {/* Panel */}
      <div className={`relative bg-[#0F1C2E] border border-white/10 rounded-2xl shadow-2xl w-full ${SIZE[size]} max-h-[90vh] flex flex-col`}>

        {/* Header */}
        {(title || !hideClose) && (
          <div className="flex items-start justify-between p-6 pb-4 shrink-0">
            <div>
              {title && <h2 className="text-white font-semibold text-base">{title}</h2>}
              {subtitle && <p className="text-white/40 text-xs mt-0.5">{subtitle}</p>}
            </div>
            {!hideClose && (
              <button
                type="button"
                aria-label="Close modal"
                onClick={onClose}
                className="ml-4 text-white/30 hover:text-white transition-colors shrink-0"
              >
                <X className="w-4 h-4" aria-hidden="true" />
              </button>
            )}
          </div>
        )}

        {/* Body */}
        <div className="px-6 pb-4 overflow-y-auto flex-1 min-h-0">
          {children}
        </div>

        {/* Footer */}
        {footer && (
          <div className="px-6 py-4 border-t border-white/5 shrink-0">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}
