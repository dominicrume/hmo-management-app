// Next.js middleware — runs on every request before the page renders.
// Responsibilities:
//   1. Refresh the Supabase session cookie so it doesn't expire mid-session.
//   2. Redirect unauthenticated users to /login.
//   3. Enforce role-based route guards:
//        /dashboard/** → any authenticated user
//        /manager/**   → Manager only
//        /portal/**    → Tenant only

import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

const PUBLIC_PATHS = ['/login', '/signup', '/reset-password', '/auth/callback'];

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll()         { return request.cookies.getAll(); },
        setAll(toSet)    {
          toSet.forEach(({ name, value }) => request.cookies.set(name, value));
          supabaseResponse = NextResponse.next({ request });
          toSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // Refresh session — must await before any redirect logic.
  const { data: { user } } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;

  // Allow public paths through without auth.
  if (PUBLIC_PATHS.some((p) => pathname.startsWith(p))) {
    // If already logged in and hitting /login, send to dashboard.
    if (user && pathname === '/login') {
      return NextResponse.redirect(new URL('/dashboard', request.url));
    }
    return supabaseResponse;
  }

  // Not logged in — redirect to login.
  if (!user) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  // Fetch role from users table for route-level enforcement.
  const { data: dbUser } = await supabase
    .from('users')
    .select('role')
    .eq('auth_id', user.id)
    .single();

  const role = dbUser?.role as string | undefined;

  // /manager/* — Manager only.
  if (pathname.startsWith('/manager') && role !== 'Manager') {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  // /portal/* — Tenant only.
  if (pathname.startsWith('/portal') && role !== 'Tenant') {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
