// Data Access — Auth helpers
// Returns the current user + their DB profile. Used by every protected route.

import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import type { AuthUser, DbUser } from '@/types/database';

export async function getAuthUser(): Promise<AuthUser | null> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: dbUser } = await supabase
    .from('users')
    .select('*')
    .eq('auth_id', user.id)
    .single();

  if (!dbUser) return null;

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
