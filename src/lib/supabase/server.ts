// Server Supabase client — used in Server Components, Route Handlers, middleware.
// Reads cookies from the request to restore the user session.
// Never runs in the browser.
//
// SECURITY:
//   - Uses HttpOnly, Secure, SameSite cookie settings
//   - Service client bypasses RLS — only for admin operations
//   - Environment validation prevents silent auth failures

import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';

const isProduction = process.env.NODE_ENV === 'production';

// ── User-scoped client (respects RLS) ─────────────────────────────────────────

export function createClient() {
  const cookieStore = cookies();

  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    if (process.env.NEXT_PUBLIC_USE_LOCAL_DATA === 'true') {
      return createServerClient('https://mock.supabase.co', 'mock-key', { cookies: { getAll: () => [], setAll: () => {} } });
    }
    throw new Error(
      '[SECURITY] Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY. ' +
      'Auth cannot function without these. Check your .env.local file.'
    );
  }

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() { return cookieStore.getAll(); },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, {
                ...options,
                httpOnly: true,
                secure: isProduction,
                sameSite: 'lax',
                path: '/',
              })
            );
          } catch {
            // Called from a Server Component — cookie mutation is handled by middleware.
          }
        },
      },
    }
  );
}

// ── Service-role client (bypasses RLS) ────────────────────────────────────────
// SECURITY: Only use for audit log writes, admin operations, and cross-tenant
// queries where the acting user's JWT must not restrict the result.
// NEVER expose service-role operations to the client.

export function createServiceClient() {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    if (process.env.NEXT_PUBLIC_USE_LOCAL_DATA === 'true') {
      return createSupabaseClient('https://mock.supabase.co', 'mock-key', { auth: { persistSession: false, autoRefreshToken: false } });
    }
    throw new Error(
      '[SECURITY] Missing SUPABASE_SERVICE_ROLE_KEY. ' +
      'Service-role operations require this key. Check your .env.local file.'
    );
  }

  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      }
    }
  );
}
