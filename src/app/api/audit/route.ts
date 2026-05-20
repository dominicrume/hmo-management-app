import { NextRequest }   from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';
import { withApi }       from '@/lib/api/middleware';
import { apiOk }         from '@/lib/api/response';

// GET /api/audit?tenant_id=&limit=
export const GET = withApi({ permission: 'audit:read', rateLimit: 'api' }, async (req: NextRequest) => {
  const { searchParams } = new URL(req.url);
  const tenantId = searchParams.get('tenant_id');
  const limit    = Math.min(parseInt(searchParams.get('limit') ?? '100'), 500);

  const svc = createServiceClient();
  let query = svc
    .from('audit_logs')
    .select('*')
    .order('stamped_at', { ascending: false })
    .limit(limit);

  if (tenantId) query = query.eq('tenant_id', tenantId);

  const { data, error } = await query;
  if (error) throw error;
  return apiOk(data ?? []);
});
