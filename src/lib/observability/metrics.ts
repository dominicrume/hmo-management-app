// API metrics recorder — fire-and-forget, never blocks response.

import { createServiceClient } from '@/lib/supabase/server';

interface MetricParams {
  route:      string;
  method:     string;
  actorId?:   string;
  statusCode: number;
  durationMs: number;
  ip?:        string;
}

export async function recordMetric(params: MetricParams): Promise<void> {
  try {
    const svc = createServiceClient();
    await svc.from('api_metrics').insert({
      route:       params.route,
      method:      params.method,
      actor_id:    params.actorId  ?? null,
      status_code: params.statusCode,
      duration_ms: params.durationMs,
      ip:          params.ip       ?? null,
    });
  } catch {
    // Metrics write must never crash the app
  }
}

/** Parse the route path from a full Next.js URL string */
export function parseRoute(urlString: string): string {
  try {
    return new URL(urlString).pathname;
  } catch {
    return urlString;
  }
}
