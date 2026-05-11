// Google Vision API — OCR extraction for uploaded physical Ash Shahada forms.
// Called server-side only via /api/ocr/route.ts.
// Returns raw text + field-mapped extraction for Form 3 (Personal Details).

export interface VisionOCRResult {
  raw_text: string;
  confidence: number;
  extracted: ExtractedFields;
  warnings: string[];   // fields where OCR confidence is low
}

export interface ExtractedFields {
  full_name?:      string;
  dob?:            string;   // normalised to YYYY-MM-DD
  nino?:           string;   // normalised to "AB 12 34 56 C"
  nationality?:    string;
  address?:        string;
  room_number?:    string;
  email?:          string;
  mobile?:         string;
  date_entry_uk?:  string;
  languages?:      string;
  benefit_type?:   string;
  nok_name?:       string;
  nok_relation?:   string;
  nok_phone?:      string;
  doctor?:         string;
}

// ── Regex patterns for field extraction from raw OCR text ────────────────────

const PATTERNS = {
  full_name:    /(?:full\s*(?:legal\s*)?name|name)[:\s]+([A-Za-z\s\-']{2,50})/i,
  nino:         /(?:national\s*insurance|nino|n\.i\.?)[:\s]*([A-Z]{2}\s?\d{2}\s?\d{2}\s?\d{2}\s?[A-D])/i,
  dob:          /(?:date\s*of\s*birth|d\.?o\.?b)[:\s]*(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4})/i,
  mobile:       /(?:mobile|phone|tel)[:\s]*(\+?[\d\s\-]{10,15})/i,
  email:        /([a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,})/i,
  room_number:  /(?:room|unit|flat)[:\s]*([\w\d]{1,5})/i,
  nationality:  /(?:nationality)[:\s]*([A-Za-z\s]{2,30})/i,
  nok_name:     /(?:next\s*of\s*kin|nok|emergency\s*contact)[:\s]+([A-Za-z\s\-']{2,50})/i,
  doctor:       /(?:gp|doctor|surgery)[:\s]+([A-Za-z\s\-']{2,60})/i,
};

// Normalise DD/MM/YYYY or DD-MM-YYYY to YYYY-MM-DD
function normaliseDate(raw: string): string | undefined {
  const m = raw.match(/(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{2,4})/);
  if (!m) return undefined;
  const [, d, mo, y] = m;
  const year = y.length === 2 ? `20${y}` : y;
  return `${year}-${mo.padStart(2, '0')}-${d.padStart(2, '0')}`;
}

// Normalise NINO spacing
function normaliseNINO(raw: string): string {
  const clean = raw.replace(/\s/g, '').toUpperCase();
  return clean.replace(/^(.{2})(.{2})(.{2})(.{2})(.{1})$/, '$1 $2 $3 $4 $5');
}

// ── Field extractor ──────────────────────────────────────────────────────────

export function extractFieldsFromText(rawText: string): ExtractedFields {
  const extracted: ExtractedFields = {};

  for (const [field, pattern] of Object.entries(PATTERNS)) {
    const match = rawText.match(pattern);
    if (!match?.[1]) continue;
    const value = match[1].trim();

    switch (field as keyof ExtractedFields) {
      case 'dob':
        extracted.dob = normaliseDate(value);
        break;
      case 'nino':
        extracted.nino = normaliseNINO(value);
        break;
      default:
        (extracted as Record<string, string>)[field] = value;
    }
  }

  return extracted;
}

// ── Google Vision API call ───────────────────────────────────────────────────

export async function callGoogleVisionOCR(
  imageBase64: string,
  mimeType: string = 'image/jpeg'
): Promise<VisionOCRResult> {
  const apiKey = process.env.GOOGLE_VISION_API_KEY;
  if (!apiKey) {
    throw new Error('GOOGLE_VISION_API_KEY environment variable is not set.');
  }

  const body = {
    requests: [
      {
        image:    { content: imageBase64 },
        features: [{ type: 'DOCUMENT_TEXT_DETECTION', maxResults: 1 }],
        imageContext: { languageHints: ['en'] },
      },
    ],
  };

  const response = await fetch(
    `https://vision.googleapis.com/v1/images:annotate?key=${apiKey}`,
    {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify(body),
    }
  );

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Google Vision API error ${response.status}: ${err}`);
  }

  const json = await response.json();
  const annotation = json.responses?.[0]?.fullTextAnnotation;

  if (!annotation) {
    return { raw_text: '', confidence: 0, extracted: {}, warnings: ['No text detected in image.'] };
  }

  const rawText = annotation.text as string;

  // Estimate confidence from page-level confidence if available
  const pages = annotation.pages ?? [];
  const avgConf = pages.length > 0
    ? pages.reduce((sum: number, p: { confidence?: number }) => sum + (p.confidence ?? 0.9), 0) / pages.length
    : 0.85;

  const extracted = extractFieldsFromText(rawText);

  // Flag fields that are not extracted as warnings for staff review
  const expectedFields: (keyof ExtractedFields)[] = [
    'full_name', 'dob', 'nino', 'nationality', 'mobile',
  ];
  const warnings = expectedFields
    .filter((f) => !extracted[f])
    .map((f) => `Could not extract "${f}" — please enter manually.`);

  return {
    raw_text:   rawText,
    confidence: Math.round(avgConf * 100),
    extracted,
    warnings,
  };
}
