'use client';

export const dynamic = 'force-dynamic';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import {
  CheckCircle2, AlertTriangle, ChevronRight, ArrowLeft,
  PenLine, RotateCcw, User
} from 'lucide-react';
import Link from 'next/link';
import type { DbTenant } from '@/types/database';

export default function TenantVerifyPage() {
  const router  = useRouter();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [drawing, setDrawing]   = useState(false);
  const [hasSig,  setHasSig]    = useState(false);
  const [tenant,  setTenant]    = useState<DbTenant | null>(null);
  const [loading, setLoading]   = useState(true);
  const [saving,  setSaving]    = useState(false);
  const [error,   setError]     = useState('');
  const [confirmed, setConfirmed] = useState(false);
  const [stampToBlockchain, setStampToBlockchain] = useState(true);

  // Load tenant record created in step 3
  useEffect(() => {
    const tenantId = sessionStorage.getItem('intake_tenant_id');
    if (!tenantId) { router.replace('/intake/new'); return; }

    fetch(`/api/tenants/${tenantId}`)
      .then(res => res.json())
      .then(data => {
        if (data.error || !data.id) {
          setError('Could not load tenant record.');
        } else {
          setTenant(data as DbTenant);
        }
        setLoading(false);
      })
      .catch(() => {
        setError('Could not load tenant record.');
        setLoading(false);
      });
  }, [router]);

  // ── Signature canvas ───────────────────────────────────────────────────────

  const getPos = (e: React.MouseEvent | React.TouchEvent, canvas: HTMLCanvasElement) => {
    const rect = canvas.getBoundingClientRect();
    if ('touches' in e) {
      return { x: e.touches[0].clientX - rect.left, y: e.touches[0].clientY - rect.top };
    }
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  };

  const startDraw = (e: React.MouseEvent | React.TouchEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    e.preventDefault();
    setDrawing(true);
    const pos = getPos(e, canvas);
    ctx.beginPath();
    ctx.moveTo(pos.x, pos.y);
  };

  const draw = (e: React.MouseEvent | React.TouchEvent) => {
    if (!drawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    e.preventDefault();
    const pos = getPos(e, canvas);
    ctx.lineTo(pos.x, pos.y);
    ctx.strokeStyle = '#0F1C2E';
    ctx.lineWidth   = 2;
    ctx.lineCap     = 'round';
    ctx.stroke();
    setHasSig(true);
  };

  const endDraw = () => setDrawing(false);

  const clearSig = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    ctx?.clearRect(0, 0, canvas.width, canvas.height);
    setHasSig(false);
  };

  const getSignatureDataUrl = (): string => {
    return canvasRef.current?.toDataURL('image/png') ?? '';
  };

  // ── Submit verification ────────────────────────────────────────────────────

  const handleVerify = async () => {
    if (!hasSig)    { setError('Please sign before confirming.');    return; }
    if (!confirmed) { setError('Please confirm the details are correct.'); return; }
    if (!tenant)    return;

    setSaving(true);
    setError('');

    try {
      const sigData    = getSignatureDataUrl();
      const signedAt   = new Date().toISOString();

      // Hash for blockchain
      const dataString = `${tenant.id}|${sigData}|${signedAt}`;
      const encoder = new TextEncoder();
      const dataBuffer = encoder.encode(dataString);
      const hashBuffer = await crypto.subtle.digest('SHA-256', dataBuffer);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      const documentHash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

      // Note: Blockchain stamping is handled by the /api/intake/verify route server-side

      const res = await fetch('/api/intake/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tenant_id: tenant.id,
          signature_data: sigData,
          document_hash: documentHash,
          signed_at: signedAt,
          stamp_to_blockchain: stampToBlockchain
        })
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed to save verification');

      router.push('/intake/complete');
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Verification failed. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-navy flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-amber border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-cream flex flex-col">

      {/* Header */}
      <header className="flex items-center gap-3 px-6 py-4 bg-navy border-b border-navy-border">
        <Link href="/intake/staff-review" className="text-slate-400 hover:text-white transition-colors">
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <div>
          <p className="text-xxs font-mono font-semibold text-slate-500 uppercase tracking-widest">
            Tenant Intake — Step 4 of 5
          </p>
          <h1 className="text-white font-bold text-sm">Tenant Verification &amp; Signature</h1>
        </div>
        <div className="ml-auto flex items-center gap-1.5">
          {[1, 2, 3, 4, 5].map((s) => (
            <span key={s} className={`w-6 h-1.5 rounded-full ${s <= 4 ? 'bg-amber' : 'bg-navy-border'}`} />
          ))}
        </div>
      </header>

      <main className="flex-1 overflow-y-auto p-6">
        <div className="max-w-2xl mx-auto space-y-6">

          {/* Handover instruction */}
          <div className="bg-amber/10 border border-amber/30 rounded-2xl px-5 py-4 flex items-start gap-3">
            <User className="w-5 h-5 text-amber flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-bold text-navy">Hand the device to the tenant</p>
              <p className="text-xs text-slate-600 mt-1">
                Ask them to read their details below, confirm accuracy, and sign in the box provided.
              </p>
            </div>
          </div>

          {error && (
            <div className="flex items-start gap-2 px-4 py-3 bg-red-50 border border-red-200 rounded-xl">
              <AlertTriangle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-red-600">{error}</p>
            </div>
          )}

          {/* Tenant record summary */}
          {tenant && (
            <section className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
              <div className="px-5 py-3 bg-slate-50 border-b border-slate-200">
                <h2 className="text-xs font-bold text-navy">Your Details — Please Read Carefully</h2>
              </div>
              <div className="p-5 grid grid-cols-2 gap-x-6 gap-y-3">
                {[
                  ['Full Name',      tenant.full_name],
                  ['Date of Birth',  tenant.dob],
                  ['NINO',           tenant.nino],
                  ['Room Number',    tenant.room_number],
                  ['Mobile',         tenant.mobile],
                  ['Email',          tenant.email ?? '—'],
                  ['Nationality',    tenant.nationality],
                  ['Move-in Date',   tenant.moved_in],
                  ['Next of Kin',    `${tenant.nok_name} (${tenant.nok_relation})`],
                  ['NOK Phone',      tenant.nok_phone],
                  ['Benefits',       `${tenant.benefit_type} · ${tenant.benefit_freq} · £${tenant.benefit_amount}`],
                  ['GP / Doctor',    tenant.doctor ?? '—'],
                ].map(([label, value]) => (
                  <div key={label}>
                    <p className="text-xxs font-black text-slate-400 uppercase tracking-wider">{label}</p>
                    <p className="text-sm text-navy font-medium mt-0.5">{value}</p>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Confirmation checkbox */}
          <label className="flex items-start gap-3 cursor-pointer bg-white border border-slate-200
                            rounded-xl px-5 py-4 hover:border-slate-300 transition-colors">
            <input
              type="checkbox"
              checked={confirmed}
              onChange={(e) => setConfirmed(e.target.checked)}
              className="w-4 h-4 mt-0.5 rounded accent-navy flex-shrink-0"
            />
            <span className="text-sm text-slate-700">
              I confirm that the details above are correct and accurate to the best of my knowledge.
              I understand this record will be securely stored{stampToBlockchain ? ' and blockchain-stamped' : ''}.
            </span>
          </label>

          {/* Signature pad */}
          <section className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
            <div className="flex items-center justify-between px-5 py-3 bg-slate-50 border-b border-slate-200">
              <div className="flex items-center gap-2">
                <PenLine className="w-4 h-4 text-navy" />
                <h2 className="text-xs font-bold text-navy">Tenant Signature</h2>
              </div>
              <button
                type="button"
                onClick={clearSig}
                className="flex items-center gap-1.5 text-xxs text-slate-400 hover:text-navy transition-colors"
              >
                <RotateCcw className="w-3 h-3" />
                Clear
              </button>
            </div>
            <div className="p-5">
              <p className="text-xxs text-slate-400 mb-3">Sign below using your finger or stylus</p>
              <canvas
                ref={canvasRef}
                width={560}
                height={160}
                className={`w-full border-2 rounded-xl touch-none cursor-crosshair bg-[#fafaf9]
                  ${hasSig ? 'border-navy' : 'border-dashed border-slate-300'}`}
                onMouseDown={startDraw}
                onMouseMove={draw}
                onMouseUp={endDraw}
                onMouseLeave={endDraw}
                onTouchStart={startDraw}
                onTouchMove={draw}
                onTouchEnd={endDraw}
              />
              {!hasSig && (
                <p className="text-center text-xxs text-slate-400 mt-2">Sign above</p>
              )}
            </div>
          </section>

          {/* Blockchain notice & Toggle */}
          <div 
            className={`border rounded-2xl px-5 py-4 flex items-center gap-3 cursor-pointer transition-colors
                        ${stampToBlockchain ? 'bg-navy border-navy-border' : 'bg-slate-100 border-slate-300'}`}
            onClick={() => setStampToBlockchain(!stampToBlockchain)}
          >
            <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-colors
                            ${stampToBlockchain ? 'border-emerald-400' : 'border-slate-400'}`}>
              {stampToBlockchain && <span className="w-2.5 h-2.5 bg-emerald-400 rounded-full" />}
            </div>
            <div>
              <p className={`text-xs font-bold ${stampToBlockchain ? 'text-white' : 'text-slate-700'}`}>
                {stampToBlockchain ? 'Stamp to Blockchain (Permanent Audit)' : 'Save to Database Only (Fastest)'}
              </p>
              {stampToBlockchain && (
                <p className="text-slate-400 text-xxs mt-0.5 font-mono">
                  SHA-256(tenant · signature · timestamp) → audit_logs
                </p>
              )}
            </div>
          </div>

          {/* Submit */}
          <button
            type="button"
            onClick={handleVerify}
            disabled={saving || !hasSig || !confirmed}
            className="w-full flex items-center justify-center gap-2 bg-navy text-white font-black
                       text-sm py-3 rounded-xl hover:bg-navy-light transition-colors
                       disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {saving ? (
              <>
                <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Saving Verification…
              </>
            ) : (
              <>
                Confirm &amp; Sign
                <ChevronRight className="w-4 h-4" />
              </>
            )}
          </button>
        </div>
      </main>
    </div>
  );
}
