'use client';

import { Shield, AlertTriangle, CheckCircle, Clock } from 'lucide-react';

interface TenantCardProps {
  id: string;
  fullName: string;
  roomNumber: string;
  status: 'active' | 'inactive' | 'evicted' | 'moved_out' | 'missing';
  riskFlag?: boolean;
  benefitType?: string;
  movedIn?: string;
  workerName?: string;
  onClick?: () => void;
}

const STATUS_CONFIG = {
  active:    { label: 'Active',    colour: 'text-green-400 bg-green-500/10' },
  inactive:  { label: 'Inactive',  colour: 'text-white/40 bg-white/5' },
  evicted:   { label: 'Evicted',   colour: 'text-red-400 bg-red-500/10' },
  moved_out: { label: 'Moved Out', colour: 'text-blue-400 bg-blue-500/10' },
  missing:   { label: 'Missing',   colour: 'text-amber-400 bg-amber-500/10' },
};

export function TenantCard({
  fullName, roomNumber, status, riskFlag,
  benefitType, movedIn, workerName, onClick,
}: TenantCardProps) {
  const cfg = STATUS_CONFIG[status] ?? STATUS_CONFIG.inactive;
  const initials = fullName.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase();

  return (
    <div
      onClick={onClick}
      role="button"
      tabIndex={0}
      aria-label={`View tenant ${fullName}, room ${roomNumber}`}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') onClick?.(); }}
      className="bg-[#0F1C2E] border border-white/10 rounded-xl p-4 flex items-start gap-3 cursor-pointer hover:border-amber-500/40 transition-colors group"
    >
      {/* Avatar */}
      <div className="w-10 h-10 rounded-full bg-amber-500/20 flex items-center justify-center text-amber-400 font-bold text-sm shrink-0">
        {initials}
      </div>

      {/* Details */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="text-white font-medium text-sm truncate group-hover:text-amber-400 transition-colors">
            {fullName}
          </p>
          {riskFlag && <AlertTriangle className="w-3.5 h-3.5 text-red-400 shrink-0" />}
        </div>

        <p className="text-white/40 text-xs mt-0.5">{roomNumber}</p>

        <div className="flex items-center gap-2 mt-2 flex-wrap">
          <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${cfg.colour}`}>
            {cfg.label}
          </span>
          {benefitType && benefitType !== 'None' && (
            <span className="text-[10px] text-white/40 bg-white/5 px-2 py-0.5 rounded-full flex items-center gap-1">
              <CheckCircle className="w-3 h-3" /> {benefitType}
            </span>
          )}
          {movedIn && (
            <span className="text-[10px] text-white/30 flex items-center gap-1">
              <Clock className="w-3 h-3" /> {movedIn}
            </span>
          )}
        </div>

        {workerName && (
          <p className="text-white/30 text-[10px] mt-1.5 flex items-center gap-1">
            <Shield className="w-3 h-3" /> {workerName}
          </p>
        )}
      </div>
    </div>
  );
}
