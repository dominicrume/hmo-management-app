// RBAC — Role-Based Access Control utilities
// Centralises all permission checks so API routes and components use one source of truth.

import { createClient, createServiceClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import type { UserRole, DbUser } from '@/types/database';

// ── Permission matrix ─────────────────────────────────────────────────────────
// Each permission maps to a set of roles that can perform it.

export type Permission =
  | 'tenant:read'
  | 'tenant:create'
  | 'tenant:update'
  | 'tenant:delete'
  | 'session:read'
  | 'session:create'
  | 'charge:read'
  | 'charge:create'
  | 'charge:update'
  | 'audit:read'
  | 'user:manage'
  | 'stats:read'
  | 'ai:use'
  | 'settings:manage'
  | 'notification:read'
  | 'notification:write'
  | 'claim:read'
  | 'claim:create'
  | 'claim:update'
  | 'payment:read'
  | 'payment:create'
  | 'payment:update';

const PERMISSION_MAP: Record<Permission, UserRole[]> = {
  'tenant:read':        ['Manager', 'SupportWorker'],
  'tenant:create':      ['Manager', 'SupportWorker'],
  'tenant:update':      ['Manager', 'SupportWorker'],
  'tenant:delete':      ['Manager'],
  'session:read':       ['Manager', 'SupportWorker'],
  'session:create':     ['Manager', 'SupportWorker'],
  'charge:read':        ['Manager', 'SupportWorker'],
  'charge:create':      ['Manager'],
  'charge:update':      ['Manager'],
  'audit:read':         ['Manager'],
  'user:manage':        ['Manager'],
  'stats:read':         ['Manager', 'SupportWorker'],
  'ai:use':             ['Manager', 'SupportWorker'],
  'settings:manage':    ['Manager'],
  'notification:read':  ['Manager', 'SupportWorker'],
  'notification:write': ['Manager', 'SupportWorker'],
  'claim:read':         ['Manager', 'SupportWorker'],
  'claim:create':       ['Manager', 'SupportWorker'],
  'claim:update':       ['Manager', 'SupportWorker'],
  'payment:read':       ['Manager', 'SupportWorker'],
  'payment:create':     ['Manager'],
  'payment:update':     ['Manager'],
};

export function hasPermission(role: UserRole, permission: Permission): boolean {
  return PERMISSION_MAP[permission]?.includes(role) ?? false;
}

// ── Auth context for API routes ───────────────────────────────────────────────

export interface AuthContext {
  authUserId: string;
  dbUser: DbUser;
}

/**
 * Extracts and validates auth context from the current request.
 * Returns the authenticated user's DB profile, or a 401/403 response.
 */
export async function getApiAuthContext(): Promise<
  { ok: true; ctx: AuthContext } | { ok: false; response: NextResponse }
> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      ),
    };
  }

  const { data: dbUser } = await supabase
    .from('users')
    .select('*')
    .eq('auth_id', user.id)
    .single();

  if (!dbUser) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: 'Staff profile not found. Contact your administrator.' },
        { status: 403 }
      ),
    };
  }

  // Check if the user account is active
  if (!dbUser.is_active) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: 'Account deactivated. Contact your administrator.' },
        { status: 403 }
      ),
    };
  }

  return {
    ok: true,
    ctx: { authUserId: user.id, dbUser: dbUser as DbUser },
  };
}

/**
 * Require specific permission in an API route.
 * Usage:
 *   const guard = await requirePermission('tenant:create');
 *   if (!guard.ok) return guard.response;
 *   const { ctx } = guard;
 */
export async function requirePermission(permission: Permission): Promise<
  { ok: true; ctx: AuthContext } | { ok: false; response: NextResponse }
> {
  const auth = await getApiAuthContext();
  if (!auth.ok) return auth;

  if (!hasPermission(auth.ctx.dbUser.role, permission)) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: `Forbidden: requires '${permission}' permission` },
        { status: 403 }
      ),
    };
  }

  return auth;
}

/**
 * Require Manager role specifically.
 */
export async function requireManager(): Promise<
  { ok: true; ctx: AuthContext } | { ok: false; response: NextResponse }
> {
  return requirePermission('user:manage');
}

// ── Admin user management ─────────────────────────────────────────────────────

export interface CreateUserPayload {
  email: string;
  full_name: string;
  role: UserRole;
  brand: string;
  phone?: string;
}

/**
 * Creates a new staff user (called by Manager via admin API).
 * The user must already exist in auth.users (invited via Supabase dashboard
 * or the invite API). This creates the corresponding `users` row.
 */
export async function createStaffUser(
  payload: CreateUserPayload,
  createdBy: string
): Promise<{ success: boolean; error?: string; user?: DbUser }> {
  const svc = createServiceClient();

  // Find the auth user by email
  const { data: authUsers } = await svc.auth.admin.listUsers();
  const authUser = authUsers?.users?.find((u) => u.email === payload.email);

  if (!authUser) {
    return {
      success: false,
      error: `No Supabase auth account found for ${payload.email}. Invite them first via Supabase dashboard.`,
    };
  }

  // Check if users row already exists
  const { data: existing } = await svc
    .from('users')
    .select('id')
    .eq('auth_id', authUser.id)
    .single();

  if (existing) {
    return { success: false, error: 'User already exists in the system.' };
  }

  const { data: created, error } = await svc
    .from('users')
    .insert({
      auth_id: authUser.id,
      full_name: payload.full_name,
      email: payload.email,
      role: payload.role,
      brand: payload.brand,
      phone: payload.phone ?? null,
    })
    .select()
    .single();

  if (error) return { success: false, error: error.message };
  return { success: true, user: created as DbUser };
}
