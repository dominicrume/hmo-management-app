import { NextRequest }                          from 'next/server';
import { createServiceClient }                  from '@/lib/supabase/server';
import { withApi }                              from '@/lib/api/middleware';
import { apiOk, apiBadRequest, apiServerError } from '@/lib/api/response';
import { validate, firstError }                 from '@/lib/api/validate';
import type { AuthContext }                     from '@/lib/security/rbac';

// GET /api/charges?tenant_id=&unpaid=true
export const GET = withApi({ permission: 'charge:read', rateLimit: 'api' }, async (req: NextRequest, ctx: AuthContext) => {
  const { searchParams } = new URL(req.url);
  let tenantId = searchParams.get('tenant_id');
  const unpaidOnly = searchParams.get('unpaid') === 'true';

  const svc = createServiceClient();

  if (ctx.dbUser.role === 'Tenant') {
    const { data: tenantRecord } = await svc.from('tenants').select('id').eq('auth_id', ctx.dbUser.auth_id).single();
    if (!tenantRecord) {
      return apiOk({ charges: [], data: [] });
    }
    tenantId = tenantRecord.id; // Force their own ID
  }

  let query = svc
    .from('service_charges')
    .select('id, amount_due, amount_paid, tenant_id, is_paid, period_start, period_end, payment_method, notes')
    .order('period_start', { ascending: false })
    .limit(200);

  if (tenantId)  query = query.eq('tenant_id', tenantId);
  if (unpaidOnly) query = query.eq('is_paid', false);

  const { data, error } = await query;
  if (error) throw error;
  // Return both formats for compatibility
  return apiOk({ charges: data ?? [], data: data ?? [] });
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
