import { NextRequest, NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';

// GET /api/charges?tenant_id=
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const tenantId = searchParams.get('tenant_id');

    const svc = createServiceClient();
    let query = svc
      .from('service_charges')
      .select('*, tenants(full_name, room_number)')
      .order('period_start', { ascending: false })
      .limit(100);

    if (tenantId) query = query.eq('tenant_id', tenantId);

    const { data, error } = await query;
    if (error) throw error;
    return NextResponse.json(data ?? []);
  } catch (e: unknown) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'charges error' }, { status: 500 });
  }
}

// PATCH /api/charges  — toggle is_paid
export async function PATCH(req: NextRequest) {
  try {
    const { id, is_paid } = await req.json();
    if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });

    const supabase = createClient();
    const svc      = createServiceClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });
    const { data: dbUser } = await supabase.from('users').select('id, full_name, role').eq('auth_id', user.id).single();

    const { data: charge, error } = await supabase
      .from('service_charges')
      .update({ is_paid, paid_at: is_paid ? new Date().toISOString() : null })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    if (dbUser) {
      await svc.from('audit_logs').insert({
        actor_id:    dbUser.id,
        actor_name:  dbUser.full_name,
        actor_role:  dbUser.role,
        tenant_id:   charge.tenant_id,
        table_name:  'service_charges',
        record_id:   id,
        action:      'EDIT',
        entry_method: 'manual',
        new_data:    { is_paid },
        diff_fields: ['is_paid', 'paid_at'],
      });
    }

    return NextResponse.json(charge);
  } catch (e: unknown) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'update charge failed' }, { status: 500 });
  }
}
