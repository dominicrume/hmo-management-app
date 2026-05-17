import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { createServiceClient } from '@/lib/supabase/server';
import { requirePermission } from '@/lib/security/rbac';
import { checkRateLimit, RATE_LIMITS } from '@/lib/security/rate-limit';

export async function POST(req: NextRequest) {
  try {
    const guard = await requirePermission('ai:use');
    if (!guard.ok) return guard.response;

    const rl = checkRateLimit(`questions:${guard.ctx.dbUser.id}`, RATE_LIMITS.aiBrain.maxRequests, RATE_LIMITS.aiBrain.windowMs);
    if (!rl.allowed) return NextResponse.json({ error: 'Rate limit exceeded.' }, { status: 429 });

    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const { tenant_id, worker_id } = await req.json();
    if (!tenant_id) return NextResponse.json({ error: 'tenant_id required' }, { status: 400 });

    const supabase = createServiceClient();

    // Fetch last 2 weeks of session notes
    const { data: sessions } = await supabase
      .from('sessions')
      .select('session_date, session_type, notes, ai_summary, checklist_items')
      .eq('tenant_id', tenant_id)
      .order('session_date', { ascending: false })
      .limit(10);

    // Fetch tenant profile + support plan context
    const { data: tenant } = await supabase
      .from('tenants')
      .select('full_name, nationality, benefit_type, on_probation, status, moved_in')
      .eq('id', tenant_id)
      .single();

    if (!sessions?.length) {
      return NextResponse.json({
        questions: [
          'How have you been feeling since we last spoke?',
          'Have there been any changes to your housing benefit or income this week?',
          'Is there anything you need support with regarding your accommodation?',
        ],
        source: 'default',
      });
    }

    const sessionContext = sessions
      .map((s) => `[${s.session_date} — ${s.session_type}]\n${s.notes ?? s.ai_summary ?? 'No notes recorded.'}`)
      .join('\n\n');

    const prompt = `You are a professional HMO support worker assistant for Matty's Place, a supported housing service in Birmingham, UK.

Tenant: ${tenant?.full_name ?? 'Unknown'}
Background: Nationality: ${tenant?.nationality ?? 'Unknown'}, Benefits: ${tenant?.benefit_type ?? 'Unknown'}, Probation: ${tenant?.on_probation ? 'Yes' : 'No'}

Recent session notes (most recent first):
${sessionContext}

Based on these session notes, generate exactly 3 targeted follow-up questions for this week's support session. The questions should:
1. Follow up on specific issues or concerns mentioned in previous sessions
2. Check on any commitments or actions the tenant agreed to
3. Probe any wellbeing, housing, or financial risks identified

Format your response as a JSON object with a single key "questions" containing an array of exactly 3 strings. No preamble, no explanation — just the JSON.`;

    const aiResponse = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: prompt }],
    });

    const raw = aiResponse.choices[0].message.content || '';
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    const parsed = jsonMatch ? JSON.parse(jsonMatch[0]) : { questions: [raw] };

    // Store in ai_suggestions
    // ai_suggestions table does not exist in schema, skipping insert to prevent 500 crashes
    console.log('[AI questions] Successfully generated questions for tenant');

    return NextResponse.json({ questions: parsed.questions, source: 'ai' });
  } catch (e: unknown) {
    console.error('[AI questions]', e);
    return NextResponse.json({ error: e instanceof Error ? e.message : 'AI error' }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({ error: 'Method not allowed' }, { status: 405 });
}
