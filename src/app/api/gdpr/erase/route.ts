import { NextRequest }                         from 'next/server';
import { withApi }                             from '@/lib/api/middleware';
import { apiOk, apiBadRequest }                from '@/lib/api/response';
import { validate, firstError }                from '@/lib/api/validate';
import { eraseTenantPII }                      from '@/lib/compliance/gdpr';
import { createServiceClient }                 from '@/lib/supabase/server';
import type { AuthContext }                    from '@/lib/security/rbac';

// POST /api/gdpr/erase — GDPR Art. 17 Right to Erasure (Manager only).
// Anonymises PII fields. Cannot erase audit logs (legal hold).
// Requires confirmation_text = "ERASE TENANT DATA" to prevent accidents.
export const POST = withApi({ permission: 'user:manage', rateLimit: 'api' }, async (req: NextRequest, ctx: AuthContext) => {
  const body = await req.json();
  const err  = firstError(validate(body, {
    tenant_id:         { type: 'uuid',   required: true },
    reason:            { type: 'string', required: true, minLength: 10, maxLength: 500 },
    confirmation_text: { type: 'string', required: true },
  }));
  if (err) return apiBadRequest(err);

  if (body.confirmation_text !== 'ERASE TENANT DATA') {
    return apiBadRequest('confirmation_text must be exactly "ERASE TENANT DATA"');
  }

  const svc = createServiceClient();

  // Create pending DSR before erasure
  const { data: dsr } = await svc.from('data_subject_requests').insert({
    tenant_id:    body.tenant_id,
    type:         'erasure',
    status:       'in_review',
    requested_by: ctx.dbUser.id,
    request_notes: body.reason,
  }).select('id').single();

  const result = await eraseTenantPII(
    body.tenant_id,
    ctx.dbUser.id,
    ctx.dbUser.full_name,
    ctx.dbUser.role,
    body.reason,
  );

  // Mark DSR completed
  if (dsr?.id) {
    await svc.from('data_subject_requests')
      .update({ status: 'completed', handled_by: ctx.dbUser.id, completed_at: new Date().toISOString(), handler_notes: `Anonymised ${result.anonymised_fields.length} fields` })
      .eq('id', dsr.id);
  }

  return apiOk({
    ...result,
    tenant_id: body.tenant_id,
    notice: 'PII anonymised. Audit logs, financial records, and blockchain stamps are retained under legal obligation (7-year housing law requirement).',
  });
});
