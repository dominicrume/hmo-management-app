'use client';

export const dynamic = 'force-dynamic';

import { useState, useEffect, useRef, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createClient as createBrowserClient } from '@/lib/supabase/client';
import {
  ChevronRight, ArrowLeft, User, Phone, Mail, Home,
  Shield, AlertTriangle, CheckCircle2, Mic, MicOff
} from 'lucide-react';
import Link from 'next/link';
import type { Brand, TitleType, MaritalStatus, EntryMethod } from '@/types/database';

interface FormState {
  title:           TitleType;
  full_name:       string;
  dob:             string;
  nino:            string;
  nationality:     string;
  date_entry_uk:   string;
  address:         string;
  room_number:     string;
  email:           string;
  mobile:          string;
  languages:       string;
  benefit_type:    string;
  benefit_freq:    string;
  benefit_amount:  string;
  nok_name:        string;
  nok_relation:    string;
  nok_phone:       string;
  nok_address:     string;
  doctor:          string;
  place_of_birth:  string;
  marital_status:  MaritalStatus | '';
  employer_or_college:  string;
  vehicle_registration: string;
  moved_in:        string;
  on_probation:    boolean;
  probation_officer: string;
}

const EMPTY: FormState = {
  title: 'Mr', full_name: '', dob: '', nino: '', nationality: '', date_entry_uk: '',
  address: '', room_number: '', email: '', mobile: '', languages: '',
  benefit_type: '', benefit_freq: '', benefit_amount: '', nok_name: '',
  nok_relation: '', nok_phone: '', nok_address: '', doctor: '', place_of_birth: '',
  marital_status: '', employer_or_college: '', vehicle_registration: '',
  moved_in: new Date().toISOString().split('T')[0],
  on_probation: false, probation_officer: '',
};

function StaffReviewInner() {
  const router = useRouter();
  const params = useSearchParams();
  const mode   = (params.get('mode') ?? 'manual') as EntryMethod;

  const [form,       setForm]       = useState<FormState>(EMPTY);
  const [brand,      setBrand]      = useState<Brand>('mattys_place');
  const [errors,     setErrors]     = useState<Partial<Record<keyof FormState, string>>>({});
  const [saving,     setSaving]     = useState(false);
  const [saveError,  setSaveError]  = useState('');
  const [recording,  setRecording]  = useState(false);
  const [transcript, setTranscript] = useState('');
  const [isExtracting, setIsExtracting] = useState(false);

  // Load OCR pre-filled data or brand from sessionStorage
  useEffect(() => {
    const storedBrand = sessionStorage.getItem('intake_brand') as Brand | null;
    if (storedBrand) setBrand(storedBrand);

    if (mode === 'ocr') {
      const raw = sessionStorage.getItem('intake_ocr_fields');
      if (raw) {
        try {
          const ocr = JSON.parse(raw) as Partial<FormState>;
          setForm((prev) => ({ ...prev, ...ocr }));
        } catch { /* ignore parse errors */ }
      }
    }
  }, [mode]);

  const set = (key: keyof FormState) => (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const val = e.target.type === 'checkbox'
      ? (e.target as HTMLInputElement).checked
      : e.target.value;
    setForm((prev) => ({ ...prev, [key]: val }));
    if (errors[key]) setErrors((prev) => ({ ...prev, [key]: '' }));
  };

  const validate = (): boolean => {
    const errs: Partial<Record<keyof FormState, string>> = {};
    const NINO_RE  = /^[A-Z]{2}\s?\d{2}\s?\d{2}\s?\d{2}\s?[A-D]$/i;
    const PHONE_RE = /^(\+44|0)[0-9\s]{9,13}$/;

    if (!form.full_name.trim()) errs.full_name = 'Full name is required';
    if (!form.dob)              errs.dob        = 'Date of birth is required';
    if (!NINO_RE.test(form.nino)) errs.nino    = 'Invalid NINO format (e.g. AB 12 34 56 C)';
    if (!form.room_number.trim()) errs.room_number = 'Room number is required';
    if (!PHONE_RE.test(form.mobile)) errs.mobile = 'Invalid UK phone number';
    if (!form.moved_in)         errs.moved_in   = 'Move-in date is required';
    if (!form.nok_name.trim())  errs.nok_name   = 'Next of kin name is required';
    if (!form.nok_phone.trim()) errs.nok_phone  = 'Next of kin phone is required';

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSave = async () => {
    if (!validate()) return;
    setSaving(true);
    setSaveError('');

    try {
      const supabase = createBrowserClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.replace('/login'); return; }

      const { data: dbUser, error: dbUserErr } = await supabase
        .from('users')
        .select('id')
        .eq('auth_id', user.id)
        .single();

      if (dbUserErr || !dbUser) throw new Error('Staff profile not found. Please contact admin.');

      const { nok_address, ...restForm } = form;

      const mapBenefitType = (bt: string) => {
        const l = bt.toLowerCase();
        if (l.includes('universal') || l === 'uc') return 'UC';
        if (l.includes('housing') || l === 'hb') return 'HB';
        if (l.includes('pip')) return 'PIP';
        if (l.includes('esa')) return 'ESA';
        if (l.includes('jsa')) return 'JSA';
        if (l.includes('none') || !bt.trim()) return 'None';
        return 'Other';
      };

      const mapBenefitFreq = (bf: string) => {
        const l = bf.toLowerCase();
        if (l.includes('month')) return 'Monthly';
        if (l.includes('fort') || l.includes('2') || l.includes('4')) return '2wk';
        if (l.includes('week')) return 'Weekly';
        return 'Weekly';
      };

      const payload = {
        ...restForm,
        brand,
        benefit_type:    mapBenefitType(form.benefit_type),
        benefit_freq:    mapBenefitFreq(form.benefit_freq),
        benefit_amount:  parseFloat(form.benefit_amount) || 0,
        date_entry_uk:   form.date_entry_uk   || null,
        doctor:          form.doctor          || null,
        place_of_birth:  form.place_of_birth  || null,
        marital_status:  form.marital_status  || null,
        employer_or_college:  form.employer_or_college  || null,
        vehicle_registration: form.vehicle_registration || null,
        probation_officer:    form.probation_officer    || null,
        languages:       form.languages || null,
        email:           form.email     || null,
        status:          'active' as const,
        confidentiality_signed: false,
        created_by:      dbUser.id,
      };

      const { data: tenant, error: insertErr } = await supabase
        .from('tenants')
        .insert(payload)
        .select('id')
        .single();

      if (insertErr) throw new Error(insertErr.message);

      // ── Write audit log + blockchain stamp for the CREATE event ──────────────
      // The /api/forms/save route with stamp=true computes the SHA-256 hash,
      // writes an audit_logs row, and attempts the Polygon on-chain stamp.
      try {
        const stampRes = await fetch('/api/forms/save', {
          method:  'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            form_id:   'personal',
            tenant_id: tenant.id,
            data:      payload,
            stamp:     true,
          }),
        });
        if (!stampRes.ok) {
          const j = await stampRes.json().catch(() => ({}));
          console.warn('[intake] Audit stamp warning:', j.error ?? stampRes.status);
        }
      } catch (stampErr) {
        // Non-blocking — tenant is saved; stamp failure is logged but not fatal
        console.warn('[intake] Audit stamp failed (non-fatal):', stampErr);
      }

      sessionStorage.setItem('intake_tenant_id', tenant.id);
      router.push('/intake/tenant-verify');
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : typeof e === 'object' && e !== null && 'message' in e ? String((e as Record<string, unknown>).message) : JSON.stringify(e);
      setSaveError(msg || 'Failed to save. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  // Web Speech API — store instance in ref to avoid leak
  const recognitionRef = useRef<ReturnType<typeof Object> | null>(null);

  const toggleRecording = () => {
    if (!('webkitSpeechRecognition' in window || 'SpeechRecognition' in window)) {
      alert('Voice input requires Chrome or Edge.');
      return;
    }

    if (recording && recognitionRef.current) {
      (recognitionRef.current as { stop: () => void }).stop();
      setRecording(false);
      return;
    }

    const SpeechRecognition = (window as unknown as Record<string, unknown>).SpeechRecognition || (window as unknown as Record<string, unknown>).webkitSpeechRecognition;
    const recognition = new (SpeechRecognition as new () => {
      continuous: boolean; lang: string;
      onresult: (event: { results: { length: number; [key: number]: [{ transcript: string }] } }) => void;
      onerror: () => void; onend: () => void;
      start: () => void; stop: () => void;
    })();
    recognition.continuous = true;
    recognition.lang = 'en-GB';
    recognition.onresult = (event) => {
      const text = Array.from({ length: event.results.length }, (_: unknown, i: number) => event.results[i][0].transcript).join(' ');
      setTranscript(text);
    };
    recognition.onerror = () => setRecording(false);
    recognition.onend = () => setRecording(false);
    recognitionRef.current = recognition;
    recognition.start();
    setRecording(true);
  };

  const processVoiceTranscript = async () => {
    if (!transcript.trim()) return;
    setIsExtracting(true);
    try {
      const res = await fetch('/api/ai/extract', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: transcript })
      });
      const data = await res.json();
      if (data.data) {
        setForm((prev) => ({ ...prev, ...data.data }));
        setTranscript(''); // Clear transcript after successful autofill
        alert("✨ AI successfully filled the form based on the voice transcript!");
      }
    } catch (e) {
      console.error(e);
      alert("Failed to extract data from transcript.");
    } finally {
      setIsExtracting(false);
    }
  };

  const inputClass = (key: keyof FormState) =>
    `w-full bg-navy border rounded-lg px-3 py-2 text-sm text-white placeholder-slate-600
     focus:outline-none focus:ring-2 focus:ring-amber/50 transition-all
     ${errors[key] ? 'border-red-500' : 'border-navy-border'}`;

  const labelClass = 'block text-xxs font-black text-slate-400 uppercase tracking-wider mb-1';

  return (
    <div className="min-h-screen bg-cream flex flex-col">

      {/* Header */}
      <header className="flex items-center gap-3 px-6 py-4 bg-navy border-b border-navy-border">
        <Link href="/intake/new" className="text-slate-400 hover:text-white transition-colors">
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <div>
          <p className="text-xxs font-mono font-semibold text-slate-500 uppercase tracking-widest">
            Tenant Intake — Step 3 of 5
          </p>
          <h1 className="text-white font-bold text-sm">Staff Review &amp; Confirm</h1>
        </div>
        <div className="ml-auto flex items-center gap-3">
          {mode === 'ocr' && (
            <span className="px-2 py-1 bg-amber/20 text-amber text-xxs font-bold rounded-lg">
              OCR Pre-filled
            </span>
          )}
          {mode === 'voice' && (
            <button
              type="button"
              onClick={toggleRecording}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xxs font-bold transition-all
                ${recording ? 'bg-red-600 text-white animate-pulse' : 'bg-navy-light text-slate-300 hover:text-white'}`}
            >
              {recording ? <MicOff className="w-3.5 h-3.5" /> : <Mic className="w-3.5 h-3.5" />}
              {recording ? 'Stop Recording' : 'Start Recording'}
            </button>
          )}
          <div className="flex items-center gap-1.5">
            {[1, 2, 3, 4, 5].map((s) => (
              <span key={s} className={`w-6 h-1.5 rounded-full ${s <= 3 ? 'bg-amber' : 'bg-navy-border'}`} />
            ))}
          </div>
        </div>
      </header>



      <main className="flex-1 overflow-y-auto p-6">
        <div className="max-w-3xl mx-auto space-y-6">

          {/* Premium Voice Transcript Card */}
          {mode === 'voice' && transcript && (
            <div className="bg-amber/10 border-2 border-amber/30 rounded-2xl p-5 flex gap-4 items-start shadow-sm">
              <div className="w-10 h-10 rounded-full bg-amber/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                <Mic className="w-5 h-5 text-amber-dark" />
              </div>
              <div className="flex-1">
                <h3 className="text-xs font-black text-amber-dark uppercase tracking-widest mb-1.5">Live Voice Transcript</h3>
                <p className="text-sm text-navy/80 leading-relaxed italic font-medium mb-4">
                  &ldquo;{transcript}&rdquo;
                </p>
                {!recording && transcript.trim().length > 0 && (
                  <button
                    onClick={processVoiceTranscript}
                    disabled={isExtracting}
                    className="flex items-center gap-2 px-4 py-2 bg-navy text-white text-xs font-bold rounded-lg hover:bg-navy-light transition-colors disabled:opacity-50"
                  >
                    {isExtracting ? (
                      <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <span className="text-lg leading-none">✨</span>
                    )}
                    {isExtracting ? 'Extracting Data...' : 'Autofill Form with AI'}
                  </button>
                )}
              </div>
            </div>
          )}

          {saveError && (
            <div className="flex items-start gap-2 px-4 py-3 bg-red-50 border border-red-200 rounded-xl">
              <AlertTriangle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-red-600">{saveError}</p>
            </div>
          )}

          {/* Section — Personal Details */}
          <section className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
            <div className="flex items-center gap-2 px-5 py-3 bg-slate-50 border-b border-slate-200">
              <User className="w-4 h-4 text-navy" />
              <h2 className="text-xs font-bold text-navy">Personal Details</h2>
            </div>
            <div className="p-5 grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="title" className={labelClass}>Title</label>
                <select id="title" value={form.title} onChange={set('title')} className={inputClass('title')}>
                  {['Mr','Mrs','Ms','Miss','Dr','Other'].map((t) => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className={labelClass}>Full Name *</label>
                <input type="text" value={form.full_name} onChange={set('full_name')}
                  placeholder="As on ID document" className={inputClass('full_name')} />
                {errors.full_name && <p className="text-xxs text-red-500 mt-1">{errors.full_name}</p>}
              </div>
              <div>
                <label htmlFor="dob" className={labelClass}>Date of Birth *</label>
                <input id="dob" type="date" value={form.dob} onChange={set('dob')} className={inputClass('dob')} />
                {errors.dob && <p className="text-xxs text-red-500 mt-1">{errors.dob}</p>}
              </div>
              <div>
                <label className={labelClass}>NINO *</label>
                <input type="text" value={form.nino} onChange={set('nino')}
                  placeholder="AB 12 34 56 C" className={`${inputClass('nino')} font-mono`} />
                {errors.nino && <p className="text-xxs text-red-500 mt-1">{errors.nino}</p>}
              </div>
              <div>
                <label className={labelClass}>Nationality</label>
                <input type="text" value={form.nationality} onChange={set('nationality')}
                  placeholder="e.g. British" className={inputClass('nationality')} />
              </div>
              <div>
                <label htmlFor="date_entry_uk" className={labelClass}>Date Entered UK</label>
                <input id="date_entry_uk" type="date" value={form.date_entry_uk} onChange={set('date_entry_uk')}
                  className={inputClass('date_entry_uk')} />
              </div>
              <div>
                <label htmlFor="marital_status" className={labelClass}>Marital Status</label>
                <select id="marital_status" value={form.marital_status} onChange={set('marital_status')} className={inputClass('marital_status')}>
                  <option value="">— Select —</option>
                  {['Single','Married','Divorced','Widowed','Separated','Civil Partnership'].map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className={labelClass}>Place of Birth</label>
                <input type="text" value={form.place_of_birth} onChange={set('place_of_birth')}
                  placeholder="City, Country" className={inputClass('place_of_birth')} />
              </div>
            </div>
          </section>

          {/* Section — Contact & Accommodation */}
          <section className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
            <div className="flex items-center gap-2 px-5 py-3 bg-slate-50 border-b border-slate-200">
              <Home className="w-4 h-4 text-navy" />
              <h2 className="text-xs font-bold text-navy">Contact &amp; Accommodation</h2>
            </div>
            <div className="p-5 grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className={labelClass}>Room Number *</label>
                <input type="text" value={form.room_number} onChange={set('room_number')}
                  placeholder="e.g. 4B" className={inputClass('room_number')} />
                {errors.room_number && <p className="text-xxs text-red-500 mt-1">{errors.room_number}</p>}
              </div>
              <div>
                <label htmlFor="moved_in" className={labelClass}>Move-in Date *</label>
                <input id="moved_in" type="date" value={form.moved_in} onChange={set('moved_in')}
                  className={inputClass('moved_in')} />
                {errors.moved_in && <p className="text-xxs text-red-500 mt-1">{errors.moved_in}</p>}
              </div>
              <div className="col-span-2">
                <label className={labelClass}>Address</label>
                <input type="text" value={form.address} onChange={set('address')}
                  placeholder="Full address including postcode" className={inputClass('address')} />
              </div>
              <div>
                <label className={labelClass}>Mobile *</label>
                <input type="tel" value={form.mobile} onChange={set('mobile')}
                  placeholder="+44 7700 000000" className={inputClass('mobile')} />
                {errors.mobile && <p className="text-xxs text-red-500 mt-1">{errors.mobile}</p>}
              </div>
              <div>
                <label className={labelClass}>Email</label>
                <input type="email" value={form.email} onChange={set('email')}
                  placeholder="optional" className={inputClass('email')} />
              </div>
              <div>
                <label className={labelClass}>Languages Spoken</label>
                <input type="text" value={form.languages} onChange={set('languages')}
                  placeholder="e.g. English, Urdu" className={inputClass('languages')} />
              </div>
              <div>
                <label className={labelClass}>GP / Doctor</label>
                <input type="text" value={form.doctor} onChange={set('doctor')}
                  placeholder="Doctor name or surgery" className={inputClass('doctor')} />
              </div>
            </div>
          </section>

          {/* Section — Next of Kin */}
          <section className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
            <div className="flex items-center gap-2 px-5 py-3 bg-slate-50 border-b border-slate-200">
              <Phone className="w-4 h-4 text-navy" />
              <h2 className="text-xs font-bold text-navy">Next of Kin</h2>
            </div>
            <div className="p-5 grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className={labelClass}>Name *</label>
                <input type="text" value={form.nok_name} onChange={set('nok_name')}
                  placeholder="Full name" className={inputClass('nok_name')} />
                {errors.nok_name && <p className="text-xxs text-red-500 mt-1">{errors.nok_name}</p>}
              </div>
              <div>
                <label className={labelClass}>Relationship</label>
                <input type="text" value={form.nok_relation} onChange={set('nok_relation')}
                  placeholder="e.g. Mother, Brother" className={inputClass('nok_relation')} />
              </div>
              <div>
                <label className={labelClass}>Phone *</label>
                <input type="tel" value={form.nok_phone} onChange={set('nok_phone')}
                  placeholder="+44 7700 000000" className={inputClass('nok_phone')} />
                {errors.nok_phone && <p className="text-xxs text-red-500 mt-1">{errors.nok_phone}</p>}
              </div>
              <div>
                <label className={labelClass}>Address</label>
                <input type="text" value={form.nok_address} onChange={set('nok_address')}
                  placeholder="optional" className={inputClass('nok_address')} />
              </div>
            </div>
          </section>

          {/* Section — Benefits & Employment */}
          <section className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
            <div className="flex items-center gap-2 px-5 py-3 bg-slate-50 border-b border-slate-200">
              <Mail className="w-4 h-4 text-navy" />
              <h2 className="text-xs font-bold text-navy">Benefits &amp; Employment</h2>
            </div>
            <div className="p-5 grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="benefit_type_field" className={labelClass}>Benefit Type</label>
                <select id="benefit_type_field" value={form.benefit_type} onChange={set('benefit_type')} className={inputClass('benefit_type')}>
                  <option value="">— Select —</option>
                  <option value="Universal Credit">Universal Credit (UC)</option>
                  <option value="Housing Benefit">Housing Benefit (HB)</option>
                  <option value="PIP">PIP</option>
                  <option value="ESA">ESA</option>
                  <option value="JSA">JSA</option>
                  <option value="None">None</option>
                  <option value="Other">Other</option>
                </select>
              </div>
              <div>
                <label htmlFor="benefit_freq_field" className={labelClass}>Payment Frequency</label>
                <select id="benefit_freq_field" value={form.benefit_freq} onChange={set('benefit_freq')} className={inputClass('benefit_freq')}>
                  <option value="">— Select —</option>
                  {['Weekly','Fortnightly','Monthly','4-Weekly'].map((f) => (
                    <option key={f} value={f}>{f}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className={labelClass}>Benefit Amount (£)</label>
                <input type="number" value={form.benefit_amount} onChange={set('benefit_amount')}
                  placeholder="0.00" min="0" step="0.01" className={inputClass('benefit_amount')} />
              </div>
              <div>
                <label className={labelClass}>Employer / College</label>
                <input type="text" value={form.employer_or_college} onChange={set('employer_or_college')}
                  placeholder="if applicable" className={inputClass('employer_or_college')} />
              </div>
              <div>
                <label className={labelClass}>Vehicle Registration</label>
                <input type="text" value={form.vehicle_registration} onChange={set('vehicle_registration')}
                  placeholder="e.g. AB12 CDE" className={`${inputClass('vehicle_registration')} font-mono uppercase`} />
              </div>
            </div>
          </section>

          {/* Section — Probation */}
          <section className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
            <div className="flex items-center gap-2 px-5 py-3 bg-slate-50 border-b border-slate-200">
              <Shield className="w-4 h-4 text-navy" />
              <h2 className="text-xs font-bold text-navy">Probation</h2>
            </div>
            <div className="p-5 space-y-4">
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.on_probation}
                  onChange={set('on_probation')}
                  className="w-4 h-4 rounded accent-amber"
                />
                <span className="text-sm text-slate-700 font-medium">Tenant is currently on probation</span>
              </label>
              {form.on_probation && (
                <div>
                  <label className={labelClass}>Probation Officer</label>
                  <input type="text" value={form.probation_officer} onChange={set('probation_officer')}
                    placeholder="Officer name and contact" className={inputClass('probation_officer')} />
                </div>
              )}
            </div>
          </section>

          {/* Blockchain preview */}
          <div className="bg-navy border border-navy-border rounded-2xl px-5 py-4 flex items-center gap-3">
            <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0" />
            <div>
              <p className="text-white text-xs font-bold">Blockchain Stamp Pending</p>
              <p className="text-slate-400 text-xxs mt-0.5 font-mono">
                SHA-256 hash will be computed on save — actor · tenant · timestamp · payload
              </p>
            </div>
          </div>

          {/* Save */}
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="w-full flex items-center justify-center gap-2 bg-amber text-navy font-black
                       text-sm py-3 rounded-xl hover:bg-amber-light transition-colors
                       disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? (
              <>
                <span className="w-4 h-4 border-2 border-navy border-t-transparent rounded-full animate-spin" />
                Saving &amp; Stamping…
              </>
            ) : (
              <>
                Save &amp; Proceed to Tenant Verification
                <ChevronRight className="w-4 h-4" />
              </>
            )}
          </button>
        </div>
      </main>
    </div>
  );
}

export default function StaffReviewPage() {
  return (
    <Suspense>
      <StaffReviewInner />
    </Suspense>
  );
}
