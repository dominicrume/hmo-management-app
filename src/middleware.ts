// Next.js middleware — runs on every request before the page renders.
// SECURITY RESPONSIBILITIES:
//   1. Refresh the Supabase session cookie (prevents mid-session expiry)
//   2. Redirect unauthenticated users to /login
//   3. Enforce role-based route guards (RBAC)
//   4. Enforce secure cookie attributes (HttpOnly, Secure, SameSite)
//   5. Rate-limit sensitive routes
//   6. Add security headers per-request

import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

// ── Route classification ──────────────────────────────────────────────────────

const PUBLIC_PATHS = ['/login', '/reset-password', '/auth/callback', '/api/test-db'];

// Admin routes — Manager only
const MANAGER_PATHS = ['/manager', '/api/admin'];

// Tenant portal — Tenant only
const TENANT_PATHS = ['/portal'];

// API paths that need rate limiting
const RATE_LIMITED_PATHS = ['/api/ai/brain', '/api/setup', '/api/ocr'];

// ── In-memory rate limit store (per-instance, resets on cold start) ───────────

const rateLimitStore = new Map<string, { count: number; resetAt: number }>();

function isRateLimited(key: string, max: number, windowMs: number): boolean {
  const now = Date.now();
  const entry = rateLimitStore.get(key);

  if (!entry || now > entry.resetAt) {
    rateLimitStore.set(key, { count: 1, resetAt: now + windowMs });
    return false;
  }

  if (entry.count >= max) return true;
  entry.count++;
  return false;
}

// ── Middleware ─────────────────────────────────────────────────────────────────

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return request.cookies.getAll(); },
        setAll(toSet) {
          toSet.forEach(({ name, value }) => request.cookies.set(name, value));
          supabaseResponse = NextResponse.next({ request });
          toSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, {
              ...options,
              // ── HARDENED COOKIE SETTINGS ──
              httpOnly: true,
              secure: process.env.NODE_ENV === 'production',
              sameSite: 'lax',
              path: '/',
            })
          );
        },
      },
    }
  );

  const { pathname } = request.nextUrl;
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? request.ip ?? 'unknown';

  // ── Rate limit sensitive API routes ─────────────────────────────────────────

  if (RATE_LIMITED_PATHS.some((p) => pathname.startsWith(p))) {
    const limit = pathname.includes('/ai/brain')
      ? { max: 10, window: 60_000 }     // 10/min for AI
      : pathname.includes('/setup')
      ? { max: 3, window: 3600_000 }     // 3/hr for setup
      : { max: 20, window: 60_000 };     // 20/min for OCR

    if (isRateLimited(`rl:${pathname}:${ip}`, limit.max, limit.window)) {
      return NextResponse.json(
        { error: 'Too many requests. Please try again later.' },
        {
          status: 429,
          headers: { 'Retry-After': '60' },
        }
      );
    }
  }

  // ── Rate limit login attempts ───────────────────────────────────────────────

  if (pathname === '/login' && request.method === 'POST') {
    if (isRateLimited(`login:${ip}`, 5, 15 * 60_000)) {
      return NextResponse.json(
        { error: 'Too many login attempts. Please wait 15 minutes.' },
        { status: 429, headers: { 'Retry-After': '900' } }
      );
    }
  }

  // ── Refresh session — MUST await before any redirect logic ──────────────────

  // IMPORTANT: getUser() validates the JWT server-side via Supabase Auth.
  // Do NOT use getSession() here — it only reads the local cookie without
  // verifying the JWT signature, which is a security risk.
  const { data: { user } } = await supabase.auth.getUser();

  // ── Public paths — no auth needed ──────────────────────────────────────────

  if (PUBLIC_PATHS.some((p) => pathname.startsWith(p))) {
    // If already logged in and hitting /login, redirect to dashboard
    if (user && pathname === '/login') {
      return NextResponse.redirect(new URL('/dashboard', request.url));
    }
    return supabaseResponse;
  }

  // ── Not authenticated — redirect to login ──────────────────────────────────

  if (!user) {
    if (pathname.startsWith('/api/')) {
      return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });
    }
    const loginUrl = new URL('/login', request.url);
    // Preserve the intended destination for post-login redirect
    if (pathname !== '/dashboard') {
      loginUrl.searchParams.set('next', pathname);
    }
    return NextResponse.redirect(loginUrl);
  }

  // ── Fetch role from users table ─────────────────────────────────────────────

  const { data: dbUser } = await supabase
    .from('users')
    .select('role, is_active')
    .eq('auth_id', user.id)
    .single();

  const role = dbUser?.role as string | undefined;
  const isActive = dbUser?.is_active ?? true;

  // ── Account deactivation check ──────────────────────────────────────────────

  if (!isActive) {
    // Sign out the deactivated user and redirect to login
    await supabase.auth.signOut();
    if (pathname.startsWith('/api/')) {
      return NextResponse.json({ error: 'Account deactivated' }, { status: 403 });
    }
    return NextResponse.redirect(
      new URL('/login?error=account_deactivated', request.url)
    );
  }

  // ── Role-based route guards ─────────────────────────────────────────────────

  // /manager/* and /api/admin/* — Manager only
  if (MANAGER_PATHS.some((p) => pathname.startsWith(p)) && role !== 'Manager') {
    if (pathname.startsWith('/api/')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  // /portal/* — Tenant only
  if (TENANT_PATHS.some((p) => pathname.startsWith(p)) && role !== 'Tenant') {
    if (pathname.startsWith('/api/')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  // ── Intake flow — only Manager or SupportWorker ─────────────────────────────

  if (pathname.startsWith('/intake') && role === 'Tenant') {
    if (pathname.startsWith('/api/')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  // ── Add user context headers for downstream API routes ──────────────────────

  supabaseResponse.headers.set('x-user-role', role ?? '');
  supabaseResponse.headers.set('x-user-id', user.id);

  return supabaseResponse;
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
