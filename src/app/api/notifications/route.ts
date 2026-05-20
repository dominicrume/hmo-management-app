import { NextRequest }                        from 'next/server';
import { createServiceClient }               from '@/lib/supabase/server';
import { withApi }                           from '@/lib/api/middleware';
import { apiOk, apiBadRequest, apiNotFound } from '@/lib/api/response';
import { validate, firstError }              from '@/lib/api/validate';
import type { AuthContext }                  from '@/lib/security/rbac';

// GET /api/notifications?unread_only=true&limit=50
// Returns the authenticated user's notifications, newest first.
export const GET = withApi({ permission: 'notification:read', rateLimit: 'api' }, async (req: NextRequest, ctx: AuthContext) => {
  const { searchParams } = new URL(req.url);
  const unreadOnly = searchParams.get('unread_only') === 'true';
  const limit      = Math.min(parseInt(searchParams.get('limit') ?? '50'), 200);

  const svc = createServiceClient();
  let query = svc
    .from('notifications')
    .select('*')
    .eq('recipient_id', ctx.dbUser.id)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (unreadOnly) query = query.eq('is_read', false);

  const { data, error } = await query;
  if (error) throw error;
  return apiOk(data ?? []);
});

// POST /api/notifications — create a notification for a specific staff member (Manager only)
export const POST = withApi({ permission: 'notification:write', rateLimit: 'api' }, async (req: NextRequest, ctx: AuthContext) => {
  const body = await req.json();
  const err = firstError(validate(body, {
    recipient_id: { type: 'uuid',   required: true },
    title:        { type: 'string', required: true, minLength: 1, maxLength: 120 },
    body:         { type: 'string', required: true, minLength: 1, maxLength: 500 },
    type:         { type: 'string', enum: ['rent_overdue','session_due','risk_flag','form_submitted','tenant_added','system'] },
    tenant_id:    { type: 'uuid' },
    link:         { type: 'string', maxLength: 300 },
  }));
  if (err) return apiBadRequest(err);

  const svc = createServiceClient();
  const { data, error } = await svc
    .from('notifications')
    .insert({
      recipient_id: body.recipient_id,
      tenant_id:    body.tenant_id ?? null,
      type:         body.type ?? 'system',
      title:        body.title,
      body:         body.body,
      link:         body.link ?? null,
    })
    .select()
    .single();

  if (error) throw error;

  // Audit
  await svc.from('audit_logs').insert({
    actor_id:    ctx.dbUser.id,
    actor_name:  ctx.dbUser.full_name,
    actor_role:  ctx.dbUser.role,
    tenant_id:   body.tenant_id ?? null,
    table_name:  'notifications',
    record_id:   data.id,
    action:      'CREATE',
    entry_method: 'manual',
    new_data:    { title: body.title, type: body.type },
    diff_fields: ['title', 'body', 'type'],
  });

  return apiOk(data, 201);
});

// PATCH /api/notifications — mark one or all as read
export const PATCH = withApi({ permission: 'notification:write', rateLimit: 'api' }, async (req: NextRequest, ctx: AuthContext) => {
  const body = await req.json();
  // id = single notification; mark_all_read = true = bulk mark
  const { id, mark_all_read } = body as { id?: string; mark_all_read?: boolean };

  const svc = createServiceClient();

  if (mark_all_read) {
    const { error } = await svc
      .from('notifications')
      .update({ is_read: true, read_at: new Date().toISOString() })
      .eq('recipient_id', ctx.dbUser.id)
      .eq('is_read', false);

    if (error) throw error;
    return apiOk({ ok: true, marked: 'all' });
  }

  if (!id) return apiBadRequest("'id' or 'mark_all_read' is required");

  const { data, error } = await svc
    .from('notifications')
    .update({ is_read: true, read_at: new Date().toISOString() })
    .eq('id', id)
    .eq('recipient_id', ctx.dbUser.id) // users can only mark their own
    .select()
    .single();

  if (error) throw error;
  if (!data) return apiNotFound('Notification');
  return apiOk(data);
});
