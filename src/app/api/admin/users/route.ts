import { NextRequest, NextResponse } from 'next/server';
import { requireManager, createStaffUser, type CreateUserPayload } from '@/lib/security/rbac';
import { createServiceClient } from '@/lib/supabase/server';
import { checkRateLimit, RATE_LIMITS } from '@/lib/security/rate-limit';
import type { UserRole } from '@/types/database';

// GET /api/admin/users — list all staff users (Manager only)
export async function GET() {
  const guard = await requireManager();
  if (!guard.ok) return guard.response;

  const svc = createServiceClient();
  const { data, error } = await svc
    .from('users')
    .select('id, auth_id, full_name, email, role, brand, is_active, phone, created_at, updated_at')
    .order('created_at', { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data ?? []);
}

// POST /api/admin/users — create a new staff user (Manager only)
export async function POST(req: NextRequest) {
  const guard = await requireManager();
  if (!guard.ok) return guard.response;

  // Rate limit
  const ip = req.headers.get('x-forwarded-for') ?? 'unknown';
  const limit = checkRateLimit(`admin:${ip}`, RATE_LIMITS.setup.maxRequests, RATE_LIMITS.setup.windowMs);
  if (!limit.allowed) {
    return NextResponse.json(
      { error: 'Too many requests. Try again later.' },
      { status: 429, headers: { 'Retry-After': String(Math.ceil(limit.retryAfterMs / 1000)) } }
    );
  }

  const body = await req.json();
  const { email, full_name, role, brand, phone } = body as Partial<CreateUserPayload>;

  if (!email || !full_name || !role) {
    return NextResponse.json(
      { error: 'email, full_name, and role are required' },
      { status: 400 }
    );
  }

  // Validate role
  const validRoles: UserRole[] = ['Manager', 'SupportWorker', 'Tenant'];
  if (!validRoles.includes(role)) {
    return NextResponse.json(
      { error: `Invalid role. Must be one of: ${validRoles.join(', ')}` },
      { status: 400 }
    );
  }

  const result = await createStaffUser(
    { email, full_name, role, brand: brand ?? 'mattys_place', phone },
    guard.ctx.dbUser.id
  );

  if (!result.success) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  return NextResponse.json({ ok: true, user: result.user }, { status: 201 });
}

// PATCH /api/admin/users — update a user (activate/deactivate/change role)
export async function PATCH(req: NextRequest) {
  const guard = await requireManager();
  if (!guard.ok) return guard.response;

  const body = await req.json();
  const { user_id, is_active, role } = body as {
    user_id?: string;
    is_active?: boolean;
    role?: UserRole;
  };

  if (!user_id) {
    return NextResponse.json({ error: 'user_id required' }, { status: 400 });
  }

  // Prevent self-deactivation
  if (user_id === guard.ctx.dbUser.id && is_active === false) {
    return NextResponse.json(
      { error: 'Cannot deactivate your own account' },
      { status: 400 }
    );
  }

  const svc = createServiceClient();
  const updatePayload: Record<string, unknown> = {};
  if (typeof is_active === 'boolean') updatePayload.is_active = is_active;
  if (role) updatePayload.role = role;

  if (Object.keys(updatePayload).length === 0) {
    return NextResponse.json({ error: 'No fields to update' }, { status: 400 });
  }

  const { data, error } = await svc
    .from('users')
    .update(updatePayload)
    .eq('id', user_id)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Audit the change
  await svc.from('audit_logs').insert({
    actor_id: guard.ctx.dbUser.id,
    actor_name: guard.ctx.dbUser.full_name,
    actor_role: guard.ctx.dbUser.role,
    tenant_id: null,
    table_name: 'users',
    record_id: user_id,
    action: 'EDIT',
    entry_method: 'manual',
    new_data: updatePayload,
    diff_fields: Object.keys(updatePayload),
  });

  return NextResponse.json({ ok: true, user: data });
}
