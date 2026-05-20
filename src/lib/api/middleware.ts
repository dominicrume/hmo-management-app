// Composable API middleware — wraps auth, rate limiting, and error catching.

import { NextRequest, NextResponse } from 'next/server';
import { requirePermission, getApiAuthContext, type AuthContext } from '@/lib/security/rbac';
import { checkRateLimit, RATE_LIMITS }                          from '@/lib/security/rate-limit';
import { apiServerError, apiTooManyReqs }                       from './response';
import type { Permission } from '@/lib/security/rbac';

type RateLimitPreset = keyof typeof RATE_LIMITS;

interface MiddlewareOptions {
  permission?: Permission;
  rateLimit?: RateLimitPreset;
}

type Handler = (req: NextRequest, ctx: AuthContext) => Promise<NextResponse>;

/**
 * Wraps a route handler with auth check, optional permission guard,
 * optional rate limiting, and catches unhandled errors.
 *
 * Usage:
 *   export const GET = withApi({ permission: 'charge:read', rateLimit: 'api' }, async (req, ctx) => {
 *     // ctx.dbUser is guaranteed here
 *   });
 */
export function withApi(opts: MiddlewareOptions, handler: Handler) {
  return async (req: NextRequest): Promise<NextResponse> => {
    try {
      // 1. Auth + permission check
      const guard = opts.permission
        ? await requirePermission(opts.permission)
        : await getApiAuthContext();

      if (!guard.ok) return guard.response;

      // 2. Rate limiting (keyed by user ID so auth is required first)
      if (opts.rateLimit) {
        const preset = RATE_LIMITS[opts.rateLimit];
        const result = checkRateLimit(guard.ctx.dbUser.id, preset.maxRequests, preset.windowMs);
        if (!result.allowed) return apiTooManyReqs(result.retryAfterMs);
      }

      return await handler(req, guard.ctx);
    } catch (e) {
      return apiServerError(e);
    }
  };
}

/**
 * Lightweight wrapper — auth only, no permission, no rate limit.
 * Use for public-facing authenticated endpoints.
 */
export function withAuth(handler: Handler) {
  return withApi({}, handler);
}
