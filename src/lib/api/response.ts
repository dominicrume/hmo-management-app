import { NextResponse } from 'next/server';

// Standard JSON responses — all routes use these so the shape is always consistent.

export function apiOk<T>(data: T, status = 200): NextResponse {
  return NextResponse.json(data, { status });
}

export function apiErr(message: string, status: number): NextResponse {
  return NextResponse.json({ error: message }, { status });
}

// Typed error shortcuts
export const apiUnauthorised = () => apiErr('Authentication required', 401);
export const apiForbidden    = (p?: string) => apiErr(p ? `Forbidden: requires '${p}' permission` : 'Forbidden', 403);
export const apiBadRequest   = (msg: string) => apiErr(msg, 400);
export const apiNotFound     = (thing = 'Resource') => apiErr(`${thing} not found`, 404);
export const apiTooManyReqs  = (retryAfterMs: number) =>
  NextResponse.json(
    { error: 'Too many requests. Try again later.' },
    { status: 429, headers: { 'Retry-After': String(Math.ceil(retryAfterMs / 1000)) } },
  );
export const apiServerError  = (e: unknown) =>
  apiErr(e instanceof Error ? e.message : 'Internal server error', 500);
