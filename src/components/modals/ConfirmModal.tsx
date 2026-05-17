'use client';

import { AlertTriangle, X } from 'lucide-react';

interface ConfirmModalProps {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'danger' | 'warning' | 'default';
  onConfirm: () => void;
  onCancel: () => void;
}

const VARIANT: Record<string, string> = {
  danger:  'bg-red-600 hover:bg-red-700',
  warning: 'bg-amber-500 hover:bg-amber-600',
  default: 'bg-blue-600 hover:bg-blue-700',
};

export function ConfirmModal({
  open, title, message, confirmLabel = 'Confirm',
  cancelLabel = 'Cancel', variant = 'default', onConfirm, onCancel,
}: ConfirmModalProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onCancel} />

      {/* Modal */}
      <div className="relative bg-[#0F1C2E] border border-white/10 rounded-2xl shadow-2xl w-full max-w-sm mx-4 p-6">
        <button
          type="button"
          aria-label="Cancel"
          onClick={onCancel}
          className="absolute top-4 right-4 text-white/30 hover:text-white transition-colors"
        >
          <X className="w-4 h-4" aria-hidden="true" />
        </button>

        <div className="flex items-start gap-3 mb-4">
          <AlertTriangle className={`w-5 h-5 mt-0.5 shrink-0 ${variant === 'danger' ? 'text-red-400' : 'text-amber-400'}`} />
          <div>
            <h3 className="text-white font-semibold text-base">{title}</h3>
            <p className="text-white/50 text-sm mt-1">{message}</p>
          </div>
        </div>

        <div className="flex gap-2 justify-end">
          <button
            type="button"
            aria-label={cancelLabel}
            onClick={onCancel}
            className="px-4 py-2 text-sm text-white/60 hover:text-white bg-white/5 hover:bg-white/10 rounded-lg transition-colors"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            aria-label={confirmLabel}
            onClick={onConfirm}
            className={`px-4 py-2 text-sm text-white font-medium rounded-lg transition-colors ${VARIANT[variant]}`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
