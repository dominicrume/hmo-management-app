'use client';

// Form 05 — Confidentiality Waiver
// Source: Ash Shahada Housing Association, Page 5 of 53
// Step 4 — tenant signs. Dual signature: resident + Ahsan Rehman (ASHA signatory).
// Blockchain-stamped on both signatures.

import { useState } from 'react';
import { TextField, CheckboxField, FormSection, FormActions } from './FormField';
import { Lock, ShieldCheck } from 'lucide-react';

const AUTHORISATION_TEXT = `I, the undersigned, hereby authorise Ash Shahada Housing Association
Ltd and its staff to share relevant information about my case with partner agencies including,
but not limited to, Birmingham City Council, West Midlands Police, probation services,
healthcare providers, and other housing support organisations, where this is necessary for the
delivery of housing support services, safeguarding duties, or compliance with legal obligations.

I understand and acknowledge my rights under the Data Protection Act 2018 and the UK General
Data Protection Regulation (UK GDPR). I understand that my information will be held securely,
used only for the purposes stated, and not shared beyond what is necessary.

I understand that I may withdraw this consent at any time by notifying Ash Shahada Housing
Association Ltd in writing.`;

const RESIDENT_RIGHTS = [
  'The right to access the personal data held about me.',
  'The right to request correction of inaccurate data.',
  'The right to request deletion of my data (subject to legal retention requirements).',
  'The right to object to processing of my data.',
  'The right to receive a copy of my data in a portable format.',
  'The right to lodge a complaint with the Information Commissioner\'s Office (ICO).',
];

export interface Form05Data {
  resident_name:          string;
  resident_signature:     string;   // typed name = valid digital signature
  resident_signed_at:     string;
  consent_information_sharing: boolean;
  consent_data_processing:     boolean;
  rights_acknowledged:         boolean;
  witness_name:           string;   // Ahsan Rehman or appointed signatory
  witness_signature:      string;
  witness_signed_at:      string;
}

const EMPTY: Form05Data = {
  resident_name: '', resident_signature: '', resident_signed_at: '',
  consent_information_sharing: false, consent_data_processing: false,
  rights_acknowledged: false,
  witness_name: 'Ahsan Rehman', witness_signature: '', witness_signed_at: '',
};

function validate(d: Form05Data): Record<string, string> {
  const e: Record<string, string> = {};
  if (!d.resident_name.trim())      e.resident_name      = 'Resident name is required.';
  if (!d.resident_signature.trim()) e.resident_signature = 'Signature is required — type your full name.';
  if (!d.consent_information_sharing) e.consents         = 'All consents must be agreed before signing.';
  if (!d.consent_data_processing)     e.consents         = 'All consents must be agreed before signing.';
  if (!d.rights_acknowledged)         e.consents         = 'You must acknowledge your rights.';
  if (!d.witness_signature.trim())  e.witness_signature  = 'Witness signature is required.';
  return e;
}

interface Props {
  residentName?: string;   // pre-filled from Form 3
  onSubmit: (data: Form05Data) => void;
  onSaveDraft?: (data: Form05Data) => void;
  readOnly?: boolean;
  tenantView?: boolean;    // true = tenant-facing portal (simplified header)
}

export default function Form05ConfidentialityWaiver({
  residentName, onSubmit, onSaveDraft, readOnly, tenantView,
}: Props) {
  const [data, setData] = useState<Form05Data>({
    ...EMPTY,
    resident_name: residentName ?? '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [signed, setSigned] = useState(false);

  const set = (field: keyof Form05Data) => (v: string | boolean) =>
    setData((prev) => ({ ...prev, [field]: v }));

  const handleResidentSign = () => {
    const errs = validate(data);
    if (Object.keys(errs).length) { setErrors(errs); return; }
    const now = new Date().toISOString();
    setData((prev) => ({
      ...prev,
      resident_signed_at: now,
      witness_signed_at: prev.witness_signature ? now : '',
    }));
    setSigned(true);
  };

  const handleSubmit = () => {
    const errs = validate(data);
    if (Object.keys(errs).length) { setErrors(errs); return; }
    onSubmit({ ...data, resident_signed_at: data.resident_signed_at || new Date().toISOString() });
  };

  return (
    <div>
      {/* Header notice */}
      <div className="mb-6 flex items-start gap-3 px-4 py-3 bg-navy/5 border border-navy/10 rounded-lg">
        <Lock className="w-4 h-4 text-navy flex-shrink-0 mt-0.5" />
        <div>
          <p className="text-xs font-bold text-navy mb-1">Confidentiality & Data Consent</p>
          <p className="text-xxs text-slate-500">
            This form must be completed and signed before any personal data is stored or shared.
            The tenant signature creates a blockchain-verified consent event.
          </p>
        </div>
      </div>

      {/* Full authorisation text */}
      <FormSection title="Declaration" number="1.0">
        <div className="col-span-2 text-xs text-slate-600 leading-relaxed bg-slate-50 border border-slate-200 rounded-lg p-4">
          {AUTHORISATION_TEXT.split('\n\n').map((para, i) => (
            <p key={i} className={i > 0 ? 'mt-3' : ''}>{para}</p>
          ))}
        </div>
      </FormSection>

      {/* Resident rights */}
      <FormSection title="Your Rights" number="2.0">
        <div className="col-span-2">
          <ul className="space-y-2">
            {RESIDENT_RIGHTS.map((right, i) => (
              <li key={i} className="flex items-start gap-2 text-xs text-slate-600">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0 mt-0.5" />
                {right}
              </li>
            ))}
          </ul>
        </div>
      </FormSection>

      {/* Consents */}
      <FormSection title="Consents" number="3.0">
        {errors.consents && (
          <div className="col-span-2 px-3 py-2 bg-red-50 border border-red-200 rounded-lg text-xs text-red-600 font-semibold">
            {errors.consents}
          </div>
        )}
        <CheckboxField
          label="I consent to information sharing with partner agencies as described above."
          checked={data.consent_information_sharing}
          onChange={set('consent_information_sharing') as (v: boolean) => void}
          colSpan2
        />
        <CheckboxField
          label="I consent to my personal data being processed for housing support purposes."
          checked={data.consent_data_processing}
          onChange={set('consent_data_processing') as (v: boolean) => void}
          colSpan2
        />
        <CheckboxField
          label="I acknowledge that I have been informed of my rights under UK GDPR."
          checked={data.rights_acknowledged}
          onChange={set('rights_acknowledged') as (v: boolean) => void}
          colSpan2
        />
      </FormSection>

      {/* Resident signature */}
      <FormSection title="Resident Signature" number="4.0">
        <TextField
          label="Resident Full Name"
          required
          value={data.resident_name}
          onChange={set('resident_name') as (v: string) => void}
          placeholder="Print full legal name"
          error={errors.resident_name}
        />
        <TextField
          label="Digital Signature (type full name)"
          required
          value={data.resident_signature}
          onChange={set('resident_signature') as (v: string) => void}
          placeholder="Type your full name to sign"
          error={errors.resident_signature}
        />
        {data.resident_signed_at && (
          <div className="col-span-2 flex items-center gap-2 px-3 py-2 bg-emerald-50 border border-emerald-200 rounded-lg">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
            <span className="text-xxs font-mono text-emerald-700">
              Signed: {new Date(data.resident_signed_at).toLocaleString('en-GB')} · Blockchain stamp pending
            </span>
          </div>
        )}
      </FormSection>

      {/* Witness signature (Ahsan Rehman / staff) */}
      {!tenantView && (
        <FormSection title="Witness Signature — Authorised Signatory" number="5.0">
          <TextField
            label="Witness Name"
            required
            value={data.witness_name}
            onChange={set('witness_name') as (v: string) => void}
            placeholder="Ahsan Rehman"
            error={errors.witness_signature}
          />
          <TextField
            label="Witness Digital Signature"
            required
            value={data.witness_signature}
            onChange={set('witness_signature') as (v: string) => void}
            placeholder="Type full name to witness"
            error={errors.witness_signature}
          />
        </FormSection>
      )}

      {!readOnly && (
        <FormActions
          onSaveDraft={onSaveDraft ? () => onSaveDraft(data) : undefined}
          onSubmit={tenantView ? handleResidentSign : handleSubmit}
          submitLabel={tenantView ? 'Sign & Confirm' : 'Save Signed Waiver'}
        />
      )}
    </div>
  );
}
