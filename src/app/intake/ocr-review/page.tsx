'use client';

export const dynamic = 'force-dynamic';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, AlertTriangle, CheckCircle2, ChevronRight, ArrowLeft, ScanLine } from 'lucide-react';
import Link from 'next/link';

interface ExtractedFields {
  full_name?:   string;
  dob?:         string;
  nino?:        string;
  mobile?:      string;
  email?:       string;
  room_number?: string;
  nationality?: string;
  nok_name?:    string;
  doctor?:      string;
  [key: string]: string | undefined;
}

const FIELD_LABELS: Record<string, string> = {
  full_name:   'Full Name',
  dob:         'Date of Birth',
  nino:        'National Insurance No.',
  mobile:      'Mobile',
  email:       'Email',
  room_number: 'Room Number',
  nationality: 'Nationality',
  nok_name:    'Next of Kin',
  doctor:      'GP / Doctor',
};

export default function OCRReviewPage() {
  const router = useRouter();
  const [loading,   setLoading]   = useState(true);
  const [error,     setError]     = useState('');
  const [rawText,   setRawText]   = useState('');
  const [fields,    setFields]    = useState<ExtractedFields>({});
  const [warnings,  setWarnings]  = useState<string[]>([]);
  const [imageUrl,  setImageUrl]  = useState('');
  const [edits,     setEdits]     = useState<ExtractedFields>({});

  useEffect(() => {
    const b64 = sessionStorage.getItem('intake_file_b64');
    const filename = sessionStorage.getItem('intake_filename') ?? 'form.jpg';

    if (!b64) { router.replace('/intake/new'); return; }

    if (b64.startsWith('data:image') || b64.startsWith('data:application/pdf')) {
      setImageUrl(b64.startsWith('data:image') ? b64 : '');
    }

    // Convert base64 data URL to blob and POST to /api/ocr
    const runOCR = async () => {
      try {
        const res = await fetch(b64);
        const blob = await res.blob();
        const form = new FormData();
        form.append('file', blob, filename);

        const response = await fetch('/api/ocr', { method: 'POST', body: form });
        if (!response.ok) {
          const j = await response.json().catch(() => ({}));
          throw new Error(j.error ?? `OCR failed: ${response.status}`);
        }

        const data = await response.json();
        setRawText(data.raw_text ?? '');
        setFields(data.extracted ?? {});
        setEdits(data.extracted ?? {});
        setWarnings(data.warnings ?? []);
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : 'OCR extraction failed.');
      } finally {
        setLoading(false);
      }
    };

    runOCR();
  }, [router]);

  const handleEdit = (key: string, val: string) => {
    setEdits((prev) => ({ ...prev, [key]: val }));
  };

  const handleContinue = () => {
    sessionStorage.setItem('intake_ocr_fields', JSON.stringify(edits));
    sessionStorage.setItem('intake_raw_text',   rawText);
    router.push('/intake/staff-review?mode=ocr');
  };

  const extracted = Object.keys(FIELD_LABELS).filter((k) => edits[k]);
  const missing   = Object.keys(FIELD_LABELS).filter((k) => !edits[k]);

  return (
    <div className="min-h-screen bg-navy flex flex-col">

      {/* Header */}
      <header className="flex items-center gap-3 px-6 py-4 border-b border-navy-border">
        <Link href="/intake/new" className="text-slate-400 hover:text-white transition-colors">
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <div>
          <p className="text-xxs font-mono font-semibold text-slate-500 uppercase tracking-widest">
            Tenant Intake — Step 2 of 5
          </p>
          <h1 className="text-white font-bold text-sm">OCR Field Review</h1>
        </div>
        <div className="ml-auto flex items-center gap-1.5">
          {[1, 2, 3, 4, 5].map((s) => (
            <span key={s} className={`w-6 h-1.5 rounded-full ${s <= 2 ? 'bg-amber' : 'bg-navy-border'}`} />
          ))}
        </div>
      </header>

      <main className="flex-1 flex gap-0 overflow-hidden">

        {/* Left — image preview */}
        {imageUrl && (
          <aside className="w-56 flex-shrink-0 border-r border-navy-border bg-navy-light overflow-y-auto p-3">
            <p className="text-xxs text-slate-500 uppercase font-semibold tracking-wider mb-2">Uploaded Form</p>
            <img src={imageUrl} alt="Uploaded form" className="w-full rounded-lg border border-navy-border" />
          </aside>
        )}

        {/* Right — fields */}
        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="flex flex-col items-center justify-center h-full gap-3">
              <Loader2 className="w-8 h-8 text-amber animate-spin" />
              <p className="text-slate-400 text-sm">Extracting fields with Google Vision…</p>
            </div>
          ) : error ? (
            <div className="max-w-md mx-auto mt-10 flex items-start gap-3 bg-red-900/20 border border-red-700/30 rounded-xl p-4">
              <AlertTriangle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-bold text-red-300">OCR Error</p>
                <p className="text-xs text-red-400 mt-1">{error}</p>
                <Link href="/intake/new" className="inline-block mt-3 text-xs text-amber font-bold hover:underline">
                  ← Try again
                </Link>
              </div>
            </div>
          ) : (
            <div className="max-w-2xl space-y-5">

              {/* Extraction stats */}
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2 px-3 py-1.5 bg-emerald-900/30 border border-emerald-700/30 rounded-lg">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="text-xxs font-bold text-emerald-400">{extracted.length} fields extracted</span>
                </div>
                {missing.length > 0 && (
                  <div className="flex items-center gap-2 px-3 py-1.5 bg-amber/10 border border-amber/20 rounded-lg">
                    <ScanLine className="w-3.5 h-3.5 text-amber" />
                    <span className="text-xxs font-bold text-amber">{missing.length} not found — enter manually</span>
                  </div>
                )}
              </div>

              {/* Warnings */}
              {warnings.length > 0 && (
                <div className="bg-amber/5 border border-amber/20 rounded-xl p-4">
                  <p className="text-xxs font-black text-amber uppercase tracking-wider mb-2">OCR Warnings</p>
                  <ul className="space-y-1">
                    {warnings.map((w, i) => (
                      <li key={i} className="text-xs text-slate-400 flex items-center gap-2">
                        <span className="w-1 h-1 rounded-full bg-amber flex-shrink-0" />
                        {w}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Editable fields */}
              <div className="bg-navy-light border border-navy-border rounded-2xl p-5">
                <p className="text-xxs font-black text-slate-400 uppercase tracking-wider mb-4">
                  Review &amp; Correct Extracted Fields
                </p>
                <div className="grid grid-cols-2 gap-4">
                  {Object.entries(FIELD_LABELS).map(([key, label]) => (
                    <div key={key} className="space-y-1">
                      <label className="text-xxs font-bold text-slate-500 uppercase tracking-wider">
                        {label}
                        {!edits[key] && (
                          <span className="ml-1.5 text-amber">(not found)</span>
                        )}
                      </label>
                      <input
                        type="text"
                        value={edits[key] ?? ''}
                        onChange={(e) => handleEdit(key, e.target.value)}
                        placeholder={`Enter ${label.toLowerCase()}…`}
                        className={`w-full bg-navy border rounded-lg px-3 py-2 text-xs text-white
                                   placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-amber/50
                                   transition-all font-mono
                                   ${edits[key] ? 'border-emerald-700/50' : 'border-amber/30'}`}
                      />
                    </div>
                  ))}
                </div>
              </div>

              <button
                type="button"
                onClick={handleContinue}
                className="w-full flex items-center justify-center gap-2 bg-amber text-navy font-black
                           text-sm py-3 rounded-xl hover:bg-amber-light transition-colors"
              >
                Confirm &amp; Continue to Staff Review
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
