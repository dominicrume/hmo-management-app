import { NextRequest }                          from 'next/server';
import { createServiceClient }                  from '@/lib/supabase/server';
import { withApi }                              from '@/lib/api/middleware';
import { apiOk, apiBadRequest, apiServerError } from '@/lib/api/response';
import { validate, firstError }                 from '@/lib/api/validate';
import type { AuthContext }                     from '@/lib/security/rbac';

// GET /api/charges?tenant_id=
export const GET = withApi({ permission: 'charge:read', rateLimit: 'api' }, async (req: NextRequest) => {
  const { searchParams } = new URL(req.url);
  const tenantId = searchParams.get('tenant_id');

  const svc = createServiceClient();
  let query = svc
    .from('service_charges')
    .select('*, tenants(full_name, room_number)')
    .order('period_start', { ascending: false })
    .limit(100);

  if (tenantId) query = query.eq('tenant_id', tenantId);

  const { data, error } = await query;
  if (error) throw error;
  return apiOk(data ?? []);
});

// PATCH /api/charges — toggle is_paid
export const PATCH = withApi({ permission: 'charge:update', rateLimit: 'api' }, async (req: NextRequest, ctx: AuthContext) => {
  const body = await req.json();
  const err = firstError(validate(body, {
    id:      { type: 'uuid',    required: true },
    is_paid: { type: 'boolean', required: true },
  }));
  if (err) return apiBadRequest(err);

  const { id, is_paid } = body as { id: string; is_paid: boolean };
  const svc = createServiceClient();

  const { data: charge, error } = await svc
    .from('service_charges')
    .update({ is_paid, paid_at: is_paid ? new Date().toISOString() : null })
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;

  await svc.from('audit_logs').insert({
    actor_id:    ctx.dbUser.id,
    actor_name:  ctx.dbUser.full_name,
    actor_role:  ctx.dbUser.role,
    tenant_id:   charge.tenant_id,
    table_name:  'service_charges',
    record_id:   id,
    action:      'EDIT',
    entry_method: 'manual',
    new_data:    { is_paid },
    diff_fields: ['is_paid', 'paid_at'],
  });

  return apiOk(charge);
});
