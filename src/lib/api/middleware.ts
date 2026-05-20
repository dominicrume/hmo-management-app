// Composable API middleware — auth, rate limiting, metrics, error logging.

import { NextRequest, NextResponse } from 'next/server';
import { requirePermission, getApiAuthContext, type AuthContext } from '@/lib/security/rbac';
import { checkRateLimit, RATE_LIMITS }                           from '@/lib/security/rate-limit';
import { apiServerError, apiTooManyReqs }                        from './response';
import { log }                                                   from '@/lib/observability/logger';
import { recordMetric, parseRoute }                              from '@/lib/observability/metrics';
import type { Permission }                                       from '@/lib/security/rbac';

type RateLimitPreset = keyof typeof RATE_LIMITS;

interface MiddlewareOptions {
  permission?: Permission;
  rateLimit?:  RateLimitPreset;
}

type Handler = (req: NextRequest, ctx: AuthContext) => Promise<NextResponse>;

/**
 * Wraps a route handler with:
 *  1. Auth + optional permission guard
 *  2. Optional rate limiting (keyed by user ID)
 *  3. Request timing + metric recording (fire-and-forget)
 *  4. Structured error logging on unhandled exceptions
 *
 * Usage:
 *   export const GET = withApi({ permission: 'charge:read', rateLimit: 'api' }, async (req, ctx) => {
 *     // ctx.dbUser is guaranteed here
 *   });
 */
export function withApi(opts: MiddlewareOptions, handler: Handler) {
  return async (req: NextRequest): Promise<NextResponse> => {
    const startMs = Date.now();
    const route   = parseRoute(req.url);
    const method  = req.method;
    let   actorId: string | undefined;
    let   status  = 500;

    try {
      // 1. Auth + permission check
      const guard = opts.permission
        ? await requirePermission(opts.permission)
        : await getApiAuthContext();

      if (!guard.ok) {
        status = guard.response.status;
        return guard.response;
      }

      actorId = guard.ctx.dbUser.id;

      // 2. Rate limiting
      if (opts.rateLimit) {
        const preset  = RATE_LIMITS[opts.rateLimit];
        const limited = checkRateLimit(actorId, preset.maxRequests, preset.windowMs);
        if (!limited.allowed) {
          status = 429;
          return apiTooManyReqs(limited.retryAfterMs);
        }
      }

      // 3. Run handler
      const response = await handler(req, guard.ctx);
      status = response.status;
      return response;

    } catch (e) {
      // 4. Structured error log — captures stack + context
      const message = e instanceof Error ? e.message : 'Unhandled error';
      void log.error(message, {
        route,
        method,
        actorId,
        statusCode: 500,
        meta: {
          stack: e instanceof Error ? e.stack : undefined,
        },
      });
      return apiServerError(e);

    } finally {
      // 5. Always record metric (fire-and-forget — never awaited in hot path)
      const durationMs = Date.now() - startMs;
      const ip = req.headers.get('x-forwarded-for') ?? undefined;
      void recordMetric({ route, method, actorId, statusCode: status, durationMs, ip });
    }
  };
}

/**
 * Auth only — no permission guard, no rate limit.
 */
export function withAuth(handler: Handler) {
  return withApi({}, handler);
}
