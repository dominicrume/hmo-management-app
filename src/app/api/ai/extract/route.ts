import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { requirePermission } from '@/lib/security/rbac';
import { checkRateLimit, RATE_LIMITS } from '@/lib/security/rate-limit';

export async function POST(req: NextRequest) {
  try {
    const guard = await requirePermission('ai:use');
    if (!guard.ok) return guard.response;

    const rl = checkRateLimit(`extract:${guard.ctx.dbUser.id}`, RATE_LIMITS.aiBrain.maxRequests, RATE_LIMITS.aiBrain.windowMs);
    if (!rl.allowed) return NextResponse.json({ error: 'Rate limit exceeded.' }, { status: 429 });

    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY || '' });
    const { text } = await req.json();

    if (!text) {
      return NextResponse.json({ error: 'No text provided' }, { status: 400 });
    }

    const SYSTEM_PROMPT = `
You are an expert AI data extraction assistant for an HMO property management system.
You will be given a raw voice transcript.
Your job is to extract any relevant tenant information from the transcript and map it strictly into this JSON schema:

{
  "full_name": string | "",
  "dob": string | "", // YYYY-MM-DD
  "nino": string | "",
  "nationality": string | "",
  "mobile": string | "",
  "room_number": string | "",
  "nok_name": string | "",
  "nok_relation": string | "",
  "nok_phone": string | "",
  "benefit_type": "UC" | "HB" | "PIP" | "ESA" | "JSA" | "None" | "Other" | "",
  "benefit_freq": "Weekly" | "Fortnightly" | "Monthly" | "4-Weekly" | "",
  "benefit_amount": string | "", // Just the number
  "doctor": string | ""
}

Rules:
1. Only return the raw JSON object. No markdown formatting, no explanations.
2. If a piece of information is not mentioned in the transcript, leave the value as an empty string "".
3. Infer the benefit type if they mention "universal credit" (UC) or "housing benefit" (HB).
`;

    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: `Please extract data from this transcript:\n\n${text}` }
      ],
    });

    const responseText = response.choices[0].message.content || '';
    
    // Clean up potential markdown code blocks
    const cleaned = responseText.replace(/^```json|^```|```$/g, '').trim();
    const parsed = JSON.parse(cleaned);

    return NextResponse.json({ data: parsed });
  } catch (error: unknown) {
    console.error('AI Extraction Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
