// /auth/callback — handles Supabase magic link and OAuth redirects.
// Exchanges the code for a session, audits the login, then redirects.
//
// SECURITY:
//   - Validates the `next` parameter to prevent open redirect attacks
//   - Records login events in audit_logs for compliance

import { createClient, createServiceClient } from '@/lib/supabase/server';
import { auditLogin } from '@/lib/security/session';
import { NextRequest, NextResponse } from 'next/server';

// Only allow redirects to paths within our own app
const SAFE_REDIRECT_PATTERN = /^\/[a-zA-Z0-9\-_\/]*$/;

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const next = searchParams.get('next') ?? '/dashboard';

  // Validate redirect target — prevent open redirect attacks
  const safePath = SAFE_REDIRECT_PATTERN.test(next) ? next : '/dashboard';

  if (code) {
    const supabase = createClient();
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error && data.user) {
      // Link auth_id to existing users row (handles first-time login for seeded accounts)
      const svc = createServiceClient();
      await svc
        .from('users')
        .update({ auth_id: data.user.id })
        .eq('email', data.user.email ?? '')
        .is('auth_id', null);

      // Audit the login event
      await auditLogin(data.user.id, 'magic_link');

      return NextResponse.redirect(`${origin}${safePath}`);
    }
  }

  return NextResponse.redirect(`${origin}/login?error=auth_callback_failed`);
}
