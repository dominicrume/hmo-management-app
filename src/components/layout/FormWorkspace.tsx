'use client';

import { useRef, useState, useCallback } from 'react';
import { Save, Link, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import type { Brand } from './LetterheadSwitcher';
import type { FormId } from './FormsPanel';
import type { DbTenant } from '@/types/database';
import AIBrainPanel from '@/components/ai/AIBrainPanel';

// ── Brand letterhead configs ──────────────────────────────────────────────────

const LETTERHEAD: Record<Brand, {
  name: string;
  tagline: string;
  formRef: string;
}> = {
  mattys_place: {
    name: "Matty's Place",
    tagline: 'Supported Housing & Community Services',
    formRef: 'MP-TN-2026',
  },
  ash_shahada: {
    name: 'Ash Shahada Housing Association Ltd',
    tagline: 'Birmingham HMO & Social Housing — Registered Charity',
    formRef: 'ASHA-TN-2026',
  },
  reliance: {
    name: 'Reliance Housing',
    tagline: 'Community Support Services, Birmingham',
    formRef: 'RH-TN-2026',
  },
};

// ── Sub-components ────────────────────────────────────────────────────────────

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-8">
      <h3 className="text-xxs font-black text-navy uppercase tracking-widest mb-4 flex items-center gap-2">
        <span className="w-1 h-3.5 bg-amber rounded-full inline-block" />
        Section {title}
      </h3>
      <div className="grid grid-cols-2 gap-x-8 gap-y-5">
        {children}
      </div>
    </div>
  );
}

function Field({
  name,
  label,
  type = 'text',
  placeholder = '',
  textarea = false,
  mono = false,
  defaultValue = '',
}: {
  name: string;
  label: string;
  type?: string;
  placeholder?: string;
  textarea?: boolean;
  mono?: boolean;
  defaultValue?: string;
}) {
  const fieldId = `field-${name}`;
  const baseClass = `w-full border-b border-field-line py-1.5 text-sm text-navy bg-transparent
    focus:border-navy focus:outline-none transition-colors placeholder-slate-300
    ${mono ? 'font-mono tracking-widest' : ''}`;

  return (
    <div className={`space-y-1 ${textarea ? 'col-span-2' : ''}`}>
      <label htmlFor={fieldId} className="text-xxs font-black text-slate-400 uppercase tracking-wider">
        {label}
      </label>
      {textarea ? (
        <textarea
          id={fieldId}
          name={name}
          placeholder={placeholder}
          rows={3}
          defaultValue={defaultValue}
          className={`${baseClass} border border-slate-200 rounded-lg px-3 py-2 resize-none`}
        />
      ) : (
        <input
          id={fieldId}
          name={name}
          type={type}
          placeholder={placeholder}
          defaultValue={defaultValue}
          className={baseClass}
        />
      )}
    </div>
  );
}

function SelectField({
  name,
  label,
  options,
  defaultValue = '',
}: {
  name: string;
  label: string;
  options: string[];
  defaultValue?: string;
}) {
  const fieldId = `field-${name}`;
  return (
    <div className="space-y-1">
      <label htmlFor={fieldId} className="text-xxs font-black text-slate-400 uppercase tracking-wider">
        {label}
      </label>
      <select
        id={fieldId}
        name={name}
        defaultValue={defaultValue}
        className="w-full border-b border-field-line py-1.5 text-sm text-navy bg-transparent focus:border-navy focus:outline-none transition-colors"
      >
        <option value="">Select…</option>
        {options.map((o) => (
          <option key={o} value={o}>{o}</option>
        ))}
      </select>
    </div>
  );
}

// ── Form section builders (accept tenant for pre-population) ──────────────────

function buildFormSections(
  t: DbTenant | null | undefined
): Partial<Record<FormId, React.ReactNode>> {
  return {
    personal: (
      <>
        <Section title="1.0  Personal Information">
          <Field name="full_name"     label="Full Legal Name"              placeholder="e.g. John Stevenson"        defaultValue={t?.full_name ?? ''} />
          <Field name="dob"           label="Date of Birth"                type="date"                              defaultValue={t?.dob ?? ''} />
          <Field name="nino"          label="National Insurance Number"    placeholder="AB 12 34 56 C" mono         defaultValue={t?.nino ?? ''} />
          <Field name="nationality"   label="Nationality"                  placeholder="e.g. British"               defaultValue={t?.nationality ?? ''} />
          <Field name="date_entry_uk" label="Date of Entry to UK"          type="date"                              defaultValue={t?.date_entry_uk ?? ''} />
          <Field name="mobile"        label="Primary Mobile"               placeholder="+44 7000 000000"            defaultValue={t?.mobile ?? ''} />
          <Field name="email"         label="Email Address"                type="email" placeholder="john@example.com" defaultValue={t?.email ?? ''} />
          <Field name="languages"     label="Languages Spoken"             placeholder="e.g. English, Urdu"         defaultValue={t?.languages ?? ''} />
        </Section>
        <Section title="2.0  Housing">
          <Field name="address"       label="Full Address"   placeholder="12 Example Street, Birmingham B1 2AB" defaultValue={t?.address ?? ''} />
          <Field name="room_number"   label="Room Number"    placeholder="Room 4B"                               defaultValue={t?.room_number ?? ''} />
          <Field name="moved_in"      label="Move-In Date"   type="date"                                         defaultValue={t?.moved_in ?? ''} />
        </Section>
        <Section title="3.0  Benefits">
          <SelectField name="benefit_type" label="Benefit Type"       options={['Universal Credit', 'Housing Benefit', 'PIP', 'ESA', 'JSA', 'None']}    defaultValue={t?.benefit_type ?? ''} />
          <SelectField name="benefit_freq" label="Payment Frequency"  options={['Monthly', 'Fortnightly', 'Weekly']}                                      defaultValue={t?.benefit_freq ?? ''} />
          <Field       name="benefit_amount" label="Benefit Amount (£)" type="number" placeholder="0.00"                                                  defaultValue={t?.benefit_amount != null ? String(t.benefit_amount) : ''} />
        </Section>
        <Section title="4.0  Next of Kin">
          <Field name="nok_name"     label="Name"         placeholder="Full name"            defaultValue={t?.nok_name ?? ''} />
          <Field name="nok_relation" label="Relationship" placeholder="e.g. Brother"         defaultValue={t?.nok_relation ?? ''} />
          <Field name="nok_phone"    label="Phone"        placeholder="+44 7000 000000"       defaultValue={t?.nok_phone ?? ''} />
          <Field name="nok_address"  label="Address"      placeholder="Full postal address"   defaultValue={t?.nok_address ?? ''} />
        </Section>
        <Section title="5.0  Medical & Other">
          <Field name="doctor"            label="GP Name & Surgery"               placeholder="Dr Smith — Digbeth Medical Centre" defaultValue={t?.doctor ?? ''} />
          <Field name="probation_officer" label="Probation Officer (if applicable)" placeholder="Officer name"                    defaultValue={t?.probation_officer ?? ''} />
        </Section>
      </>
    ),

    housing: (
      <Section title="1.0  Housing Benefit Claim">
        <Field name="claim_reference"  label="Claim Reference Number"   placeholder="HBC-2026-XXXXX" mono />
        <SelectField name="claim_type" label="Claim Type"               options={['Housing Benefit', 'Universal Credit — Housing Element', 'Other']} />
        <Field name="landlord_name"    label="Landlord Name"            placeholder="Ash Shahada Housing Association Ltd" />
        <Field name="landlord_account" label="Landlord Account No."     placeholder="SORT-CODE / ACCOUNT" mono />
        <Field name="weekly_rent"      label="Weekly Rent Amount (£)"   type="number" placeholder="150.00" />
        <Field name="claim_start_date" label="Claim Start Date"         type="date" />
        <Field name="assessment_notes" label="Assessment Notes"         textarea />
      </Section>
    ),

    assessment: (
      <Section title="1.0  Initial Assessment">
        <SelectField name="risk_level"       label="Risk Level"         options={['Low', 'Medium', 'High', 'Critical']} />
        <Field       name="presenting_needs" label="Presenting Needs"   textarea placeholder="Describe the tenant's primary needs at intake..." />
        <Field       name="support_goals"    label="Support Goals"      textarea placeholder="List 3–5 goals for the support plan..." />
        <Field       name="assigned_worker"  label="Assigned Key Worker" placeholder="Worker full name" />
        <Field       name="review_date"      label="Review Date"        type="date" />
      </Section>
    ),

    risk: (
      <Section title="1.0  Risk Assessment & Support Plan">
        <Field       name="risk_categories"   label="Risk Categories Identified" textarea placeholder="e.g. Self-harm, substance misuse, housing instability..." />
        <SelectField name="risk_severity"     label="Overall Risk Severity"      options={['Low', 'Medium', 'High', 'Critical']} />
        <Field       name="mitigation_actions" label="Mitigation Actions"        textarea placeholder="List actions agreed with tenant and key worker..." />
        <Field       name="sign_off_name"     label="Support Worker Sign-Off"   placeholder="Full name" />
        <Field       name="sign_off_date"     label="Sign-Off Date"             type="date" />
      </Section>
    ),

    missing: (
      <>
        <Section title="1.0  Physical Description">
          <Field name="height"                label="Height"                   placeholder="e.g. 5ft 10in / 178cm" />
          <Field name="build"                 label="Build"                    placeholder="e.g. Medium, Stocky, Slim" />
          <Field name="hair"                  label="Hair Colour & Style"      placeholder="e.g. Black, short" />
          <Field name="eye_colour"            label="Eye Colour"               placeholder="e.g. Brown" />
          <Field name="physical_description"  label="Distinguishing Features"  textarea placeholder="Scars, tattoos, birthmarks..." defaultValue={t?.physical_description ?? ''} />
        </Section>
        <Section title="2.0  Employment & Education">
          <Field name="employer_or_college"   label="Employer / College"       placeholder="Name and address" defaultValue={t?.employer_or_college ?? ''} />
          <Field name="last_known_location"   label="Last Known Location"      placeholder="Address or description" />
        </Section>
        <Section title="3.0  Vehicle Details">
          <Field name="vehicle_registration"  label="Vehicle Registration"     placeholder="AB12 CDE" mono defaultValue={t?.vehicle_registration ?? ''} />
          <Field name="vehicle_make_model"    label="Make & Model"             placeholder="e.g. Ford Focus, Black" />
        </Section>
        <Section title="4.0  Authority Signature">
          <Field name="authorising_officer"   label="Authorising Officer"      placeholder="Full name and role" />
          <Field name="date_reported"         label="Date Reported"            type="date" />
        </Section>
      </>
    ),

    service: (
      <Section title="1.0  Service Charge Agreement">
        <Field       name="weekly_rate"            label="Weekly Rate (£)"      type="number" placeholder="150.00" />
        <SelectField name="payment_method"         label="Payment Method"       options={['Cash', 'Bank Transfer', 'Housing Benefit Direct', 'Standing Order']} />
        <Field       name="agreement_start_date"   label="Agreement Start Date" type="date" />
        <Field       name="tenant_acknowledgement" label="Tenant Acknowledgement" textarea placeholder="I agree to pay the weekly service charge of £___ per week…" />
      </Section>
    ),

    privacy: (
      <Section title="1.0  Confidentiality Waiver">
        <div className="col-span-2 text-xs text-slate-600 leading-relaxed border border-slate-200 rounded-lg p-4 bg-slate-50">
          I, the undersigned, hereby authorise Ash Shahada Housing Association Ltd and its staff to share
          relevant information about my case with partner agencies, including but not limited to Birmingham
          City Council, probation services, and healthcare providers, where this is necessary for the
          delivery of housing support services. I understand my rights under the Data Protection Act 2018
          and the UK GDPR.
        </div>
        {t?.confidentiality_signed && (
          <div className="col-span-2 flex items-center gap-2 px-3 py-2 bg-emerald-50 border border-emerald-200 rounded-lg">
            <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0" />
            <span className="text-xs text-emerald-700 font-semibold">
              Signed on {t.confidentiality_signed_at
                ? new Date(t.confidentiality_signed_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
                : 'record'}
            </span>
          </div>
        )}
        <Field name="resident_name"      label="Resident Full Name"          placeholder="Print name clearly"                 defaultValue={t?.full_name ?? ''} />
        <Field name="resident_signature" label="Resident Signature"          placeholder="Digital signature or print name" />
        <Field name="date"               label="Date"                        type="date" />
        <Field name="witness_name"       label="Witness: Ahsan Rehman"       placeholder="Authorised signatory — ASHA" />
        <Field name="witness_date"       label="Witness Date"                type="date" />
      </Section>
    ),
  };
}

// ── Form title map ────────────────────────────────────────────────────────────

const FORM_TITLES: Record<FormId, string> = {
  personal:   'Personal Details',
  housing:    'Housing Benefit Claim',
  assessment: 'Initial Assessment',
  risk:       'Risk Assessment & Support Plan',
  missing:    'Missing Person Form',
  service:    'Service Charge Agreement',
  privacy:    'Confidentiality Waiver',
  'ai-brain': 'AI Brain',
};

// ── Main component ────────────────────────────────────────────────────────────

interface Props {
  brand: Brand;
  activeForm: FormId;
  activeTenant: string;
  activeTenantObj?: DbTenant | null;
  workerId?: string;
  onSaved?: () => void;
}

type SaveStatus = 'idle' | 'saving' | 'saved' | 'error';

export default function FormWorkspace({
  brand,
  activeForm,
  activeTenant,
  activeTenantObj,
  workerId,
  onSaved,
}: Props) {
  const lh = LETTERHEAD[brand];
  const today = new Date().toLocaleDateString('en-GB', {
    day: 'numeric', month: 'long', year: 'numeric',
  });

  const formRef = useRef<HTMLFormElement>(null);
  const [status, setStatus]     = useState<SaveStatus>('idle');
  const [errMsg, setErrMsg]     = useState('');

  const handleSave = useCallback(async (stamp: boolean) => {
    if (!activeTenantObj) return;
    if (!formRef.current) return;

    const raw = new FormData(formRef.current);
    const data: Record<string, string> = {};
    raw.forEach((val, key) => { data[key] = String(val); });

    setStatus('saving');
    setErrMsg('');

    try {
      const res = await fetch('/api/forms/save', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          form_id:   activeForm,
          tenant_id: activeTenantObj.id,
          data,
          stamp,
        }),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? 'Save failed');

      setStatus('saved');
      setTimeout(() => setStatus('idle'), 3000);
      onSaved?.();
    } catch (e: unknown) {
      setErrMsg(e instanceof Error ? e.message : 'Save failed');
      setStatus('error');
      setTimeout(() => setStatus('idle'), 5000);
    }
  }, [activeForm, activeTenantObj, onSaved]);

  // ── AI Brain gets its own full-height panel ───────────────────────────────

  if (activeForm === 'ai-brain') {
    return (
      <main className="flex-1 overflow-hidden bg-white">
        {activeTenantObj && workerId ? (
          <AIBrainPanel tenant={activeTenantObj} workerId={workerId} />
        ) : (
          <div className="flex items-center justify-center h-full text-slate-400 text-sm">
            Select a tenant to use the AI Brain.
          </div>
        )}
      </main>
    );
  }

  const formSections = buildFormSections(activeTenantObj);

  return (
    <main className="flex-1 overflow-y-auto bg-cream px-8 py-6" data-brand={brand}>
      <div
        className="max-w-3xl mx-auto bg-white shadow-lg rounded-sm border border-slate-200
                   min-h-[1056px] p-12 relative"
      >
        {/* ── Letterhead ── */}
        <div className="flex justify-between items-start pb-6 mb-8 brand-border-bottom">
          <div>
            <h2 className="text-2xl font-black text-navy tracking-tight uppercase">
              {lh.name}
            </h2>
            <p className="text-xxs text-slate-400 font-semibold tracking-widest uppercase mt-1">
              {lh.tagline}
            </p>
          </div>
          <div className="text-right">
            <p className="text-xxs font-mono font-semibold text-slate-400 uppercase">
              {lh.formRef}-{String(Math.floor(Math.random() * 90) + 10).padStart(2, '0')}
            </p>
            <p className="text-xs font-medium text-slate-600 mt-0.5">{today}</p>
            <p className="text-xxs text-slate-400 mt-0.5">
              Resident: <span className="text-navy font-semibold">{activeTenant}</span>
            </p>
          </div>
        </div>

        {/* ── Form title ── */}
        <div className="mb-8">
          <div className="brand-badge inline-block text-xxs font-black uppercase tracking-widest px-2 py-1 rounded mb-3">
            {FORM_TITLES[activeForm]}
          </div>
          <p className="text-xxs text-slate-400">
            All fields are recorded and blockchain-stamped upon save. Corrections must be
            made by a Manager or Support Worker — the original entry is preserved in the
            audit trail.
          </p>
        </div>

        {/* ── No tenant selected guard ── */}
        {!activeTenantObj ? (
          <div className="flex items-center justify-center py-20">
            <p className="text-slate-400 text-sm">Select a tenant from the list to load this form.</p>
          </div>
        ) : (
          /* key forces remount (and defaultValue reset) when tenant or form changes */
          <form
            key={`${activeTenantObj.id}-${activeForm}`}
            ref={formRef}
            onSubmit={(e) => { e.preventDefault(); handleSave(true); }}
          >
            {formSections[activeForm]}
          </form>
        )}

        {/* ── Status bar ── */}
        {status !== 'idle' && (
          <div className={`absolute bottom-24 left-12 right-12 flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold
            ${status === 'saved' ? 'bg-emerald-50 border border-emerald-200 text-emerald-700' : ''}
            ${status === 'saving' ? 'bg-amber/10 border border-amber/30 text-amber-dark' : ''}
            ${status === 'error' ? 'bg-red-50 border border-red-200 text-red-600' : ''}`}
          >
            {status === 'saving' && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            {status === 'saved'  && <CheckCircle2 className="w-3.5 h-3.5" />}
            {status === 'error'  && <AlertCircle className="w-3.5 h-3.5" />}
            {status === 'saving' && 'Saving…'}
            {status === 'saved'  && 'Saved and blockchain-stamped.'}
            {status === 'error'  && (errMsg || 'Save failed — try again.')}
          </div>
        )}

        {/* ── Footer actions ── */}
        <div className="absolute bottom-10 right-12 flex items-center gap-3">
          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-navy/5 border border-navy/10 rounded-lg">
            <Link className="w-3 h-3 text-slate-400" />
            <span className="font-mono text-xxs text-slate-400 tracking-widest">
              SHA-256 · {status === 'saved' ? 'stamped' : 'pending'}
            </span>
          </div>

          <button
            type="button"
            onClick={() => handleSave(false)}
            disabled={!activeTenantObj || status === 'saving'}
            className="flex items-center gap-2 border border-slate-300 text-slate-600
                       px-4 py-2 rounded-lg text-xs font-bold hover:bg-slate-50 transition-colors
                       disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <Save className="w-3.5 h-3.5" />
            Save Draft
          </button>

          <button
            type="button"
            onClick={() => handleSave(true)}
            disabled={!activeTenantObj || status === 'saving'}
            className="brand-btn flex items-center gap-2 text-white px-4 py-2 rounded-lg
                       text-xs font-bold transition-colors
                       disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {status === 'saving'
              ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
              : null}
            Save &amp; Stamp
          </button>
        </div>
      </div>
    </main>
  );
}
