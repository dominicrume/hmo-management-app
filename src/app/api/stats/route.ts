import { NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';

export async function GET() {
  try {
    const svc = createServiceClient();

    const [
      { count: totalTenants },
      { count: activeTenants },
      { data: charges },
      { count: riskSessions },
      { count: sessionsThisWeek },
      { data: recentAudit },
    ] = await Promise.all([
      svc.from('tenants').select('*', { count: 'exact', head: true }),
      svc.from('tenants').select('*', { count: 'exact', head: true }).eq('status', 'active'),
      svc.from('service_charges').select('amount_due, amount_paid').eq('is_paid', false),
      svc.from('sessions').select('*', { count: 'exact', head: true }).eq('ai_risk_flag', true),
      svc.from('sessions').select('*', { count: 'exact', head: true })
        .gte('session_date', new Date(Date.now() - 7 * 86400000).toISOString().split('T')[0]),
      svc.from('audit_logs')
        .select('id, actor_name, actor_role, action, table_name, stamped_at, payload_hash, tenant_id')
        .order('stamped_at', { ascending: false })
        .limit(8),
    ]);

    const unpaidTotal = charges?.reduce((s, c) => s + (c.amount_due - c.amount_paid), 0) ?? 0;

    return NextResponse.json({
      totalTenants:    totalTenants ?? 0,
      activeTenants:   activeTenants ?? 0,
      unpaidCount:     charges?.length ?? 0,
      unpaidTotal,
      riskCount:       riskSessions ?? 0,
      sessionsThisWeek: sessionsThisWeek ?? 0,
      recentAudit:     recentAudit ?? [],
    });
  } catch (e: unknown) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'stats error' }, { status: 500 });
  }
}
