import { NextRequest }                from 'next/server';
import { withApi }                   from '@/lib/api/middleware';
import { apiOk, apiBadRequest }      from '@/lib/api/response';
import { validate, firstError }      from '@/lib/api/validate';
import { recordConsent, getEffectiveConsent } from '@/lib/compliance/gdpr';
import { createServiceClient }       from '@/lib/supabase/server';
import type { AuthContext }          from '@/lib/security/rbac';

const CONSENT_TYPES = ['data_processing', 'ai_profiling', 'sharing_council', 'sharing_dwp', 'marketing'] as const;
const POLICY_VERSION = 'v1.0';

// GET /api/gdpr/consent?tenant_id=&type=
export const GET = withApi({ permission: 'tenant:read', rateLimit: 'api' }, async (req: NextRequest) => {
  const { searchParams } = new URL(req.url);
  const tenantId   = searchParams.get('tenant_id');
  const consentType = searchParams.get('type');

  if (!tenantId) return apiBadRequest('tenant_id required');

  if (consentType) {
    const status = await getEffectiveConsent(tenantId, consentType);
    return apiOk({ tenant_id: tenantId, consent_type: consentType, status });
  }

  // Return all consent statuses for this tenant
  const svc = createServiceClient();
  const { data } = await svc
    .from('consent_log')
    .select('consent_type, policy_version, granted, method, stamped_at')
    .eq('tenant_id', tenantId)
    .order('stamped_at', { ascending: false });

  return apiOk({ tenant_id: tenantId, history: data ?? [] });
});

// POST /api/gdpr/consent — record consent grant or withdrawal
export const POST = withApi({ permission: 'tenant:update', rateLimit: 'api' }, async (req: NextRequest, ctx: AuthContext) => {
  const body = await req.json();
  const err  = firstError(validate(body, {
    tenant_id:    { type: 'uuid',    required: true },
    consent_type: { type: 'string',  required: true, enum: CONSENT_TYPES },
    granted:      { type: 'boolean', required: true },
    notes:        { type: 'string' },
  }));
  if (err) return apiBadRequest(err);

  await recordConsent({
    tenantId:      body.tenant_id,
    consentType:   body.consent_type,
    policyVersion: POLICY_VERSION,
    granted:       body.granted,
    method:        'staff_recorded',
    staffWitness:  ctx.dbUser.id,
    notes:         body.notes,
  });

  return apiOk({
    recorded: true,
    tenant_id:    body.tenant_id,
    consent_type: body.consent_type,
    granted:      body.granted,
    policy_version: POLICY_VERSION,
  });
});
