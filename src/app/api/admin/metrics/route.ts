import { NextRequest }        from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';
import { withApi }             from '@/lib/api/middleware';
import { apiOk }               from '@/lib/api/response';

// GET /api/admin/metrics?hours=24
// Returns aggregated API performance data for the Manager dashboard.
export const GET = withApi({ permission: 'settings:manage', rateLimit: 'api' }, async (req: NextRequest) => {
  const { searchParams } = new URL(req.url);
  const hours = Math.min(parseInt(searchParams.get('hours') ?? '24'), 168); // max 1 week
  const since = new Date(Date.now() - hours * 60 * 60 * 1000).toISOString();

  const svc = createServiceClient();

  const [
    { data: byRoute },
    { data: recentErrors },
    { count: totalRequests },
    { count: errorCount },
    { data: slowRequests },
  ] = await Promise.all([
    // Requests grouped by route
    svc.rpc('api_metrics_by_route', { since_ts: since }).select('*'),

    // Recent errors (status >= 500)
    svc.from('system_logs')
      .select('id, level, route, method, message, meta, created_at')
      .eq('level', 'error')
      .gte('created_at', since)
      .order('created_at', { ascending: false })
      .limit(20),

    // Total request count
    svc.from('api_metrics')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', since),

    // Error count (5xx)
    svc.from('api_metrics')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', since)
      .gte('status_code', 500),

    // Slowest requests
    svc.from('api_metrics')
      .select('route, method, status_code, duration_ms, created_at')
      .gte('created_at', since)
      .order('duration_ms', { ascending: false })
      .limit(10),
  ]);

  return apiOk({
    window_hours:   hours,
    total_requests: totalRequests ?? 0,
    error_count:    errorCount    ?? 0,
    error_rate_pct: totalRequests
      ? Math.round(((errorCount ?? 0) / totalRequests) * 10000) / 100
      : 0,
    by_route:       byRoute       ?? [],
    recent_errors:  recentErrors  ?? [],
    slow_requests:  slowRequests  ?? [],
  });
});
