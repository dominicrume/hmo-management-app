// Structured logger — writes to system_logs table via service role.
// All writes are fire-and-forget so log failures never block API responses.

import { createServiceClient } from '@/lib/supabase/server';

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogParams {
  message:      string;
  route?:       string;
  method?:      string;
  actorId?:     string;
  statusCode?:  number;
  durationMs?:  number;
  meta?:        Record<string, unknown>;
}

async function write(level: LogLevel, params: LogParams): Promise<void> {
  // Always mirror to console so Cloud Run / Vercel captures it too
  const consoleFn = level === 'error' ? console.error
    : level === 'warn'  ? console.warn
    : console.log;
  consoleFn(`[${level.toUpperCase()}] ${params.message}`, params.meta ?? '');

  try {
    const svc = createServiceClient();
    await svc.from('system_logs').insert({
      level,
      route:       params.route       ?? null,
      method:      params.method      ?? null,
      actor_id:    params.actorId     ?? null,
      message:     params.message,
      meta:        params.meta        ?? null,
      status_code: params.statusCode  ?? null,
      duration_ms: params.durationMs  ?? null,
    });
  } catch {
    // Never let a log write crash the app
    console.error('[logger] Failed to write to system_logs');
  }
}

export const log = {
  debug: (message: string, params?: Omit<LogParams, 'message'>) =>
    write('debug', { message, ...params }),
  info:  (message: string, params?: Omit<LogParams, 'message'>) =>
    write('info',  { message, ...params }),
  warn:  (message: string, params?: Omit<LogParams, 'message'>) =>
    write('warn',  { message, ...params }),
  error: (message: string, params?: Omit<LogParams, 'message'>) =>
    write('error', { message, ...params }),
};
