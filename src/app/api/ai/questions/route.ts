import { NextRequest }           from 'next/server';
import OpenAI                       from 'openai';
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

  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const response = await openai.chat.completions.create({
    model:       'gpt-4o-mini',
    temperature: 0.2,
    max_tokens:  400,
    messages: [
      { role: 'system', content: QUESTIONS_SYSTEM_PROMPT },
      { role: 'user',   content: userPrompt },
    ],
  });

  const raw = response.choices[0].message.content ?? '';

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
      model:         'gpt-4o-mini',
      tokens_used:   response.usage?.total_tokens ?? 0,
    });
  } catch { /* non-fatal */ }

  return apiOk({ questions, source: 'ai' });
});

export async function GET() {
  const { NextResponse } = await import('next/server');
  return NextResponse.json({ error: 'Method not allowed' }, { status: 405 });
}
