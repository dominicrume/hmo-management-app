import { NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';

// POST /api/setup
// Creates the Manager users row for the current auth user if it doesn't exist.
// Called once on first login when the users table has no matching record.

export async function POST() {
  try {
    const supabase = createClient();
    const svc      = createServiceClient();

    const { data: { user }, error: authErr } = await supabase.auth.getUser();
    console.log('[setup] user:', user?.id, 'err:', authErr);
    if (!user) return NextResponse.json({ error: 'Not authenticated', details: authErr }, { status: 401 });

    // Check if a users row already exists
    const { data: existing } = await svc
      .from('users')
      .select('id, role')
      .eq('auth_id', user.id)
      .single();

    if (existing) {
      return NextResponse.json({ ok: true, user: existing, created: false });
    }

    // Create the Manager row using service role (bypasses RLS)
    const { data: created, error } = await svc
      .from('users')
      .insert({
        auth_id:   user.id,
        full_name: user.user_metadata?.full_name ?? user.email?.split('@')[0] ?? 'Manager',
        email:     user.email ?? '',
        role:      'Manager',
        brand:     'mattys_place',
      })
      .select()
      .single();

    if (error) throw new Error(error.message);

    return NextResponse.json({ ok: true, user: created, created: true });
  } catch (e: unknown) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Setup failed' },
      { status: 500 },
    );
  }
}
