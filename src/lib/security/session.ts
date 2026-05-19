// Session security utilities — server-only (uses next/headers via supabase/server).
// For client-safe password utilities, use @/lib/security/password instead.
export { checkPasswordStrength } from './password';
export type { PasswordStrength } from './password';

import { createClient, createServiceClient } from '@/lib/supabase/server';

// Max session age before forcing re-auth (4 hours of inactivity)
const SESSION_MAX_AGE_SECONDS = 4 * 60 * 60;

/**
 * Validate that the current session is fresh enough.
 * Supabase JWTs have an `exp` claim, but we also want to enforce
 * a shorter inactivity timeout for sensitive operations.
 */
export async function isSessionFresh(): Promise<{
  valid: boolean;
  userId?: string;
  expiresAt?: number;
  reason?: string;
}> {
  const supabase = createClient();
  const { data: { session }, error } = await supabase.auth.getSession();

  if (error || !session) {
    return { valid: false, reason: 'No active session' };
  }

  // Check JWT expiry
  const now = Math.floor(Date.now() / 1000);
  if (session.expires_at && session.expires_at < now) {
    return { valid: false, reason: 'Session expired' };
  }

  // Check last activity via the access token's `iat` (issued at)
  // If iat is too old, the user should re-authenticate
  // Note: Supabase auto-refreshes tokens, so iat tracks last refresh
  const tokenParts = session.access_token.split('.');
  if (tokenParts.length === 3) {
    try {
      const payload = JSON.parse(atob(tokenParts[1]));
      const iat = payload.iat as number;
      if (now - iat > SESSION_MAX_AGE_SECONDS) {
        return {
          valid: false,
          reason: 'Session inactive for too long. Please sign in again.',
        };
      }
    } catch {
      // If we can't parse the token, let Supabase handle validation
    }
  }

  return {
    valid: true,
    userId: session.user.id,
    expiresAt: session.expires_at,
  };
}

/**
 * Record a login event in the audit log.
 * Called after successful authentication.
 */
export async function auditLogin(
  userId: string,
  method: 'password' | 'magic_link' | 'oauth' = 'password'
): Promise<void> {
  try {
    const svc = createServiceClient();

    const { data: dbUser } = await svc
      .from('users')
      .select('id, full_name, role')
      .eq('auth_id', userId)
      .single();

    if (!dbUser) return;

    await svc.from('audit_logs').insert({
      actor_id: dbUser.id,
      actor_name: dbUser.full_name,
      actor_role: dbUser.role,
      tenant_id: null,
      table_name: 'users',
      record_id: dbUser.id,
      action: 'LOGIN',
      entry_method: 'manual',
      new_data: {
        method,
        timestamp: new Date().toISOString(),
        user_agent: 'server', // Could be enhanced with request headers
      },
    });
  } catch (e) {
    // Don't let audit failures block login
    console.error('[audit] Login audit failed:', e);
  }
}

/**
 * Force sign out — invalidates all sessions for the current user.
 * Used for password changes, account deactivation, suspicious activity.
 */
export async function forceSignOut(): Promise<void> {
  const supabase = createClient();
  await supabase.auth.signOut({ scope: 'global' });
}

