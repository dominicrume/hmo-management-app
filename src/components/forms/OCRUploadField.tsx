'use client';

// OCR Upload Field — Intake Step 2
// Allows staff to upload a photo or scan of a physical Ash Shahada form.
// Calls POST /api/ocr, receives extracted fields, passes them to the parent form.
// Staff reviews extraction results before confirming — no auto-save.

import { useState, useRef, useCallback } from 'react';
import { Upload, FileImage, X, CheckCircle2, AlertTriangle, Loader2, ScanLine } from 'lucide-react';
import type { ExtractedFields } from '@/lib/ocr/googleVision';

interface OCRResult {
  confidence: number;
  extracted: ExtractedFields;
  warnings: string[];
  raw_text: string;
}

interface Props {
  onExtracted: (fields: ExtractedFields) => void;
  formNumber?: string;  // e.g. "Form 3 — Personal Details"
}

type UploadState = 'idle' | 'uploading' | 'success' | 'error';

export default function OCRUploadField({ onExtracted, formNumber = 'Physical Form' }: Props) {
  const [state,    setState]   = useState<UploadState>('idle');
  const [result,   setResult]  = useState<OCRResult | null>(null);
  const [errorMsg, setError]   = useState<string>('');
  const [preview,  setPreview] = useState<string | null>(null);
  const [fileName, setFileName]= useState<string>('');
  const [isDragging, setDrag]  = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const processFile = useCallback(async (file: File) => {
    // Show preview
    const reader = new FileReader();
    reader.onload = (e) => setPreview(e.target?.result as string);
    reader.readAsDataURL(file);
    setFileName(file.name);
    setState('uploading');
    setError('');
    setResult(null);

    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await fetch('/api/ocr', { method: 'POST', body: formData });
      const json = await res.json();

      if (!res.ok) {
        setError(json.error ?? 'OCR extraction failed.');
        setState('error');
        return;
      }

      setResult({
        confidence: json.confidence,
        extracted:  json.extracted,
        warnings:   json.warnings,
        raw_text:   json.raw_text,
      });
      setState('success');
    } catch {
      setError('Network error — could not reach OCR service.');
      setState('error');
    }
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDrag(false);
    const file = e.dataTransfer.files?.[0];
    if (file) processFile(file);
  };

  const handleReset = () => {
    setState('idle');
    setResult(null);
    setPreview(null);
    setFileName('');
    setError('');
    if (inputRef.current) inputRef.current.value = '';
  };

  const handleApply = () => {
    if (result?.extracted) {
      onExtracted(result.extracted);
    }
  };

  const confidenceColour =
    (result?.confidence ?? 0) >= 85 ? 'text-emerald-600' :
    (result?.confidence ?? 0) >= 65 ? 'text-amber-600' : 'text-red-600';

  return (
    <div className="col-span-2 space-y-3">
      {/* Section label */}
      <div className="flex items-center gap-2">
        <ScanLine className="w-4 h-4 text-navy" />
        <label className="text-xxs font-black text-slate-400 uppercase tracking-wider">
          OCR Extract — Upload {formNumber}
        </label>
      </div>

      {/* Drop zone (idle or error state) */}
      {(state === 'idle' || state === 'error') && (
        <div
          onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
          onDragLeave={() => setDrag(false)}
          onDrop={handleDrop}
          onClick={() => inputRef.current?.click()}
          className={`
            flex flex-col items-center justify-center gap-3 border-2 border-dashed
            rounded-xl p-8 cursor-pointer transition-all
            ${isDragging
              ? 'border-amber bg-amber/5 scale-[1.01]'
              : 'border-slate-200 hover:border-navy/30 hover:bg-navy/5'
            }
          `}
        >
          <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center">
            <Upload className="w-5 h-5 text-slate-400" />
          </div>
          <div className="text-center">
            <p className="text-xs font-semibold text-navy">
              Drop photo or scan here
            </p>
            <p className="text-xxs text-slate-400 mt-0.5">
              JPEG, PNG, WEBP, TIFF, PDF · Max 10 MB
            </p>
            <p className="text-xxs text-slate-400 mt-0.5">
              System will read all fields and auto-populate the form.
            </p>
          </div>
          <button
            type="button"
            className="mt-1 border border-navy/20 text-navy text-xxs font-bold px-4 py-2
                       rounded-lg hover:bg-navy/5 transition-colors"
          >
            Browse Files
          </button>
          <input
            ref={inputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/tiff,application/pdf"
            className="hidden"
            onChange={handleFileChange}
          />
        </div>
      )}

      {/* Error message */}
      {state === 'error' && errorMsg && (
        <div className="flex items-start gap-2 px-3 py-2 bg-red-50 border border-red-200 rounded-lg">
          <AlertTriangle className="w-3.5 h-3.5 text-red-500 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-xs font-semibold text-red-600">{errorMsg}</p>
            <button onClick={handleReset} className="text-xxs text-red-500 underline mt-1">
              Try again
            </button>
          </div>
        </div>
      )}

      {/* Uploading state */}
      {state === 'uploading' && (
        <div className="flex flex-col items-center gap-3 border border-slate-200 rounded-xl p-6">
          {preview && (
            <img src={preview} alt="Uploading" className="w-24 h-24 object-cover rounded-lg opacity-50" />
          )}
          <div className="flex items-center gap-2 text-slate-500">
            <Loader2 className="w-4 h-4 animate-spin text-navy" />
            <span className="text-xs font-semibold">Extracting text from {fileName}…</span>
          </div>
          <p className="text-xxs text-slate-400">Google Vision is reading the form. This takes 2–5 seconds.</p>
        </div>
      )}

      {/* Success state — extracted fields */}
      {state === 'success' && result && (
        <div className="border border-slate-200 rounded-xl overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 bg-slate-50 border-b border-slate-200">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
              <span className="text-xs font-bold text-navy">OCR Complete — {fileName}</span>
            </div>
            <div className="flex items-center gap-3">
              <span className={`text-xxs font-black ${confidenceColour}`}>
                {result.confidence}% confidence
              </span>
              <button
                onClick={handleReset}
                className="text-slate-400 hover:text-slate-600 transition-colors"
                aria-label="Remove and re-upload"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Split view: image + extracted fields */}
          <div className="flex">
            {/* Image preview */}
            {preview && (
              <div className="w-36 flex-shrink-0 border-r border-slate-100 p-2">
                <img
                  src={preview}
                  alt="Uploaded form"
                  className="w-full h-full object-cover rounded-lg"
                />
              </div>
            )}

            {/* Extracted field list */}
            <div className="flex-1 px-4 py-3">
              {Object.keys(result.extracted).length === 0 ? (
                <p className="text-xs text-slate-400 italic">No structured fields extracted — review raw text below.</p>
              ) : (
                <div className="space-y-1.5">
                  {(Object.entries(result.extracted) as [string, string | undefined][])
                    .filter(([, v]) => v)
                    .map(([field, value]) => (
                      <div key={field} className="flex items-baseline gap-2">
                        <span className="text-xxs font-black text-slate-400 uppercase w-32 flex-shrink-0">
                          {field.replace(/_/g, ' ')}
                        </span>
                        <span className="text-xs text-navy font-medium">{value}</span>
                      </div>
                    ))
                  }
                </div>
              )}
            </div>
          </div>

          {/* Warnings */}
          {result.warnings.length > 0 && (
            <div className="px-4 py-3 bg-amber/5 border-t border-amber/20">
              <p className="text-xxs font-black text-amber-dark uppercase tracking-wider mb-1.5">
                Review Required
              </p>
              <ul className="space-y-1">
                {result.warnings.map((w, i) => (
                  <li key={i} className="flex items-start gap-1.5 text-xxs text-amber-dark">
                    <AlertTriangle className="w-3 h-3 flex-shrink-0 mt-0.5" />
                    {w}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Apply button */}
          <div className="flex items-center justify-between px-4 py-3 border-t border-slate-100 bg-slate-50">
            <div className="flex items-center gap-1.5">
              <FileImage className="w-3.5 h-3.5 text-slate-400" />
              <span className="text-xxs text-slate-400">
                Review the extracted values, correct any errors, then apply.
              </span>
            </div>
            <button
              type="button"
              onClick={handleApply}
              className="bg-navy text-white text-xxs font-bold px-4 py-2 rounded-lg
                         hover:bg-navy-light transition-colors"
            >
              Apply to Form
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
