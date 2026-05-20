// Tenant context builder — assembles the full data package the AI needs.
// All three AI routes pull from this single function — no duplication.

import { createServiceClient } from '@/lib/supabase/server';

export interface TenantContext {
  tenantId:      string;
  profile:       Record<string, unknown> | null;
  sessions:      Record<string, unknown>[];
  charges:       Record<string, unknown>[];
  verifications: Record<string, unknown>[];
  claims:        Record<string, unknown>[];
}

/**
 * Fetches all data required to give the AI a complete picture of a tenant.
 * Uses the service client so RLS doesn't block cross-table reads.
 */
export async function buildTenantContext(tenantId: string): Promise<TenantContext> {
  const svc = createServiceClient();

  const [
    { data: profile },
    { data: sessions },
    { data: charges },
    { data: verifications },
    { data: claims },
  ] = await Promise.all([
    svc.from('tenants').select('*').eq('id', tenantId).single(),
    svc.from('sessions')
      .select('session_date, session_type, notes, ai_summary, ai_risk_flag, ai_risk_note, checklist_items')
      .eq('tenant_id', tenantId)
      .order('session_date', { ascending: false })
      .limit(20),
    svc.from('service_charges')
      .select('period_start, period_end, amount_due, amount_paid, is_paid, payment_method, description')
      .eq('tenant_id', tenantId)
      .order('period_start', { ascending: false })
      .limit(12),
    svc.from('tenant_verifications')
      .select('verification_type, signed_at, verified_by_tenant')
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: false })
      .limit(5),
    svc.from('claims')
      .select('type, status, title, description, created_at')
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: false })
      .limit(10),
  ]);

  return {
    tenantId,
    profile:       profile ?? null,
    sessions:      (sessions ?? []) as Record<string, unknown>[],
    charges:       (charges  ?? []) as Record<string, unknown>[],
    verifications: (verifications ?? []) as Record<string, unknown>[],
    claims:        (claims ?? []) as Record<string, unknown>[],
  };
}

/** Formats the context as a readable string block for injection into prompts */
export function formatContextBlock(ctx: TenantContext): string {
  const p = ctx.profile ?? {};
  const chargesUnpaid = ctx.charges.filter((c) => !c.is_paid);
  const totalUnpaid   = chargesUnpaid.reduce((s, c) => s + ((c.amount_due as number) - (c.amount_paid as number)), 0);
  const riskSessions  = ctx.sessions.filter((s) => s.ai_risk_flag);

  return `## Tenant Profile
Name: ${p.full_name} | Room: ${p.room_number} | Status: ${p.status}
DOB: ${p.dob} | NINO: ${p.nino} | Nationality: ${p.nationality}
Move-in: ${p.moved_in} | Brand: ${p.brand}
Benefits: ${p.benefit_type} (${p.benefit_freq}) £${p.benefit_amount}/period
Next of Kin: ${p.nok_name} (${p.nok_relation}) — ${p.nok_phone}
On Probation: ${p.on_probation ? `YES — Officer: ${p.probation_officer ?? 'unknown'}` : 'No'}
Confidentiality Signed: ${p.confidentiality_signed ? 'Yes' : 'No'}

## Risk Summary
⚠️  ${riskSessions.length} session(s) with AI risk flags
💸  ${chargesUnpaid.length} unpaid charge(s) — £${totalUnpaid.toFixed(2)} outstanding

## Recent Sessions (${ctx.sessions.length} total)
${ctx.sessions.map((s) =>
  `[${s.session_date} — ${s.session_type}${s.ai_risk_flag ? ' ⚠️ RISK' : ''}]\n${s.notes ?? s.ai_summary ?? 'No notes.'}`
).join('\n\n') || 'No sessions recorded.'}

## Service Charges (${ctx.charges.length} total)
${ctx.charges.map((c) =>
  `${c.period_start} → ${c.period_end}: £${c.amount_due} due — ${c.is_paid ? '✅ Paid' : `❌ UNPAID (£${(c.amount_due as number) - (c.amount_paid as number)} owed)`} via ${c.payment_method}`
).join('\n') || 'No charges recorded.'}

## Active Claims (${ctx.claims.length} total)
${ctx.claims.map((c) => `[${c.status}] ${c.type}: ${c.title}`).join('\n') || 'No claims on record.'}

## Verifications
${ctx.verifications.map((v) =>
  `${v.verification_type} — ${v.signed_at ? `signed ${v.signed_at}` : 'NOT YET SIGNED'} — tenant confirmed: ${v.verified_by_tenant}`
).join('\n') || 'No verifications recorded.'}`;
}
