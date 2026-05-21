export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';

// GET /api/me
// Returns the current user's staff profile from the users table.
// Uses service-role client to bypass RLS, but verifies auth JWT first.
// Called by the dashboard to reliably get the user profile.

export async function GET() {
  try {
    const supabase = createClient();
    const svc      = createServiceClient();

    const { data: { user }, error: authErr } = await supabase.auth.getUser();
    if (!user || authErr) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    // Use service client so RLS doesn't block the lookup
    const { data: dbUser, error } = await svc
      .from('users')
      .select('*')
      .eq('auth_id', user.id)
      .single();

    if (error) {
      // PGRST116 = no row found
      if (error.code === 'PGRST116') {
        return NextResponse.json({ error: 'NO_PROFILE', auth_id: user.id, email: user.email }, { status: 404 });
      }
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ user: dbUser });
  } catch (e: unknown) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Error' }, { status: 500 });
  }
}
