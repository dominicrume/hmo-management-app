import { NextRequest, NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';

// GET /api/sessions?tenant_id=&limit=
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const tenantId = searchParams.get('tenant_id');
    const limit    = parseInt(searchParams.get('limit') ?? '50');

    const svc = createServiceClient();
    let query = svc
      .from('sessions')
      .select('*, users(full_name, role)')
      .order('session_date', { ascending: false })
      .order('created_at',   { ascending: false })
      .limit(limit);

    if (tenantId) query = query.eq('tenant_id', tenantId);

    const { data, error } = await query;
    if (error) throw error;
    return NextResponse.json(data ?? []);
  } catch (e: unknown) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'sessions error' }, { status: 500 });
  }
}

// POST /api/sessions  — create a session (log a contact)
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { tenant_id, session_type, session_date, notes, entry_method = 'manual' } = body;

    if (!tenant_id) return NextResponse.json({ error: 'tenant_id required' }, { status: 400 });

    const supabase = createClient();
    const svc      = createServiceClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });

    const { data: dbUser } = await supabase.from('users').select('id, full_name, role').eq('auth_id', user.id).single();
    if (!dbUser) return NextResponse.json({ error: 'Staff profile not found' }, { status: 403 });

    const { data: session, error } = await supabase
      .from('sessions')
      .insert({
        tenant_id,
        worker_id:    dbUser.id,
        session_type: session_type ?? 'ad_hoc',
        session_date: session_date ?? new Date().toISOString().split('T')[0],
        notes:        notes ?? null,
        entry_method,
        is_signed:    false,
      })
      .select()
      .single();

    if (error) throw error;

    await svc.from('audit_logs').insert({
      actor_id:    dbUser.id,
      actor_name:  dbUser.full_name,
      actor_role:  dbUser.role,
      tenant_id,
      table_name:  'sessions',
      record_id:   session.id,
      action:      'CREATE',
      entry_method,
      new_data:    { session_type, session_date, notes },
    });

    return NextResponse.json(session);
  } catch (e: unknown) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'create session failed' }, { status: 500 });
  }
}
