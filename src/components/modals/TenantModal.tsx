'use client';

import { X, User, Home, ShieldCheck, AlertTriangle } from 'lucide-react';

interface Tenant {
  id: string;
  full_name: string;
  room_number: string;
  email?: string;
  mobile: string;
  status: string;
  benefit_type: string;
  benefit_amount: number;
  moved_in: string;
  nok_name: string;
  nok_phone: string;
  ai_risk_flag?: boolean;
  confidentiality_signed: boolean;
}

interface TenantModalProps {
  tenant: Tenant | null;
  open: boolean;
  onClose: () => void;
  onOpenForms?: (tenantId: string) => void;
}

export function TenantModal({ tenant, open, onClose, onOpenForms }: TenantModalProps) {
  if (!open || !tenant) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      <div className="relative bg-[#0F1C2E] border border-white/10 rounded-2xl shadow-2xl w-full max-w-lg mx-4 overflow-hidden">
        {/* Header */}
        <div className="flex items-center gap-3 px-6 py-4 border-b border-white/10">
          <div className="w-10 h-10 rounded-full bg-amber-500/20 flex items-center justify-center text-amber-400 font-bold">
            {tenant.full_name.charAt(0).toUpperCase()}
          </div>
          <div className="flex-1">
            <h2 className="text-white font-semibold">{tenant.full_name}</h2>
            <p className="text-white/40 text-xs">{tenant.room_number}</p>
          </div>
          {tenant.ai_risk_flag && (
            <span className="flex items-center gap-1 text-red-400 text-xs bg-red-500/10 px-2 py-1 rounded-full">
              <AlertTriangle className="w-3 h-3" /> Risk Flag
            </span>
          )}
          <button type="button" aria-label="Close" onClick={onClose} className="text-white/30 hover:text-white transition-colors ml-2">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-4 grid grid-cols-2 gap-4 text-sm max-h-[60vh] overflow-y-auto">
          <Detail icon={<User className="w-3.5 h-3.5" />} label="Mobile"   value={tenant.mobile} />
          <Detail icon={<User className="w-3.5 h-3.5" />} label="Email"    value={tenant.email ?? '—'} />
          <Detail icon={<Home className="w-3.5 h-3.5" />} label="Benefit"  value={`${tenant.benefit_type} — £${tenant.benefit_amount}`} />
          <Detail icon={<Home className="w-3.5 h-3.5" />} label="Moved In" value={new Date(tenant.moved_in).toLocaleDateString('en-GB')} />
          <Detail icon={<User className="w-3.5 h-3.5" />} label="NOK"      value={`${tenant.nok_name} · ${tenant.nok_phone}`} />
          <Detail
            icon={<ShieldCheck className="w-3.5 h-3.5" />}
            label="Confidentiality"
            value={tenant.confidentiality_signed ? 'Signed' : 'Pending'}
            highlight={!tenant.confidentiality_signed}
          />
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-white/10 flex justify-end gap-2">
          <button type="button" aria-label="Close modal" onClick={onClose} className="px-4 py-2 text-sm text-white/50 hover:text-white bg-white/5 hover:bg-white/10 rounded-lg transition-colors">
            Close
          </button>
          {onOpenForms && (
            <button
              type="button"
              aria-label={`Open forms for ${tenant.full_name}`}
              onClick={() => { onClose(); onOpenForms(tenant.id); }}
              className="px-4 py-2 text-sm text-white font-medium bg-amber-500 hover:bg-amber-600 rounded-lg transition-colors"
            >
              Open Forms
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function Detail({ icon, label, value, highlight }: {
  icon: React.ReactNode; label: string; value: string; highlight?: boolean;
}) {
  return (
    <div>
      <p className="text-white/30 text-[10px] uppercase tracking-wider flex items-center gap-1 mb-0.5">
        {icon} {label}
      </p>
      <p className={`text-xs font-medium ${highlight ? 'text-amber-400' : 'text-white/80'}`}>
        {value}
      </p>
    </div>
  );
}
