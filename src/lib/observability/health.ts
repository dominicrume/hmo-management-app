// Health check — used by /api/health and monitoring systems.

import { createServiceClient } from '@/lib/supabase/server';

export interface HealthStatus {
  status:   'ok' | 'degraded' | 'down';
  version:  string;
  checks: {
    database: 'ok' | 'error';
    auth:     'ok' | 'error';
  };
  uptime_s: number;
  timestamp: string;
}

// Node.js process start time — approximates app uptime
const STARTED_AT = Date.now();

export async function getHealthStatus(): Promise<HealthStatus> {
  const checks: HealthStatus['checks'] = {
    database: 'error',
    auth:     'error',
  };

  try {
    const svc = createServiceClient();

    // Cheapest possible DB round-trip — single row from a small table
    const { error: dbErr } = await svc
      .from('users')
      .select('id')
      .limit(1)
      .maybeSingle();

    if (!dbErr) checks.database = 'ok';

    // Auth admin reachability — listing 0 users just validates the connection
    const { error: authErr } = await svc.auth.admin.listUsers({ page: 1, perPage: 1 });
    if (!authErr) checks.auth = 'ok';
  } catch {
    // checks remain 'error'
  }

  const allOk = Object.values(checks).every((v) => v === 'ok');
  const anyOk = Object.values(checks).some((v) => v === 'ok');

  return {
    status:    allOk ? 'ok' : anyOk ? 'degraded' : 'down',
    version:   process.env.npm_package_version ?? '0.5.0',
    checks,
    uptime_s:  Math.floor((Date.now() - STARTED_AT) / 1000),
    timestamp: new Date().toISOString(),
  };
}
