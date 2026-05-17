import { NextRequest, NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';

// GET /api/audit?tenant_id=&limit=
export async function GET(req: NextRequest) {
  try {
    // Auth guard — only authenticated staff can read audit logs
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const tenantId = searchParams.get('tenant_id');
    const limit    = parseInt(searchParams.get('limit') ?? '100');

    const svc = createServiceClient();
    let query = svc
      .from('audit_logs')
      .select('*')
      .order('stamped_at', { ascending: false })
      .limit(limit);

    if (tenantId) query = query.eq('tenant_id', tenantId);

    const { data, error } = await query;
    if (error) throw error;
    return NextResponse.json(data ?? []);
  } catch (e: unknown) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'audit error' }, { status: 500 });
  }
}
