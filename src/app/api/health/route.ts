import { NextResponse } from 'next/server';
import { getHealthStatus } from '@/lib/observability/health';

// GET /api/health — public, no auth required.
// Used by Vercel health checks, uptime monitors, and load balancers.
export async function GET(): Promise<NextResponse> {
  const health = await getHealthStatus();
  const httpStatus = health.status === 'ok' ? 200 : health.status === 'degraded' ? 207 : 503;
  return NextResponse.json(health, { status: httpStatus });
}

// Disable Next.js caching — health must always be fresh
export const dynamic = 'force-dynamic';
