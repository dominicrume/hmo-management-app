import { NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';

// GET /api/tenants
// Returns tenants scoped correctly based on the calling user's role.
// Manager: all tenants
// SupportWorker: only assigned tenants
// Uses service client for the data fetch, but applies role-based scoping in code.

export async function GET() {
  try {
    const supabase = createClient();
    const svc      = createServiceClient();

    const { data: { user }, error: authErr } = await supabase.auth.getUser();
    if (!user || authErr) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    // Get the user's profile (service client = reliable, no RLS block)
    const { data: dbUser, error: userErr } = await svc
      .from('users')
      .select('id, role, is_active')
      .eq('auth_id', user.id)
      .single();

    if (userErr || !dbUser) {
      return NextResponse.json({ error: 'NO_PROFILE' }, { status: 404 });
    }

    if (!dbUser.is_active) {
      return NextResponse.json({ error: 'Account deactivated' }, { status: 403 });
    }

    let tenants;

    if (dbUser.role === 'Manager') {
      // Manager sees all tenants
      const { data, error } = await svc
        .from('tenants')
        .select('*')
        .order('full_name');
      if (error) throw new Error(error.message);
      tenants = data;
    } else if (dbUser.role === 'SupportWorker') {
      // SupportWorker sees only assigned tenants
      const { data: assignments, error: assignErr } = await svc
        .from('worker_tenant_assignments')
        .select('tenant_id')
        .eq('worker_id', dbUser.id);
      if (assignErr) throw new Error(assignErr.message);

      const tenantIds = (assignments ?? []).map((a) => a.tenant_id);
      if (tenantIds.length === 0) {
        return NextResponse.json({ tenants: [] });
      }

      const { data, error } = await svc
        .from('tenants')
        .select('*')
        .in('id', tenantIds)
        .order('full_name');
      if (error) throw new Error(error.message);
      tenants = data;
    } else {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    return NextResponse.json({ tenants: tenants ?? [] });
  } catch (e: unknown) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Error' }, { status: 500 });
  }
}
