'use client';

import { Save, Link } from 'lucide-react';
import type { Brand } from './LetterheadSwitcher';
import type { FormId } from './FormsPanel';
import type { DbTenant } from '@/types/database';
import AIBrainPanel from '@/components/ai/AIBrainPanel';

// ── Brand letterhead configs ──────────────────────────────────────────────────

const LETTERHEAD: Record<Brand, {
  name: string;
  tagline: string;
  accentColor: string;
  formRef: string;
}> = {
  mattys_place: {
    name: "Matty's Place",
    tagline: 'Supported Housing & Community Services',
    accentColor: '#E8A84C',
    formRef: 'MP-TN-2026',
  },
  ash_shahada: {
    name: 'Ash Shahada Housing Association Ltd',
    tagline: 'Birmingham HMO & Social Housing — Registered Charity',
    accentColor: '#2A6496',
    formRef: 'ASHA-TN-2026',
  },
  reliance: {
    name: 'Reliance Housing',
    tagline: 'Community Support Services, Birmingham',
    accentColor: '#1A7A4A',
    formRef: 'RH-TN-2026',
  },
};

// ── Form section definitions ──────────────────────────────────────────────────

const FORM_SECTIONS: Partial<Record<FormId, React.ReactNode>> = {
  personal: (
    <>
      <Section title="1.0  Personal Information">
        <Field label="Full Legal Name" placeholder="e.g. John Stevenson" />
        <Field label="Date of Birth" type="date" />
        <Field label="National Insurance Number" placeholder="AB 12 34 56 C" mono />
        <Field label="Nationality" placeholder="e.g. British" />
        <Field label="Date of Entry to UK" type="date" />
        <Field label="Primary Mobile" placeholder="+44 7000 000000" />
        <Field label="Email Address" type="email" placeholder="john@example.com" />
        <Field label="Languages Spoken" placeholder="e.g. English, Urdu" />
      </Section>
      <Section title="2.0  Housing">
        <Field label="Full Address" placeholder="12 Example Street, Birmingham B1 2AB" />
        <Field label="Room Number" placeholder="Room 4B" />
        <Field label="Move-In Date" type="date" />
      </Section>
      <Section title="3.0  Benefits">
        <SelectField label="Benefit Type" options={['Universal Credit', 'Housing Benefit', 'PIP', 'ESA', 'JSA', 'None']} />
        <SelectField label="Payment Frequency" options={['Monthly', 'Fortnightly', 'Weekly']} />
        <Field label="Benefit Amount (£)" type="number" placeholder="0.00" />
      </Section>
      <Section title="4.0  Next of Kin">
        <Field label="Name" placeholder="Full name" />
        <Field label="Relationship" placeholder="e.g. Brother" />
        <Field label="Phone" placeholder="+44 7000 000000" />
        <Field label="Address" placeholder="Full postal address" />
      </Section>
      <Section title="5.0  Medical & Other">
        <Field label="GP Name & Surgery" placeholder="Dr Smith — Digbeth Medical Centre" />
        <Field label="Probation Officer (if applicable)" placeholder="Officer name" />
      </Section>
    </>
  ),
  housing: (
    <Section title="1.0  Housing Benefit Claim">
      <Field label="Claim Reference Number" placeholder="HBC-2026-XXXXX" mono />
      <SelectField label="Claim Type" options={['Housing Benefit', 'Universal Credit — Housing Element', 'Other']} />
      <Field label="Landlord Name" placeholder="Ash Shahada Housing Association Ltd" />
      <Field label="Landlord Account No." placeholder="SORT-CODE / ACCOUNT" mono />
      <Field label="Weekly Rent Amount (£)" type="number" placeholder="150.00" />
      <Field label="Claim Start Date" type="date" />
      <Field label="Assessment Notes" textarea />
    </Section>
  ),
  assessment: (
    <Section title="1.0  Initial Assessment">
      <SelectField label="Risk Level" options={['Low', 'Medium', 'High', 'Critical']} />
      <Field label="Presenting Needs" textarea placeholder="Describe the tenant's primary needs at intake..." />
      <Field label="Support Goals" textarea placeholder="List 3–5 goals for the support plan..." />
      <Field label="Assigned Key Worker" placeholder="Worker full name" />
      <Field label="Review Date" type="date" />
    </Section>
  ),
  risk: (
    <Section title="1.0  Risk Assessment & Support Plan">
      <Field label="Risk Categories Identified" textarea placeholder="e.g. Self-harm, substance misuse, housing instability..." />
      <SelectField label="Overall Risk Severity" options={['Low', 'Medium', 'High', 'Critical']} />
      <Field label="Mitigation Actions" textarea placeholder="List actions agreed with tenant and key worker..." />
      <Field label="Support Worker Sign-Off" placeholder="Full name" />
      <Field label="Sign-Off Date" type="date" />
    </Section>
  ),
  missing: (
    <>
      <Section title="1.0  Physical Description">
        <Field label="Height" placeholder="e.g. 5ft 10in / 178cm" />
        <Field label="Build" placeholder="e.g. Medium, Stocky, Slim" />
        <Field label="Hair Colour & Style" placeholder="e.g. Black, short" />
        <Field label="Eye Colour" placeholder="e.g. Brown" />
        <Field label="Distinguishing Features" textarea placeholder="Scars, tattoos, birthmarks..." />
      </Section>
      <Section title="2.0  Employment & Education">
        <Field label="Employer / College" placeholder="Name and address" />
        <Field label="Last Known Location" placeholder="Address or description" />
      </Section>
      <Section title="3.0  Vehicle Details">
        <Field label="Vehicle Registration" placeholder="AB12 CDE" mono />
        <Field label="Make & Model" placeholder="e.g. Ford Focus, Black" />
      </Section>
      <Section title="4.0  Authority Signature">
        <Field label="Authorising Officer" placeholder="Full name and role" />
        <Field label="Date Reported" type="date" />
      </Section>
    </>
  ),
  service: (
    <Section title="1.0  Service Charge Agreement">
      <Field label="Weekly Rate (£)" type="number" placeholder="150.00" />
      <SelectField label="Payment Method" options={['Cash', 'Bank Transfer', 'Housing Benefit Direct', 'Standing Order']} />
      <Field label="Agreement Start Date" type="date" />
      <Field label="Tenant Acknowledgement" textarea placeholder="I agree to pay the weekly service charge of £___ per week..." />
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
      <Field label="Resident Full Name" placeholder="Print name clearly" />
      <Field label="Resident Signature" placeholder="Digital signature or print name" />
      <Field label="Date" type="date" />
      <Field label="Witness: Ahsan Rehman" placeholder="Authorised signatory — ASHA" />
      <Field label="Witness Date" type="date" />
    </Section>
  ),
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
  label,
  type = 'text',
  placeholder = '',
  textarea = false,
  mono = false,
}: {
  label: string;
  type?: string;
  placeholder?: string;
  textarea?: boolean;
  mono?: boolean;
}) {
  const baseClass = `w-full border-b border-field-line py-1.5 text-sm text-navy bg-transparent
    focus:border-navy focus:outline-none transition-colors placeholder-slate-300
    ${mono ? 'font-mono tracking-widest' : ''}`;

  return (
    <div className={`space-y-1 ${textarea ? 'col-span-2' : ''}`}>
      <label className="text-xxs font-black text-slate-400 uppercase tracking-wider">
        {label}
      </label>
      {textarea ? (
        <textarea
          placeholder={placeholder}
          rows={3}
          className={`${baseClass} border border-slate-200 rounded-lg px-3 py-2 resize-none`}
        />
      ) : (
        <input type={type} placeholder={placeholder} className={baseClass} />
      )}
    </div>
  );
}

function SelectField({ label, options }: { label: string; options: string[] }) {
  const fieldId = `field-${label.toLowerCase().replace(/\s+/g, '-')}`;
  return (
    <div className="space-y-1">
      <label htmlFor={fieldId} className="text-xxs font-black text-slate-400 uppercase tracking-wider">
        {label}
      </label>
      <select id={fieldId} className="w-full border-b border-field-line py-1.5 text-sm text-navy bg-transparent focus:border-navy focus:outline-none transition-colors">
        <option value="">Select…</option>
        {options.map((o) => (
          <option key={o} value={o}>{o}</option>
        ))}
      </select>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

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

interface Props {
  brand: Brand;
  activeForm: FormId;
  activeTenant: string;
  activeTenantObj?: DbTenant | null;
  workerId?: string;
}

export default function FormWorkspace({ brand, activeForm, activeTenant, activeTenantObj, workerId }: Props) {
  const lh = LETTERHEAD[brand];
  const today = new Date().toLocaleDateString('en-GB', {
    day: 'numeric', month: 'long', year: 'numeric',
  });

  // AI Brain gets its own full-height panel, no letterhead wrapper
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

  return (
    <main className="flex-1 overflow-y-auto bg-cream px-8 py-6">
      <div
        className="max-w-3xl mx-auto bg-white shadow-lg rounded-sm border border-slate-200
                   min-h-[1056px] p-12 relative"
      >
        {/* ── Letterhead ── */}
        <div
          className="flex justify-between items-start pb-6 mb-8"
          style={{ borderBottom: `3px solid ${lh.accentColor}` }}
        >
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
          <div
            className="inline-block text-xxs font-black uppercase tracking-widest px-2 py-1 rounded mb-3"
            style={{ backgroundColor: `${lh.accentColor}22`, color: lh.accentColor }}
          >
            {FORM_TITLES[activeForm]}
          </div>
          <p className="text-xxs text-slate-400">
            All fields are recorded and blockchain-stamped upon save. Corrections must be
            made by a Manager or Support Worker — the original entry is preserved in the
            audit trail.
          </p>
        </div>

        {/* ── Dynamic form section ── */}
        {FORM_SECTIONS[activeForm]}

        {/* ── Footer actions ── */}
        <div className="absolute bottom-10 right-12 flex items-center gap-3">
          {/* Blockchain hash preview */}
          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-navy/5 border border-navy/10 rounded-lg">
            <Link className="w-3 h-3 text-slate-400" />
            <span className="font-mono text-xxs text-slate-400 tracking-widest">
              SHA-256 · pending
            </span>
          </div>

          <button
            className="flex items-center gap-2 border border-slate-300 text-slate-600
                       px-4 py-2 rounded-lg text-xs font-bold hover:bg-slate-50 transition-colors"
          >
            <Save className="w-3.5 h-3.5" />
            Save Draft
          </button>

          <button
            className="flex items-center gap-2 text-white px-4 py-2 rounded-lg
                       text-xs font-bold transition-colors"
            style={{ backgroundColor: lh.accentColor }}
          >
            Save & Stamp
          </button>
        </div>
      </div>
    </main>
  );
}
