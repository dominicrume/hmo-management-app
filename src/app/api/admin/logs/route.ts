import { NextRequest }        from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';
import { withApi }             from '@/lib/api/middleware';
import { apiOk }               from '@/lib/api/response';

// GET /api/admin/logs?level=error&route=&limit=100
// Manager-only — returns structured system_logs entries, newest first.
export const GET = withApi({ permission: 'settings:manage', rateLimit: 'api' }, async (req: NextRequest) => {
  const { searchParams } = new URL(req.url);
  const level  = searchParams.get('level');   // debug | info | warn | error
  const route  = searchParams.get('route');
  const limit  = Math.min(parseInt(searchParams.get('limit') ?? '100'), 500);

  const svc = createServiceClient();
  let query = svc
    .from('system_logs')
    .select('id, level, route, method, actor_id, message, meta, status_code, duration_ms, created_at')
    .order('created_at', { ascending: false })
    .limit(limit);

  if (level)  query = query.eq('level', level);
  if (route)  query = query.ilike('route', `%${route}%`);

  const { data, error } = await query;
  if (error) throw error;
  return apiOk(data ?? []);
});
