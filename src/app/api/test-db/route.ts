import { NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';

export async function GET(request: Request) {
  const url = new URL(request.url);
  const passcode = url.searchParams.get('passcode');

  // Simple secure gate to prevent unauthorized access
  if (passcode !== 'mattys-debug-123') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const results: any = {
    env: {
      supabase_url: process.env.NEXT_PUBLIC_SUPABASE_URL || 'missing',
      supabase_anon_key_len: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.length ?? 0,
      supabase_service_key_len: process.env.SUPABASE_SERVICE_ROLE_KEY?.length ?? 0,
    },
    queries: {}
  };

  try {
    const svc = createServiceClient();

    // Test query users count
    const { data: users, error: usersErr } = await svc
      .from('users')
      .select('id, email, role');
    results.queries.users = {
      count: users?.length ?? 0,
      error: usersErr ? { message: usersErr.message, code: usersErr.code } : null,
      data: users ? users.map(u => ({ id: u.id, email: u.email, role: u.role })) : null
    };

    // Test query tenants count
    const { data: tenants, error: tenantsErr } = await svc
      .from('tenants')
      .select('id, full_name, room_number, status');
    results.queries.tenants = {
      count: tenants?.length ?? 0,
      error: tenantsErr ? { message: tenantsErr.message, code: tenantsErr.code } : null,
      data: tenants ? tenants.map(t => ({ id: t.id, full_name: t.full_name, room: t.room_number, status: t.status })) : null
    };

  } catch (err: any) {
    results.error = err.message || err;
  }

  return NextResponse.json(results);
}
