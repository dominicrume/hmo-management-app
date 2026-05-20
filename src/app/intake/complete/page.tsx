'use client';

export const dynamic = 'force-dynamic';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient as createBrowserClient } from '@/lib/supabase/client';
import { CheckCircle2, Link as LinkIcon, Brain, Printer, Users, Home } from 'lucide-react';
import Link from 'next/link';
import type { DbTenant, DbAuditLog } from '@/types/database';

export default function IntakeCompletePage() {
  const router  = useRouter();
  const [tenant,    setTenant]    = useState<DbTenant | null>(null);
  const [auditLog,  setAuditLog]  = useState<DbAuditLog | null>(null);
  const [loading,   setLoading]   = useState(true);

  useEffect(() => {
    const tenantId = sessionStorage.getItem('intake_tenant_id');
    if (!tenantId) { router.replace('/intake/new'); return; }

    const supabase = createBrowserClient();

    Promise.all([
      supabase.from('tenants').select('*').eq('id', tenantId).single(),
      supabase.from('audit_logs')
        .select('*')
        .eq('tenant_id', tenantId)
        .eq('action', 'CREATE')
        .order('stamped_at', { ascending: false })
        .limit(1)
        .single(),
    ]).then(([{ data: t }, { data: a }]) => {
      setTenant(t as DbTenant | null);
      setAuditLog(a as DbAuditLog | null);
      setLoading(false);
      // Clear intake sessionStorage
      ['intake_mode','intake_brand','intake_filename','intake_file_b64',
       'intake_ocr_fields','intake_raw_text'].forEach((k) => sessionStorage.removeItem(k));
    });
  }, [router]);

  if (loading) {
    return (
      <div className="min-h-screen bg-navy flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-amber border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-navy flex flex-col items-center justify-center px-4 py-10">
      <div className="w-full max-w-lg space-y-5">

        {/* Success badge */}
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-emerald-500/20 mb-4">
            <CheckCircle2 className="w-8 h-8 text-emerald-400" />
          </div>
          <h1 className="text-white font-black text-xl">Intake Complete</h1>
          <p className="text-slate-400 text-sm mt-1">
            {tenant?.full_name ?? 'Tenant'} has been registered and their record blockchain-stamped.
          </p>
        </div>

        {/* Tenant summary card */}
        {tenant && (
          <div className="bg-navy-light border border-navy-border rounded-2xl p-5 space-y-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-amber flex items-center justify-center
                              text-navy font-black text-sm flex-shrink-0">
                {tenant.full_name.split(' ').slice(0, 2).map((n) => n[0]).join('').toUpperCase()}
              </div>
              <div>
                <p className="text-white font-bold text-sm">{tenant.full_name}</p>
                <p className="text-slate-400 text-xxs">Room {tenant.room_number} · {tenant.status}</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3 pt-2 border-t border-navy-border">
              {[
                ['NINO',       tenant.nino],
                ['Mobile',     tenant.mobile],
                ['Move-in',    tenant.moved_in],
                ['Brand',      tenant.brand.replace('_', ' ')],
              ].map(([l, v]) => (
                <div key={l}>
                  <p className="text-xxs text-slate-500 uppercase font-semibold tracking-wider">{l}</p>
                  <p className="text-white text-xs font-mono mt-0.5">{v}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Blockchain stamp */}
        {auditLog ? (
          <div className="bg-emerald-900/20 border border-emerald-700/30 rounded-2xl p-5">
            <div className="flex items-center gap-2 mb-3">
              <LinkIcon className="w-4 h-4 text-emerald-400" />
              <p className="text-emerald-400 text-xs font-black uppercase tracking-wider">Blockchain Stamp Confirmed</p>
            </div>
            <div className="space-y-2">
              <div>
                <p className="text-xxs text-slate-500 uppercase tracking-wider">SHA-256 Hash</p>
                <p className="text-emerald-300 text-xxs font-mono mt-1 break-all leading-relaxed">
                  {auditLog.payload_hash}
                </p>
              </div>
              <div className="grid grid-cols-2 gap-3 pt-2 border-t border-emerald-700/20">
                <div>
                  <p className="text-xxs text-slate-500 uppercase tracking-wider">Stamped By</p>
                  <p className="text-white text-xxs mt-0.5">{auditLog.actor_name}</p>
                </div>
                <div>
                  <p className="text-xxs text-slate-500 uppercase tracking-wider">Stamped At</p>
                  <p className="text-white text-xxs mt-0.5 font-mono">
                    {new Date(auditLog.stamped_at).toLocaleString('en-GB')}
                  </p>
                </div>
                <div>
                  <p className="text-xxs text-slate-500 uppercase tracking-wider">Entry Method</p>
                  <p className="text-white text-xxs mt-0.5 uppercase">{auditLog.entry_method}</p>
                </div>
                <div>
                  <p className="text-xxs text-slate-500 uppercase tracking-wider">Phase 2</p>
                  <p className="text-slate-500 text-xxs mt-0.5">Polygon ERC-721 · Coming</p>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-navy-light border border-navy-border rounded-2xl p-5">
            <div className="flex items-center gap-2 mb-2">
              <LinkIcon className="w-4 h-4 text-amber" />
              <p className="text-amber text-xs font-black uppercase tracking-wider">Blockchain Stamp — Processing</p>
            </div>
            <p className="text-slate-400 text-xxs font-mono">
              SHA-256 hash is being computed and written to the audit trail. Refresh the Audit Log in a moment to view the stamp.
            </p>
          </div>
        )}

        {/* Next actions */}
        <div className="grid grid-cols-2 gap-3">
          <Link
            href="/intake/new"
            className="flex items-center justify-center gap-2 px-4 py-3 bg-navy-light border
                       border-navy-border rounded-xl text-xs font-bold text-slate-300
                       hover:text-white hover:border-slate-500 transition-colors"
          >
            <Users className="w-4 h-4" />
            Add Another Tenant
          </Link>
          <Link
            href="/dashboard"
            className="flex items-center justify-center gap-2 px-4 py-3 bg-amber text-navy
                       rounded-xl text-xs font-black hover:bg-amber-light transition-colors"
          >
            <Home className="w-4 h-4" />
            Back to Dashboard
          </Link>
          <Link
            href={tenant ? `/dashboard?tenant=${tenant.id}&form=ai-brain` : '/dashboard'}
            className="flex items-center justify-center gap-2 px-4 py-3 bg-navy-light border
                       border-navy-border rounded-xl text-xs font-bold text-slate-300
                       hover:text-white hover:border-slate-500 transition-colors"
          >
            <Brain className="w-4 h-4" />
            Open AI Brain
          </Link>
          <button
            type="button"
            onClick={() => window.print()}
            className="flex items-center justify-center gap-2 px-4 py-3 bg-navy-light border
                       border-navy-border rounded-xl text-xs font-bold text-slate-300
                       hover:text-white hover:border-slate-500 transition-colors"
          >
            <Printer className="w-4 h-4" />
            Print Record
          </button>
        </div>
      </div>
    </div>
  );
}
