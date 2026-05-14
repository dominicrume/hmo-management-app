import { NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY || '',
});

export async function POST(req: Request) {
  try {
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

    const message = await anthropic.messages.create({
      model: 'claude-3-haiku-20240307',
      max_tokens: 1024,
      system: SYSTEM_PROMPT,
      messages: [
        { role: 'user', content: `Please extract data from this transcript:\n\n${text}` }
      ],
    });

    const responseText = (message.content[0] as any).text.trim();
    
    // Clean up potential markdown code blocks
    const cleaned = responseText.replace(/^```json|^```|```$/g, '').trim();
    const parsed = JSON.parse(cleaned);

    return NextResponse.json({ data: parsed });
  } catch (error: any) {
    console.error('AI Extraction Error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
