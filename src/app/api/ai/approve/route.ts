import { NextRequest }                        from 'next/server';
import { withApi }                            from '@/lib/api/middleware';
import { apiOk, apiBadRequest, apiNotFound }  from '@/lib/api/response';
import { validate, firstError }               from '@/lib/api/validate';
import { createServiceClient }                from '@/lib/supabase/server';
import { writeAuditLog }                      from '@/lib/dal/auditLogs';
import type { AuthContext }                   from '@/lib/security/rbac';

// GET /api/ai/approve — list pending AI approvals (Manager only)
export const GET = withApi({ permission: 'user:manage', rateLimit: 'api' }, async (req: NextRequest) => {
  const { searchParams } = new URL(req.url);
  const status    = searchParams.get('status') ?? 'pending';
  const tenant_id = searchParams.get('tenant_id');

  const svc = createServiceClient();
  let query = svc
    .from('ai_approvals')
    .select(`*, tenants(full_name, room_number)`)
    .order('created_at', { ascending: false })
    .limit(50);

  if (status) query = query.eq('status', status);
  if (tenant_id) query = query.eq('tenant_id', tenant_id);

  const { data, error } = await query;
  if (error) throw error;
  return apiOk(data ?? []);
});

// PATCH /api/ai/approve — approve or reject a pending AI risk flag (Manager only)
// EU AI Act Art. 14 — Human oversight of high-risk AI outputs
export const PATCH = withApi({ permission: 'user:manage', rateLimit: 'api' }, async (req: NextRequest, ctx: AuthContext) => {
  const body = await req.json();
  const err  = firstError(validate(body, {
    approval_id:  { type: 'uuid',   required: true },
    decision:     { type: 'string', required: true, enum: ['approved', 'rejected', 'escalated'] as const },
    review_notes: { type: 'string', minLength: 5, maxLength: 1000 },
  }));
  if (err) return apiBadRequest(err);

  const { approval_id, decision, review_notes } = body as {
    approval_id: string; decision: 'approved' | 'rejected' | 'escalated'; review_notes?: string;
  };

  const svc = createServiceClient();
  const { data: approval } = await svc
    .from('ai_approvals')
    .select('id, tenant_id, risk_summary, status')
    .eq('id', approval_id)
    .single();

  if (!approval) return apiNotFound('AI approval');
  if (approval.status !== 'pending') return apiBadRequest(`Already ${approval.status} — cannot change`);

  const { data, error } = await svc
    .from('ai_approvals')
    .update({
      status:       decision,
      reviewed_by:  ctx.dbUser.id,
      review_notes: review_notes ?? null,
      approved_at:  new Date().toISOString(),
    })
    .eq('id', approval_id)
    .select()
    .single();

  if (error) throw error;

  await writeAuditLog({
    actorId:   ctx.dbUser.id,
    actorName: ctx.dbUser.full_name,
    actorRole: ctx.dbUser.role,
    tenantId:  approval.tenant_id,
    tableName: 'ai_approvals',
    recordId:  approval_id,
    action:    'EDIT',
    entryMethod: 'manual',
    newData: { decision, review_notes, reviewed_by: ctx.dbUser.full_name },
  });

  return apiOk({
    ...data,
    message: decision === 'approved'
      ? 'AI risk flag approved — action may proceed'
      : decision === 'rejected'
      ? 'AI risk flag rejected — no action required'
      : 'Escalated to senior management',
  });
});
