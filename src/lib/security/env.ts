// Environment validation — crashes at startup if critical env vars are missing.
// This prevents the app from running in a misconfigured state where auth
// would silently fail, exposing routes without protection.

const REQUIRED_SERVER = [
  'NEXT_PUBLIC_SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY',
  'SUPABASE_SERVICE_ROLE_KEY',
] as const;

const REQUIRED_CLIENT = [
  'NEXT_PUBLIC_SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY',
] as const;

export function validateServerEnv(): void {
  const missing = REQUIRED_SERVER.filter((k) => !process.env[k]);
  if (missing.length > 0) {
    throw new Error(
      `[SECURITY] Missing required environment variables: ${missing.join(', ')}. ` +
      `The application cannot start safely without these. ` +
      `Set them in .env.local or your deployment environment.`
    );
  }
}

export function validateClientEnv(): void {
  const missing = REQUIRED_CLIENT.filter((k) => !process.env[k]);
  if (missing.length > 0) {
    console.error(
      `[SECURITY] Missing client environment variables: ${missing.join(', ')}. ` +
      `Auth will not work.`
    );
  }
}

// Cookie security defaults — used by both middleware and server client
export const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax' as const,
  path: '/',
  // 7 day max session lifetime
  maxAge: 60 * 60 * 24 * 7,
};
