import { NextRequest, NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const supabase = createClient();
    const svc = createServiceClient();

    // Verify auth
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });

    const { data: dbUser } = await svc
      .from('users')
      .select('id, role')
      .eq('auth_id', user.id)
      .single();

    if (!dbUser) return NextResponse.json({ error: 'Staff profile not found' }, { status: 403 });

    // Fetch tenant using service client
    const { data: tenant, error } = await svc
      .from('tenants')
      .select('*')
      .eq('id', params.id)
      .single();

    if (error || !tenant) {
      return NextResponse.json({ error: 'Tenant not found' }, { status: 404 });
    }

    // Basic access check: if SupportWorker, ensure they are assigned
    if (dbUser.role === 'SupportWorker') {
      const { data: assignment } = await svc
        .from('worker_tenant_assignments')
        .select('id')
        .eq('worker_id', dbUser.id)
        .eq('tenant_id', tenant.id)
        .eq('is_active', true)
        .single();
        
      if (!assignment) {
         return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
    }

    return NextResponse.json(tenant);
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const supabase = createClient();
    const svc = createServiceClient();

    // Verify auth
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });

    const { data: dbUser } = await svc
      .from('users')
      .select('id, role')
      .eq('auth_id', user.id)
      .single();

    if (!dbUser || dbUser.role !== 'Manager') {
      return NextResponse.json({ error: 'Forbidden: Managers only' }, { status: 403 });
    }

    // First create an audit log of the deletion
    await svc.from('audit_logs').insert({
      user_id: dbUser.id,
      action: 'TENANT_DELETED',
      entity_type: 'tenant',
      entity_id: params.id,
      details: {
        timestamp: new Date().toISOString(),
        message: 'Tenant hard-deleted by manager'
      }
    });

    // Delete the tenant
    const { error: deleteError } = await svc
      .from('tenants')
      .delete()
      .eq('id', params.id);

    if (deleteError) {
      console.error('Delete error:', deleteError);
      return NextResponse.json({ error: 'Failed to delete tenant' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('API Error:', err);
    return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 });
  }
}
