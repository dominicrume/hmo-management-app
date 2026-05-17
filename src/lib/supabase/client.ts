// Browser Supabase client — used in 'use client' components.
// Creates one instance per browser session (singleton via module cache).
//
// SECURITY:
//   - Uses ANON key only (never service role in the browser)
//   - Validates env vars are present to prevent silent failures

import { createBrowserClient } from '@supabase/ssr';

let client: ReturnType<typeof createBrowserClient> | null = null;

export function createClient() {
  if (client) return client;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !key) {
    throw new Error(
      '[SECURITY] Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY. ' +
      'Check your environment configuration.'
    );
  }

  client = createBrowserClient(url, key);
  return client;
}
