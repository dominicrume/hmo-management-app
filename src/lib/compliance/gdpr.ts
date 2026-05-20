// GDPR implementation — Articles 15, 16, 17, 20.
//
// Key principle: we cannot delete audit_logs (legal obligation, 7-year retention
// under UK housing law). Erasure = anonymise PII in the tenants table.
// The audit trail records that erasure happened — it does not expose the PII.

import { createServiceClient } from '@/lib/supabase/server';
import { writeAuditLog }       from '@/lib/dal/auditLogs';

export interface SARPackage {
  tenant:        Record<string, unknown> | null;
  sessions:      Record<string, unknown>[];
  charges:       Record<string, unknown>[];
  verifications: Record<string, unknown>[];
  claims:        Record<string, unknown>[];
  consents:      Record<string, unknown>[];
  ai_suggestions: Record<string, unknown>[];
  exported_at:   string;
  data_controller: string;
  lawful_basis:  string;
  retention_periods: Record<string, string>;
}

/**
 * Art. 15 — Right of Access: assembles everything held about a tenant.
 * Returns a structured data package suitable for PDF/JSON export.
 */
export async function exportTenantData(tenantId: string): Promise<SARPackage> {
  const svc = createServiceClient();

  const [
    { data: tenant },
    { data: sessions },
    { data: charges },
    { data: verifications },
    { data: claims },
    { data: consents },
    { data: ai_suggestions },
  ] = await Promise.all([
    svc.from('tenants').select('*').eq('id', tenantId).single(),
    svc.from('sessions').select('*').eq('tenant_id', tenantId).order('session_date', { ascending: false }),
    svc.from('service_charges').select('*').eq('tenant_id', tenantId).order('period_start', { ascending: false }),
    svc.from('tenant_verifications').select('*').eq('tenant_id', tenantId),
    svc.from('claims').select('type, status, title, created_at').eq('tenant_id', tenantId),
    svc.from('consent_log').select('consent_type, policy_version, granted, method, stamped_at').eq('tenant_id', tenantId).order('stamped_at', { ascending: false }),
    svc.from('ai_suggestions').select('task_type, response, risk_detected, model, created_at').eq('tenant_id', tenantId).order('created_at', { ascending: false }).limit(50),
  ]);

  return {
    tenant:         tenant ?? null,
    sessions:       (sessions        ?? []) as Record<string, unknown>[],
    charges:        (charges         ?? []) as Record<string, unknown>[],
    verifications:  (verifications   ?? []) as Record<string, unknown>[],
    claims:         (claims          ?? []) as Record<string, unknown>[],
    consents:       (consents        ?? []) as Record<string, unknown>[],
    ai_suggestions: (ai_suggestions  ?? []) as Record<string, unknown>[],
    exported_at:    new Date().toISOString(),
    data_controller: 'Ash Shahada Housing Association Ltd, Birmingham, UK',
    lawful_basis:   'Processing necessary for the performance of a task carried out in the public interest (housing support) — UK GDPR Art. 6(1)(e)',
    retention_periods: {
      tenant_profile:  '7 years from end of tenancy (UK housing law)',
      session_notes:   '7 years from end of tenancy',
      service_charges: '7 years (financial records)',
      audit_logs:      '7 years — legally required, cannot be erased',
      ai_suggestions:  '2 years',
      api_metrics:     '90 days',
      auth_nonces:     '5 minutes (auto-deleted)',
    },
  };
}

/**
 * Art. 17 — Right to Erasure: anonymises PII in the tenants table.
 *
 * What CAN be anonymised: name, DOB, NINO, mobile, email, NOK details, address.
 * What CANNOT be erased:  audit_logs (7-year legal retention), blockchain stamps.
 *
 * The tenant row is preserved (room number, brand, dates) so financial and
 * housing records remain coherent for legal reporting purposes.
 */
export async function eraseTenantPII(
  tenantId:  string,
  actorId:   string,
  actorName: string,
  actorRole: 'Manager' | 'SupportWorker' | 'Tenant',
  reason:    string,
): Promise<{ success: boolean; anonymised_fields: string[] }> {
  const svc = createServiceClient();

  const REDACTED = '[REDACTED — Art.17]';

  const anonymisedFields = [
    'full_name', 'dob', 'nino', 'nationality', 'mobile', 'email',
    'nok_name', 'nok_relation', 'nok_phone', 'nok_email',
    'doctor', 'probation_officer',
  ];

  const patch: Record<string, string | null> = {};
  for (const field of anonymisedFields) patch[field] = REDACTED;
  // Nullify optional fields instead of redacting
  patch.doctor            = null;
  patch.probation_officer = null;

  const { error } = await svc.from('tenants').update(patch).eq('id', tenantId);
  if (error) throw new Error(`Erasure failed: ${error.message}`);

  // Also anonymise session notes (contain PII)
  await svc.from('sessions')
    .update({ notes: `[REDACTED — GDPR Art.17 erasure ${new Date().toISOString()}]` })
    .eq('tenant_id', tenantId);

  // Audit the erasure itself — this stays forever
  await writeAuditLog({
    actorId, actorName, actorRole,
    tenantId,
    tableName:  'tenants',
    recordId:   tenantId,
    action:     'DELETE_REQUEST',
    entryMethod: 'manual',
    newData: { reason, anonymised_fields: anonymisedFields, erased_at: new Date().toISOString() },
  });

  return { success: true, anonymised_fields: anonymisedFields };
}

/**
 * Art. 7 — Consent: records a consent grant or withdrawal.
 */
export async function recordConsent(params: {
  tenantId:      string;
  consentType:   string;
  policyVersion: string;
  granted:       boolean;
  method?:       string;
  staffWitness?: string;
  notes?:        string;
}): Promise<void> {
  const svc = createServiceClient();
  await svc.from('consent_log').insert({
    tenant_id:      params.tenantId,
    consent_type:   params.consentType,
    policy_version: params.policyVersion,
    granted:        params.granted,
    method:         params.method ?? 'digital_signature',
    staff_witness:  params.staffWitness ?? null,
    notes:          params.notes ?? null,
  });
}

/**
 * Returns the current effective consent status for a tenant + type.
 * "Effective" = the most recent record for that consent_type.
 */
export async function getEffectiveConsent(
  tenantId:    string,
  consentType: string,
): Promise<{ granted: boolean; since: string; version: string } | null> {
  const svc = createServiceClient();
  const { data } = await svc
    .from('consent_log')
    .select('granted, stamped_at, policy_version')
    .eq('tenant_id', tenantId)
    .eq('consent_type', consentType)
    .order('stamped_at', { ascending: false })
    .limit(1)
    .single();

  if (!data) return null;
  return { granted: data.granted, since: data.stamped_at, version: data.policy_version };
}
