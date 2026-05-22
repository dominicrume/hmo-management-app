import { NextRequest }           from 'next/server';
import OpenAI                    from 'openai';
import { withApi }               from '@/lib/api/middleware';
import { apiOk, apiBadRequest }  from '@/lib/api/response';
import { validate, firstError }  from '@/lib/api/validate';
import { EXTRACT_SYSTEM_PROMPT } from '@/lib/ai/prompts';

// POST /api/ai/extract — extract structured tenant data from voice transcript
// Intentionally uses GPT-4o-mini: optimised for structured JSON extraction
export const POST = withApi({ permission: 'ai:use', rateLimit: 'aiBrain' }, async (req: NextRequest) => {
  const body = await req.json();
  const err  = firstError(validate(body, {
    text:      { type: 'string', required: true, minLength: 5 },
    tenant_id: { type: 'uuid' },
  }));
  if (err) return apiBadRequest(err);

  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

  const response = await openai.chat.completions.create({
    model:       'gpt-4o-mini',
    temperature: 0,
    messages: [
      { role: 'system', content: EXTRACT_SYSTEM_PROMPT },
      { role: 'user',   content: `Extract from this transcript:\n\n${body.text}` },
    ],
  });

  const raw     = response.choices[0].message.content ?? '';
  const cleaned = raw.replace(/^```json|^```|```$/gm, '').trim();

  let data: Record<string, string> = {};
  try {
    data = JSON.parse(cleaned);
  } catch {
    return apiBadRequest('AI returned unparseable output — try again');
  }

  // Remove empty strings so we don't overwrite good data with empties
  const cleanData: Record<string, string> = {};
  for (const [k, v] of Object.entries(data)) {
    if (v && v.trim() !== '') {
      cleanData[k] = v;
    }
  }

  if (body.tenant_id && Object.keys(cleanData).length > 0) {
    const { createServiceClient } = await import('@/lib/supabase/server');
    const svc = createServiceClient();
    await svc.from('tenants').update(cleanData).eq('id', body.tenant_id);
  }

  return apiOk({ data: cleanData });
});

export async function GET() {
  const { NextResponse } = await import('next/server');
  return NextResponse.json({ error: 'Method not allowed' }, { status: 405 });
}
