// POST /api/admin/users/invite — invite a new staff member by email.
// Manager only. Atomically:
//   1. Calls supabase.auth.admin.inviteUserByEmail() — creates auth user + sends invite email
//   2. Creates the corresponding users row with auth_id set immediately
//   3. Writes an audit log entry
//
// The invite email contains a magic link. When clicked, /auth/callback
// exchanges the code and the user sets their password via /reset-password.

import { NextRequest, NextResponse } from 'next/server';
import { requireManager } from '@/lib/security/rbac';
import { createServiceClient } from '@/lib/supabase/server';
import { checkRateLimit, RATE_LIMITS } from '@/lib/security/rate-limit';
import type { UserRole } from '@/types/database';

export async function POST(req: NextRequest) {
  const guard = await requireManager();
  if (!guard.ok) return guard.response;

  // Rate limit: 10 invites per hour per manager
  const rl = checkRateLimit(
    `invite:${guard.ctx.dbUser.id}`,
    RATE_LIMITS.setup.maxRequests,
    RATE_LIMITS.setup.windowMs
  );
  if (!rl.allowed) {
    return NextResponse.json(
      { error: 'Too many invite requests. Try again later.' },
      { status: 429, headers: { 'Retry-After': String(Math.ceil(rl.retryAfterMs / 1000)) } }
    );
  }

  const body = await req.json().catch(() => ({}));
  const { email, full_name, role, brand, phone } = body as {
    email?: string;
    full_name?: string;
    role?: UserRole;
    brand?: string;
    phone?: string;
  };

  if (!email || !full_name || !role) {
    return NextResponse.json(
      { error: 'email, full_name, and role are required' },
      { status: 400 }
    );
  }

  const validRoles: UserRole[] = ['Manager', 'SupportWorker', 'Tenant'];
  if (!validRoles.includes(role)) {
    return NextResponse.json(
      { error: `Invalid role. Must be one of: ${validRoles.join(', ')}` },
      { status: 400 }
    );
  }

  const svc = createServiceClient();

  // Check if a users row already exists for this email
  const { data: existing } = await svc
    .from('users')
    .select('id')
    .eq('email', email.toLowerCase().trim())
    .single();

  if (existing) {
    return NextResponse.json(
      { error: 'A user with this email already exists in the system.' },
      { status: 409 }
    );
  }

  // Supabase invite: creates auth user + sends invite email with magic link
  const redirectTo = `${process.env.NEXT_PUBLIC_APP_URL ?? 'https://hmo-management-app.vercel.app'}/auth/callback?next=/reset-password`;

  const { data: inviteData, error: inviteError } = await svc.auth.admin.inviteUserByEmail(
    email.toLowerCase().trim(),
    { redirectTo }
  );

  if (inviteError || !inviteData.user) {
    return NextResponse.json(
      { error: inviteError?.message ?? 'Failed to send invite email.' },
      { status: 500 }
    );
  }

  // Create the users row immediately — auth_id is known from the invite response
  const { data: newUser, error: insertError } = await svc
    .from('users')
    .insert({
      auth_id:   inviteData.user.id,
      full_name: full_name.trim(),
      email:     email.toLowerCase().trim(),
      role,
      brand:     brand ?? 'mattys_place',
      phone:     phone ?? null,
      is_active: true,
    })
    .select()
    .single();

  if (insertError) {
    // Roll back: delete the auth user so we don't leave orphaned auth accounts
    await svc.auth.admin.deleteUser(inviteData.user.id);
    return NextResponse.json({ error: insertError.message }, { status: 500 });
  }

  // Audit log
  await svc.from('audit_logs').insert({
    actor_id:     guard.ctx.dbUser.id,
    actor_name:   guard.ctx.dbUser.full_name,
    actor_role:   guard.ctx.dbUser.role,
    tenant_id:    null,
    table_name:   'users',
    record_id:    newUser.id,
    action:       'CREATE',
    entry_method: 'manual',
    new_data: { email, full_name, role, invited_by: guard.ctx.dbUser.full_name },
    diff_fields: ['email', 'full_name', 'role'],
  });

  return NextResponse.json({ ok: true, user: newUser }, { status: 201 });
}
