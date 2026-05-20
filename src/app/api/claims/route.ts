import { NextRequest }                              from 'next/server';
import { createServiceClient }                     from '@/lib/supabase/server';
import { withApi }                                 from '@/lib/api/middleware';
import { apiOk, apiBadRequest, apiNotFound }       from '@/lib/api/response';
import { validate, firstError }                    from '@/lib/api/validate';
import type { AuthContext }                        from '@/lib/security/rbac';

const CLAIM_TYPES  = ['housing_benefit','universal_credit','pip','support_plan','missing_person','risk_review','other'] as const;
const CLAIM_STATUS = ['open','in_progress','resolved','closed'] as const;

// GET /api/claims?tenant_id=&status=open&limit=50
export const GET = withApi({ permission: 'claim:read', rateLimit: 'api' }, async (req: NextRequest) => {
  const { searchParams } = new URL(req.url);
  const tenantId = searchParams.get('tenant_id');
  const status   = searchParams.get('status');
  const limit    = Math.min(parseInt(searchParams.get('limit') ?? '50'), 200);

  const svc = createServiceClient();
  let query = svc
    .from('claims')
    .select(`
      *,
      tenants(full_name, room_number),
      raised_by_user:raised_by(full_name, role),
      resolved_by_user:resolved_by(full_name)
    `)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (tenantId) query = query.eq('tenant_id', tenantId);
  if (status && CLAIM_STATUS.includes(status as typeof CLAIM_STATUS[number])) {
    query = query.eq('status', status);
  }

  const { data, error } = await query;
  if (error) throw error;
  return apiOk(data ?? []);
});

// POST /api/claims — raise a new claim
export const POST = withApi({ permission: 'claim:create', rateLimit: 'api' }, async (req: NextRequest, ctx: AuthContext) => {
  const body = await req.json();
  const err = firstError(validate(body, {
    tenant_id:   { type: 'uuid',   required: true },
    type:        { type: 'string', required: true, enum: CLAIM_TYPES },
    title:       { type: 'string', required: true, minLength: 3, maxLength: 200 },
    description: { type: 'string', maxLength: 2000 },
    reference:   { type: 'string', maxLength: 100 },
    session_id:  { type: 'uuid' },
  }));
  if (err) return apiBadRequest(err);

  const svc = createServiceClient();
  const { data, error } = await svc
    .from('claims')
    .insert({
      tenant_id:   body.tenant_id,
      raised_by:   ctx.dbUser.id,
      type:        body.type,
      title:       body.title,
      description: body.description ?? null,
      reference:   body.reference   ?? null,
      session_id:  body.session_id  ?? null,
    })
    .select()
    .single();

  if (error) throw error;

  await svc.from('audit_logs').insert({
    actor_id:    ctx.dbUser.id,
    actor_name:  ctx.dbUser.full_name,
    actor_role:  ctx.dbUser.role,
    tenant_id:   body.tenant_id,
    table_name:  'claims',
    record_id:   data.id,
    action:      'CREATE',
    entry_method: 'manual',
    new_data:    { type: body.type, title: body.title },
    diff_fields: ['type', 'title', 'status'],
  });

  return apiOk(data, 201);
});

// PATCH /api/claims — update status or resolved_by
export const PATCH = withApi({ permission: 'claim:update', rateLimit: 'api' }, async (req: NextRequest, ctx: AuthContext) => {
  const body = await req.json();
  const err = firstError(validate(body, {
    id:     { type: 'uuid',   required: true },
    status: { type: 'string', enum: CLAIM_STATUS },
  }));
  if (err) return apiBadRequest(err);

  const { id, status } = body as { id: string; status: typeof CLAIM_STATUS[number] };

  const patch: Record<string, unknown> = { status, updated_at: new Date().toISOString() };
  if (status === 'resolved' || status === 'closed') {
    patch.resolved_at = new Date().toISOString();
    patch.resolved_by = ctx.dbUser.id;
  }

  const svc = createServiceClient();
  const { data, error } = await svc
    .from('claims')
    .update(patch)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  if (!data) return apiNotFound('Claim');

  await svc.from('audit_logs').insert({
    actor_id:    ctx.dbUser.id,
    actor_name:  ctx.dbUser.full_name,
    actor_role:  ctx.dbUser.role,
    tenant_id:   data.tenant_id,
    table_name:  'claims',
    record_id:   id,
    action:      'EDIT',
    entry_method: 'manual',
    new_data:    { status },
    diff_fields: Object.keys(patch),
  });

  return apiOk(data);
});
