import { NextRequest }                              from 'next/server';
import { createServiceClient }                     from '@/lib/supabase/server';
import { withApi }                                 from '@/lib/api/middleware';
import { apiOk, apiBadRequest, apiNotFound }       from '@/lib/api/response';
import { validate, firstError }                    from '@/lib/api/validate';
import type { AuthContext }                        from '@/lib/security/rbac';

const PAYMENT_METHODS = ['Cash','Bank Transfer','Housing Benefit Direct','Standing Order'] as const;
const PAYMENT_STATUS  = ['pending','completed','failed','refunded'] as const;

// GET /api/payments?tenant_id=&charge_id=&status=
export const GET = withApi({ permission: 'payment:read', rateLimit: 'api' }, async (req: NextRequest) => {
  const { searchParams } = new URL(req.url);
  const tenantId = searchParams.get('tenant_id');
  const chargeId = searchParams.get('charge_id');
  const status   = searchParams.get('status');
  const limit    = Math.min(parseInt(searchParams.get('limit') ?? '100'), 500);

  const svc = createServiceClient();
  let query = svc
    .from('payments')
    .select(`
      *,
      tenants(full_name, room_number),
      service_charges(description, amount_pence, period_start, period_end),
      recorded_by_user:recorded_by(full_name, role)
    `)
    .order('payment_date', { ascending: false })
    .limit(limit);

  if (tenantId) query = query.eq('tenant_id', tenantId);
  if (chargeId) query = query.eq('charge_id', chargeId);
  if (status && PAYMENT_STATUS.includes(status as typeof PAYMENT_STATUS[number])) {
    query = query.eq('status', status);
  }

  const { data, error } = await query;
  if (error) throw error;
  return apiOk(data ?? []);
});

// POST /api/payments — record a new payment against a charge
export const POST = withApi({ permission: 'payment:create', rateLimit: 'api' }, async (req: NextRequest, ctx: AuthContext) => {
  const body = await req.json();
  const err = firstError(validate(body, {
    charge_id:    { type: 'uuid',   required: true },
    tenant_id:    { type: 'uuid',   required: true },
    amount_pence: { type: 'number', required: true },
    method:       { type: 'string', required: true, enum: PAYMENT_METHODS },
    payment_date: { type: 'string' },
    reference:    { type: 'string', maxLength: 100 },
    notes:        { type: 'string', maxLength: 500 },
  }));
  if (err) return apiBadRequest(err);

  const { charge_id, tenant_id, amount_pence, method, payment_date, reference, notes } =
    body as {
      charge_id: string; tenant_id: string; amount_pence: number;
      method: string; payment_date?: string; reference?: string; notes?: string;
    };

  if (amount_pence <= 0) return apiBadRequest("'amount_pence' must be greater than 0");

  const svc = createServiceClient();

  // Verify charge exists and belongs to the tenant
  const { data: charge, error: chargeErr } = await svc
    .from('service_charges')
    .select('id, tenant_id, amount_pence')
    .eq('id', charge_id)
    .single();

  if (chargeErr || !charge)    return apiNotFound('Charge');
  if (charge.tenant_id !== tenant_id) return apiBadRequest('Charge does not belong to this tenant');

  const { data: payment, error } = await svc
    .from('payments')
    .insert({
      charge_id,
      tenant_id,
      recorded_by:  ctx.dbUser.id,
      amount_pence,
      method,
      payment_date: payment_date ?? new Date().toISOString().split('T')[0],
      reference:    reference ?? null,
      notes:        notes     ?? null,
      status:       'completed',
      completed_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (error) throw error;

  // Mark the linked charge as paid if full amount matches
  if (amount_pence >= charge.amount_pence) {
    await svc
      .from('service_charges')
      .update({ is_paid: true, paid_at: new Date().toISOString() })
      .eq('id', charge_id);
  }

  await svc.from('audit_logs').insert({
    actor_id:    ctx.dbUser.id,
    actor_name:  ctx.dbUser.full_name,
    actor_role:  ctx.dbUser.role,
    tenant_id,
    table_name:  'payments',
    record_id:   payment.id,
    action:      'CREATE',
    entry_method: 'manual',
    new_data:    { amount_pence, method, status: 'completed' },
    diff_fields: ['amount_pence', 'method', 'status', 'payment_date'],
  });

  return apiOk(payment, 201);
});

// PATCH /api/payments — update status (e.g. mark as refunded)
export const PATCH = withApi({ permission: 'payment:update', rateLimit: 'api' }, async (req: NextRequest, ctx: AuthContext) => {
  const body = await req.json();
  const err = firstError(validate(body, {
    id:     { type: 'uuid',   required: true },
    status: { type: 'string', required: true, enum: PAYMENT_STATUS },
    notes:  { type: 'string', maxLength: 500 },
  }));
  if (err) return apiBadRequest(err);

  const { id, status, notes } = body as { id: string; status: string; notes?: string };

  const svc = createServiceClient();
  const { data, error } = await svc
    .from('payments')
    .update({ status, notes: notes ?? undefined })
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  if (!data) return apiNotFound('Payment');

  // If refunded, unmark the charge as paid
  if (status === 'refunded') {
    await svc
      .from('service_charges')
      .update({ is_paid: false, paid_at: null })
      .eq('id', data.charge_id);
  }

  await svc.from('audit_logs').insert({
    actor_id:    ctx.dbUser.id,
    actor_name:  ctx.dbUser.full_name,
    actor_role:  ctx.dbUser.role,
    tenant_id:   data.tenant_id,
    table_name:  'payments',
    record_id:   id,
    action:      'EDIT',
    entry_method: 'manual',
    new_data:    { status },
    diff_fields: ['status'],
  });

  return apiOk(data);
});
