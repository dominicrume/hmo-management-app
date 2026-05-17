// POST /api/auth/audit-login — records a login event in the audit log.
// Called by the client after successful authentication.
// The user must already be authenticated when calling this.

import { NextRequest, NextResponse } from 'next/server';
import { auditLogin } from '@/lib/security/session';
import { createClient } from '@/lib/supabase/server';

export async function POST(req: NextRequest) {
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const method = (body.method ?? 'password') as 'password' | 'magic_link' | 'oauth';

    await auditLogin(user.id, method);

    return NextResponse.json({ ok: true });
  } catch {
    // Never let audit failures return errors to the client
    return NextResponse.json({ ok: true });
  }
}
