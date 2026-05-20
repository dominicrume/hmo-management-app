import { NextRequest }           from 'next/server';
import { withApi }               from '@/lib/api/middleware';
import { apiOk, apiBadRequest }  from '@/lib/api/response';
import { validate, firstError }  from '@/lib/api/validate';
import { runAITask }             from '@/lib/ai/orchestrator';
import type { AuthContext }      from '@/lib/security/rbac';

// POST /api/ai/brain — main agentic AI endpoint with memory + tool calling
export const POST = withApi({ permission: 'ai:use', rateLimit: 'aiBrain' }, async (req: NextRequest, ctx: AuthContext) => {
  const body = await req.json();
  const err  = firstError(validate(body, {
    tenant_id:   { type: 'uuid',   required: true },
    task:        { type: 'string', required: true, minLength: 1, maxLength: 2000 },
    task_type:   { type: 'string' },
    session_key: { type: 'string' },
  }));
  if (err) return apiBadRequest(err);

  const result = await runAITask({
    tenantId:   body.tenant_id,
    workerId:   ctx.dbUser.id,
    actorName:  ctx.dbUser.full_name,
    actorRole:  ctx.dbUser.role,
    task:       body.task,
    taskType:   body.task_type ?? 'brain',
    sessionKey: body.session_key,
  });

  return apiOk({
    response:     result.response,
    risk_detected: result.riskDetected,
    risk_summary:  result.riskSummary,
    tool_calls:    result.toolCalls,
    verified:      result.verification.passed,
    warnings:      result.verification.warnings,
    tokens:        result.tokensUsed,
    model:         result.model,
    latency_ms:    result.latencyMs,
  });
});

export async function GET() {
  const { NextResponse } = await import('next/server');
  return NextResponse.json({ error: 'Method not allowed' }, { status: 405 });
}
