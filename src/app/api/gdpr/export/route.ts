import { NextRequest }            from 'next/server';
import { withApi }                from '@/lib/api/middleware';
import { apiOk, apiBadRequest }   from '@/lib/api/response';
import { validate, firstError }   from '@/lib/api/validate';
import { exportTenantData }       from '@/lib/compliance/gdpr';
import { createServiceClient }    from '@/lib/supabase/server';
import { writeAuditLog }          from '@/lib/dal/auditLogs';
import type { AuthContext }       from '@/lib/security/rbac';

// GET /api/gdpr/export?tenant_id=<uuid>
// Subject Access Request (GDPR Art. 15) — returns everything held about a tenant.
// Manager only. Creates a DSR record and audit log.
export const GET = withApi({ permission: 'user:manage', rateLimit: 'api' }, async (req: NextRequest, ctx: AuthContext) => {
  const tenantId = req.nextUrl.searchParams.get('tenant_id');
  const err = firstError(validate({ tenant_id: tenantId }, {
    tenant_id: { type: 'uuid', required: true },
  }));
  if (err) return apiBadRequest(err);

  const svc  = createServiceClient();
  const data = await exportTenantData(tenantId!);

  // Create DSR record
  await svc.from('data_subject_requests').insert({
    tenant_id:    tenantId,
    type:         'access',
    status:       'completed',
    requested_by: ctx.dbUser.id,
    handled_by:   ctx.dbUser.id,
    completed_at: new Date().toISOString(),
    handler_notes: 'SAR export generated via /api/gdpr/export',
  });

  // Audit
  await writeAuditLog({
    actorId:   ctx.dbUser.id,
    actorName: ctx.dbUser.full_name,
    actorRole: ctx.dbUser.role,
    tenantId:  tenantId!,
    tableName: 'data_subject_requests',
    recordId:  tenantId!,
    action:    'EXPORT',
    entryMethod: 'manual',
    newData: { type: 'access', exported_at: data.exported_at },
  });

  return apiOk(data);
});
