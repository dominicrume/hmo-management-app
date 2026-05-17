// Data Access — Auth helpers
// Returns the current user + their DB profile. Used by every protected route.
//
// SECURITY:
//   - Uses getUser() (server-validated JWT) not getSession() (local-only)
//   - Checks is_active flag to enforce account deactivation
//   - Integrates with RBAC permission system

import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { hasPermission, type Permission } from '@/lib/security/rbac';
import type { AuthUser, DbUser, UserRole } from '@/types/database';

export async function getAuthUser(): Promise<AuthUser | null> {
  const supabase = createClient();

  // IMPORTANT: getUser() validates JWT server-side.
  // getSession() only reads the cookie — never use it for auth checks.
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: dbUser } = await supabase
    .from('users')
    .select('*')
    .eq('auth_id', user.id)
    .single();

  if (!dbUser) return null;

  // Check if account is active
  if (!(dbUser as DbUser).is_active) return null;

  return { id: user.id, email: user.email ?? '', dbUser: dbUser as DbUser };
}

// Redirects to /login if not authenticated.
export async function requireAuth(): Promise<AuthUser> {
  const user = await getAuthUser();
  if (!user) redirect('/login');
  return user;
}

// Redirects to /login if not Manager.
export async function requireManager(): Promise<AuthUser> {
  const user = await requireAuth();
  if (user.dbUser.role !== 'Manager') redirect('/dashboard');
  return user;
}

// Redirects to /dashboard if the user lacks a specific permission.
export async function requirePermission(permission: Permission): Promise<AuthUser> {
  const user = await requireAuth();
  if (!hasPermission(user.dbUser.role, permission)) {
    redirect('/dashboard');
  }
  return user;
}

// Check a permission without redirect — returns boolean.
export async function canDo(permission: Permission): Promise<boolean> {
  const user = await getAuthUser();
  if (!user) return false;
  return hasPermission(user.dbUser.role, permission);
}
