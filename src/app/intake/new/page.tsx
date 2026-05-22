'use client';

export const dynamic = 'force-dynamic';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { FileText, Mic, Upload, ChevronRight, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import type { Brand, EntryMethod } from '@/types/database';

type EntryMode = 'manual' | 'ocr' | 'voice';

const BRANDS: { value: Brand; label: string; colour: string }[] = [
  { value: 'mattys_place',  label: "Matty's Place",            colour: '#E8A84C' },
  { value: 'ash_shahada',   label: 'Ash Shahada Housing Assoc.', colour: '#2A6496' },
  { value: 'reliance',      label: 'Reliance Housing',          colour: '#1A7A4A' },
];

export default function IntakeNewPage() {
  const router = useRouter();
  const [mode,  setMode]  = useState<EntryMode | null>(null);
  const [brand, setBrand] = useState<Brand>('mattys_place');
  const [file,  setFile]  = useState<File | null>(null);
  const [dragging, setDragging] = useState(false);

  const handleFileDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const dropped = e.dataTransfer.files[0];
    if (dropped) { setFile(dropped); setMode('ocr'); }
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const picked = e.target.files?.[0];
    if (picked) { setFile(picked); setMode('ocr'); }
  };

  const handleContinue = () => {
    // Store entry context in sessionStorage for downstream steps
    sessionStorage.setItem('intake_mode',  mode ?? 'manual');
    sessionStorage.setItem('intake_brand', brand);

    if (mode === 'ocr' && file) {
      // Encode file name for display; actual upload happens in ocr-review
      sessionStorage.setItem('intake_filename', file.name);
      // Clear legacy base64 if present to prevent quota issues
      sessionStorage.removeItem('intake_file_b64');
      // Store File in window memory and pass Object URL
      if (typeof window !== 'undefined') {
        (window as any).pendingIntakeFile = file;
        const objectUrl = URL.createObjectURL(file);
        sessionStorage.setItem('intake_file_url', objectUrl);
      }
      router.push('/intake/ocr-review');
    } else if (mode === 'voice') {
      router.push('/intake/staff-review?mode=voice');
    } else {
      router.push('/intake/staff-review?mode=manual');
    }
  };

  const canContinue = mode === 'ocr' ? !!file : !!mode;

  return (
    <div className="min-h-screen bg-navy flex flex-col">

      {/* Header */}
      <header className="flex items-center gap-3 px-6 py-4 border-b border-navy-border">
        <Link href="/dashboard" className="text-slate-400 hover:text-white transition-colors">
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <div>
          <p className="text-xxs font-mono font-semibold text-slate-500 uppercase tracking-widest">
            Tenant Intake — Step 1 of 5
          </p>
          <h1 className="text-white font-bold text-sm">New Tenant Entry</h1>
        </div>
        {/* Step indicator */}
        <div className="ml-auto flex items-center gap-1.5">
          {[1, 2, 3, 4, 5].map((s) => (
            <span
              key={s}
              className={`w-6 h-1.5 rounded-full ${s === 1 ? 'bg-amber' : 'bg-navy-border'}`}
            />
          ))}
        </div>
      </header>

      <main className="flex-1 flex items-center justify-center px-4 py-10">
        <div className="w-full max-w-lg space-y-6">

          {/* Brand selector */}
          <div className="bg-navy-light border border-navy-border rounded-2xl p-5">
            <p className="text-xxs font-black text-slate-400 uppercase tracking-wider mb-3">
              Housing Brand
            </p>
            <div className="grid grid-cols-3 gap-2">
              {BRANDS.map((b) => (
                <button
                  key={b.value}
                  type="button"
                  onClick={() => setBrand(b.value)}
                  className={`px-3 py-2.5 rounded-lg text-xxs font-bold text-left transition-all border
                    ${brand === b.value
                      ? 'border-transparent text-white'
                      : 'border-navy-border text-slate-400 hover:text-white hover:border-slate-500'
                    }`}
                  style={brand === b.value ? { backgroundColor: b.colour + '22', borderColor: b.colour, color: '#fff' } : {}}
                >
                  <span
                    className="block w-2 h-2 rounded-full mb-1.5"
                    style={{ backgroundColor: brand === b.value ? b.colour : '#374151' }}
                  />
                  {b.label}
                </button>
              ))}
            </div>
          </div>

          {/* Entry mode selector */}
          <div className="bg-navy-light border border-navy-border rounded-2xl p-5 space-y-3">
            <p className="text-xxs font-black text-slate-400 uppercase tracking-wider mb-1">
              How are you entering this tenant&apos;s data?
            </p>

            {/* Manual */}
            <button
              type="button"
              onClick={() => setMode('manual')}
              className={`w-full flex items-start gap-4 p-4 rounded-xl border transition-all text-left
                ${mode === 'manual'
                  ? 'border-amber bg-amber/10'
                  : 'border-navy-border hover:border-slate-500 hover:bg-navy/40'
                }`}
            >
              <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5
                ${mode === 'manual' ? 'bg-amber text-navy' : 'bg-navy-muted text-slate-400'}`}>
                <FileText className="w-4 h-4" />
              </div>
              <div>
                <p className={`text-xs font-bold ${mode === 'manual' ? 'text-white' : 'text-slate-300'}`}>
                  Manual Entry
                </p>
                <p className="text-xxs text-slate-500 mt-0.5">
                  Type tenant details directly into the digital form
                </p>
              </div>
              {mode === 'manual' && (
                <div className="ml-auto mt-1 w-4 h-4 rounded-full bg-amber flex items-center justify-center flex-shrink-0">
                  <span className="w-2 h-2 rounded-full bg-navy" />
                </div>
              )}
            </button>

            {/* OCR Upload */}
            <button
              type="button"
              onClick={() => setMode('ocr')}
              className={`w-full flex items-start gap-4 p-4 rounded-xl border transition-all text-left
                ${mode === 'ocr'
                  ? 'border-amber bg-amber/10'
                  : 'border-navy-border hover:border-slate-500 hover:bg-navy/40'
                }`}
            >
              <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5
                ${mode === 'ocr' ? 'bg-amber text-navy' : 'bg-navy-muted text-slate-400'}`}>
                <Upload className="w-4 h-4" />
              </div>
              <div className="flex-1">
                <p className={`text-xs font-bold ${mode === 'ocr' ? 'text-white' : 'text-slate-300'}`}>
                  Upload Physical Form (OCR)
                </p>
                <p className="text-xxs text-slate-500 mt-0.5">
                  Photograph or scan the handwritten form — AI extracts all fields
                </p>

                {/* Drop zone — shown when OCR selected */}
                {mode === 'ocr' && (
                  <div
                    onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
                    onDragLeave={() => setDragging(false)}
                    onDrop={handleFileDrop}
                    className={`mt-3 border-2 border-dashed rounded-lg p-4 text-center transition-all
                      ${dragging ? 'border-amber bg-amber/5' : 'border-navy-border'}
                      ${file ? 'border-emerald-500 bg-emerald-900/10' : ''}`}
                  >
                    {file ? (
                      <p className="text-xxs text-emerald-400 font-semibold">{file.name}</p>
                    ) : (
                      <>
                        <p className="text-xxs text-slate-400">Drop image / PDF here, or</p>
                        <label className="mt-1.5 inline-block cursor-pointer text-xxs text-amber font-bold hover:underline">
                          browse files
                          <input
                            type="file"
                            accept="image/jpeg,image/png,image/webp,application/pdf"
                            className="sr-only"
                            onChange={handleFileChange}
                          />
                        </label>
                      </>
                    )}
                  </div>
                )}
              </div>
              {mode === 'ocr' && (
                <div className="ml-auto mt-1 w-4 h-4 rounded-full bg-amber flex items-center justify-center flex-shrink-0">
                  <span className="w-2 h-2 rounded-full bg-navy" />
                </div>
              )}
            </button>

            {/* Voice */}
            <button
              type="button"
              onClick={() => setMode('voice')}
              className={`w-full flex items-start gap-4 p-4 rounded-xl border transition-all text-left
                ${mode === 'voice'
                  ? 'border-amber bg-amber/10'
                  : 'border-navy-border hover:border-slate-500 hover:bg-navy/40'
                }`}
            >
              <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5
                ${mode === 'voice' ? 'bg-amber text-navy' : 'bg-navy-muted text-slate-400'}`}>
                <Mic className="w-4 h-4" />
              </div>
              <div>
                <p className={`text-xs font-bold ${mode === 'voice' ? 'text-white' : 'text-slate-300'}`}>
                  Voice-to-Text Entry
                </p>
                <p className="text-xxs text-slate-500 mt-0.5">
                  Speak the tenant&apos;s details — system transcribes in real time
                </p>
              </div>
              {mode === 'voice' && (
                <div className="ml-auto mt-1 w-4 h-4 rounded-full bg-amber flex items-center justify-center flex-shrink-0">
                  <span className="w-2 h-2 rounded-full bg-navy" />
                </div>
              )}
            </button>
          </div>

          {/* Continue button */}
          <button
            type="button"
            onClick={handleContinue}
            disabled={!canContinue}
            className="w-full flex items-center justify-center gap-2 bg-amber text-navy font-black text-sm
                       py-3 rounded-xl hover:bg-amber-light transition-colors
                       disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Continue
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </main>
    </div>
  );
}
