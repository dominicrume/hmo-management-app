import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export interface VisionOCRResult {
  raw_text: string;
  confidence: number;
  extracted: Record<string, string>;
  warnings: string[];
}

export async function callClaudeVisionOCR(
  imageBase64: string,
  mimeType: string = 'image/jpeg'
): Promise<VisionOCRResult> {
  const prompt = `You are an expert OCR and data extraction system for Matty\'s Place (a UK HMO supported housing service).
Extract the following fields from the provided document image.
Return ONLY a JSON object matching this exact schema (use null if a field is missing or unreadable):
{
  "full_name": "...",
  "dob": "YYYY-MM-DD",
  "nino": "AB 12 34 56 C",
  "nationality": "...",
  "room_number": "...",
  "email": "...",
  "mobile": "...",
  "date_entry_uk": "YYYY-MM-DD",
  "languages": "...",
  "benefit_type": "...",
  "nok_name": "...",
  "nok_relation": "...",
  "nok_phone": "...",
  "doctor": "..."
}`;

  let contentBlock: any;

  if (mimeType === 'application/pdf') {
    contentBlock = {
      type: 'document',
      source: {
        type: 'base64',
        media_type: 'application/pdf',
        data: imageBase64,
      }
    };
  } else {
    contentBlock = {
      type: 'image',
      source: {
        type: 'base64',
        media_type: mimeType as any,
        data: imageBase64,
      }
    };
  }

  const message = await anthropic.messages.create({
    model: 'claude-3-sonnet-20240229',
    max_tokens: 1024,
    temperature: 0,
    messages: [
      {
        role: 'user',
        content: [
          contentBlock,
          { type: 'text', text: prompt }
        ]
      }
    ]
  });

  const rawText = message.content[0].type === 'text' ? message.content[0].text : '';
  
  let extracted = {};
  try {
    // Claude might wrap JSON in markdown block
    const jsonStr = rawText.replace(/```json\n?|```/g, '').trim();
    extracted = JSON.parse(jsonStr);
  } catch (e) {
    console.error("Failed to parse Claude OCR JSON", rawText);
  }

  const warnings: string[] = [];
  const expected = ['full_name', 'dob', 'nino', 'nationality', 'mobile'];
  for (const field of expected) {
    if (!(extracted as any)[field]) {
      warnings.push(`Could not extract "${field}" — please enter manually.`);
    }
  }

  return {
    raw_text: JSON.stringify(extracted, null, 2), // Since Claude isn't returning raw text, just use JSON
    confidence: 95,
    extracted,
    warnings,
  };
}
