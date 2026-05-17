// POST /api/ocr
// Accepts a multipart form upload (image file) from the Step 2 intake screen.
// Calls Google Vision API and returns extracted fields for Form 3.
// Server-side only — API key never exposed to the browser.

import { NextRequest, NextResponse } from 'next/server';
import { callClaudeVisionOCR } from '@/lib/ocr/claudeVision';
import { requirePermission } from '@/lib/security/rbac';
import { checkRateLimit, RATE_LIMITS } from '@/lib/security/rate-limit';

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/tiff', 'application/pdf'];
const MAX_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB

export async function POST(req: NextRequest) {
  try {
    const guard = await requirePermission('tenant:create');
    if (!guard.ok) return guard.response;

    const rl = checkRateLimit(`ocr:${guard.ctx.dbUser.id}`, RATE_LIMITS.ocr?.maxRequests ?? 20, RATE_LIMITS.ocr?.windowMs ?? 60_000);
    if (!rl.allowed) return NextResponse.json({ error: 'Rate limit exceeded.' }, { status: 429 });

    const formData = await req.formData();
    const file     = formData.get('file');

    if (!file || typeof file === 'string') {
      return NextResponse.json({ error: 'No file uploaded.' }, { status: 400 });
    }

    const fileObj = file as File;

    if (!ALLOWED_TYPES.includes(fileObj.type)) {
      return NextResponse.json(
        { error: `Unsupported file type: ${fileObj.type}. Use JPEG, PNG, WEBP, TIFF, or PDF.` },
        { status: 415 }
      );
    }

    if (fileObj.size > MAX_SIZE_BYTES) {
      return NextResponse.json(
        { error: 'File too large. Maximum size is 10 MB.' },
        { status: 413 }
      );
    }

    // Convert file to base64 for Google Vision API
    const arrayBuffer = await fileObj.arrayBuffer();
    const base64      = Buffer.from(arrayBuffer).toString('base64');

    const result = await callClaudeVisionOCR(base64, fileObj.type);

    return NextResponse.json({
      success:    true,
      raw_text:   result.raw_text,
      confidence: result.confidence,
      extracted:  result.extracted,
      warnings:   result.warnings,
    });

  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown OCR error.';
    console.error('[OCR] Error:', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// GET is not allowed on this route
export function GET() {
  return NextResponse.json({ error: 'Method not allowed.' }, { status: 405 });
}
