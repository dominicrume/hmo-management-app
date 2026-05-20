import { NextRequest }           from 'next/server';
import Anthropic                 from '@anthropic-ai/sdk';
import { withApi }               from '@/lib/api/middleware';
import { apiOk, apiBadRequest }  from '@/lib/api/response';
import { validate, firstError }  from '@/lib/api/validate';
import { buildTenantContext }    from '@/lib/ai/context';
import { QUESTIONS_SYSTEM_PROMPT } from '@/lib/ai/prompts';
import { createServiceClient }   from '@/lib/supabase/server';
import type { AuthContext }      from '@/lib/security/rbac';

// POST /api/ai/questions — generate 3 targeted session follow-up questions
export const POST = withApi({ permission: 'ai:use', rateLimit: 'aiBrain' }, async (req: NextRequest, ctx: AuthContext) => {
  const body = await req.json();
  const err  = firstError(validate(body, {
    tenant_id: { type: 'uuid', required: true },
  }));
  if (err) return apiBadRequest(err);

  const tenantCtx = await buildTenantContext(body.tenant_id);

  // No sessions yet — return safe defaults
  if (!tenantCtx.sessions.length) {
    return apiOk({
      questions: [
        'How have you been feeling since we last spoke?',
        'Have there been any changes to your housing benefit or income this week?',
        'Is there anything you need support with regarding your accommodation?',
      ],
      source: 'default',
    });
  }

  const sessionContext = tenantCtx.sessions
    .slice(0, 10)
    .map((s) => `[${s.session_date} — ${s.session_type}]\n${s.notes ?? s.ai_summary ?? 'No notes.'}`)
    .join('\n\n');

  const p = tenantCtx.profile ?? {};
  const userPrompt = `Tenant: ${p.full_name} | Benefits: ${p.benefit_type} | Probation: ${p.on_probation ? 'Yes' : 'No'}\n\nRecent sessions (newest first):\n${sessionContext}`;

  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  const response  = await anthropic.messages.create({
    model:      'claude-haiku-4-5-20251001',
    max_tokens: 400,
    system:     QUESTIONS_SYSTEM_PROMPT,
    messages:   [{ role: 'user', content: userPrompt }],
  });

  const textBlock = response.content.find((b) => b.type === 'text');
  const raw       = textBlock?.type === 'text' ? textBlock.text : '';

  let questions: string[] = [];
  try {
    const match = raw.match(/\{[\s\S]*\}/);
    questions = match ? JSON.parse(match[0]).questions : [raw];
  } catch {
    questions = [raw];
  }

  // Store in ai_suggestions
  try {
    const svc = createServiceClient();
    await svc.from('ai_suggestions').insert({
      tenant_id:     body.tenant_id,
      worker_id:     ctx.dbUser.id,
      task_type:     'questions',
      response:      JSON.stringify(questions),
      risk_detected: false,
      model:         'claude-haiku-4-5-20251001',
      tokens_used:   response.usage.input_tokens + response.usage.output_tokens,
    });
  } catch { /* non-fatal */ }

  return apiOk({ questions, source: 'ai' });
});

export async function GET() {
  const { NextResponse } = await import('next/server');
  return NextResponse.json({ error: 'Method not allowed' }, { status: 405 });
}
