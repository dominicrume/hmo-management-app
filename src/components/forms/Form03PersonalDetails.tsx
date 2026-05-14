'use client';

// Form 03 — Personal Details
// Source: Ash Shahada Housing Association, Page 3 of 53 + /form3personal.md
// Primary tenant record — every field here auto-populates all other forms.
// Steps 1–4 of intake pipeline.

import { useState } from 'react';
import { TextField, TextareaField, SelectField, PhoneField, FormSection, FormActions } from './FormField';

// ── Validation helpers ────────────────────────────────────────────────────────

const NINO_RE  = /^[A-Z]{2}\s?\d{2}\s?\d{2}\s?\d{2}\s?[A-D]$/i;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_RE = /^\+[1-9]\d{6,14}$/; // E.164 format from PhoneInput

function validate(d: Form03Data): Record<string, string> {
  const e: Record<string, string> = {};
  if (!d.title)                        e.title        = 'Title is required.';
  if (!d.full_name.trim())             e.full_name    = 'Full name is required.';
  if (d.full_name.length > 100)        e.full_name    = 'Maximum 100 characters.';
  if (!d.dob)                          e.dob          = 'Date of birth is required.';
  if (!NINO_RE.test(d.nino))          e.nino         = 'Format: AB 12 34 56 C';
  if (!d.nationality.trim())           e.nationality  = 'Nationality is required.';
  if (!d.address.trim())               e.address      = 'Address is required.';
  if (!d.room_number.trim())           e.room_number  = 'Room number is required.';
  if (!d.mobile || !PHONE_RE.test(d.mobile.replace(/\s/g, ''))) e.mobile = 'Enter a valid international mobile number.';
  if (d.email && !EMAIL_RE.test(d.email)) e.email     = 'Enter a valid email address.';
  if (!d.benefit_type)                 e.benefit_type = 'Benefit type is required.';
  if (!d.benefit_freq)                 e.benefit_freq = 'Frequency is required.';
  if (!d.benefit_amount || isNaN(Number(d.benefit_amount)))
                                       e.benefit_amount = 'Enter a valid amount.';
  if (!d.nok_name.trim())              e.nok_name     = 'Next of kin name is required.';
  if (!d.nok_relation.trim())          e.nok_relation = 'Relationship is required.';
  if (!d.nok_phone || !PHONE_RE.test(d.nok_phone.replace(/\s/g, ''))) e.nok_phone = 'Enter a valid international phone number.';
  if (!d.moved_in)                     e.moved_in     = 'Move-in date is required.';
  return e;
}

// ── Types ─────────────────────────────────────────────────────────────────────

export interface Form03Data {
  // Personal
  title:          string;
  full_name:      string;
  dob:            string;
  nino:           string;
  nationality:    string;
  date_entry_uk:  string;   // conditional: non-UK nationals
  // Contact
  address:        string;
  room_number:    string;
  email:          string;
  mobile:         string;
  languages:      string;
  // Housing
  moved_in:       string;
  // Benefits
  benefit_type:   string;
  benefit_freq:   string;
  benefit_amount: string;
  // Next of Kin
  nok_name:       string;
  nok_relation:   string;
  nok_phone:      string;
  nok_address:    string;
  // Medical & other
  doctor:         string;
  on_probation:   boolean;
  probation_officer: string;
  // Marital status
  marital_status: string;
}

const EMPTY: Form03Data = {
  title: '', full_name: '', dob: '', nino: '', nationality: '',
  date_entry_uk: '', address: '', room_number: '', email: '',
  mobile: '', languages: '', moved_in: '',
  benefit_type: '', benefit_freq: '', benefit_amount: '',
  nok_name: '', nok_relation: '', nok_phone: '', nok_address: '',
  doctor: '', on_probation: false, probation_officer: '',
  marital_status: '',
};

interface Props {
  initialData?: Partial<Form03Data>;
  /** Called when OCR populates fields — merges extracted values */
  ocrData?: Partial<Form03Data>;
  onSubmit: (data: Form03Data) => void;
  onSaveDraft?: (data: Form03Data) => void;
  readOnly?: boolean;
}

export default function Form03PersonalDetails({ initialData, ocrData, onSubmit, onSaveDraft, readOnly }: Props) {
  const [data, setData]     = useState<Form03Data>({ ...EMPTY, ...initialData, ...ocrData });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  const set = (field: keyof Form03Data) => (v: string | boolean) =>
    setData((prev) => ({ ...prev, [field]: v }));

  const handleSubmit = () => {
    const errs = validate(data);
    if (Object.keys(errs).length) { setErrors(errs); return; }
    setSubmitting(true);
    onSubmit(data);
  };

  const isNonUK = data.nationality.toLowerCase() !== 'british' &&
                  data.nationality.toLowerCase() !== 'uk' &&
                  data.nationality.trim().length > 0;

  return (
    <div>
      <FormSection title="Personal Information" number="1.0">
        <SelectField
          label="Title"
          required
          value={data.title}
          onChange={set('title')}
          options={['Mr', 'Mrs', 'Ms', 'Miss', 'Dr', 'Other']}
          error={errors.title}
        />
        <TextField
          label="Full Legal Name"
          required
          value={data.full_name}
          onChange={set('full_name') as (v: string) => void}
          placeholder="As on official documents"
          maxLength={100}
          error={errors.full_name}
        />
        <TextField
          label="Date of Birth"
          required
          type="date"
          value={data.dob}
          onChange={set('dob') as (v: string) => void}
          error={errors.dob}
        />
        <TextField
          label="National Insurance Number"
          required
          value={data.nino}
          onChange={(v) => set('nino')(v.toUpperCase())}
          placeholder="AB 12 34 56 C"
          mono
          hint="Format: AB 12 34 56 C"
          error={errors.nino}
        />
        <TextField
          label="Nationality"
          required
          value={data.nationality}
          onChange={set('nationality') as (v: string) => void}
          placeholder="e.g. British, Somali"
          error={errors.nationality}
        />
        <SelectField
          label="Marital Status"
          value={data.marital_status}
          onChange={set('marital_status')}
          options={['Single', 'Married', 'Divorced', 'Widowed', 'Separated', 'Civil Partnership']}
        />
        {isNonUK && (
          <TextField
            label="Date of Entry to UK"
            type="date"
            value={data.date_entry_uk}
            onChange={set('date_entry_uk') as (v: string) => void}
            hint="Required for non-UK nationals."
          />
        )}
      </FormSection>

      <FormSection title="Contact & Address" number="2.0">
        <TextareaField
          label="Full Postal Address"
          required
          value={data.address}
          onChange={set('address') as (v: string) => void}
          placeholder="House number, street, city, postcode"
          rows={3}
          colSpan2
          error={errors.address}
        />
        <TextField
          label="Room Number"
          required
          value={data.room_number}
          onChange={set('room_number') as (v: string) => void}
          placeholder="Room 4B"
          error={errors.room_number}
        />
        <TextField
          label="Move-In Date"
          required
          type="date"
          value={data.moved_in}
          onChange={set('moved_in') as (v: string) => void}
          error={errors.moved_in}
        />
        <PhoneField
          label="Mobile Number"
          required
          value={data.mobile}
          onChange={set('mobile') as (v: string) => void}
          placeholder="+44 7000 000000"
          error={errors.mobile}
        />
        <TextField
          label="Email Address"
          type="email"
          value={data.email}
          onChange={set('email') as (v: string) => void}
          placeholder="example@email.com"
          error={errors.email}
        />
        <TextField
          label="Languages Spoken"
          value={data.languages}
          onChange={set('languages') as (v: string) => void}
          placeholder="e.g. English, Urdu, Arabic"
          hint="Comma-separated."
        />
      </FormSection>

      <FormSection title="Benefits" number="3.0">
        <SelectField
          label="Benefit Type"
          required
          value={data.benefit_type}
          onChange={set('benefit_type')}
          options={['Universal Credit', 'Housing Benefit', 'PIP', 'ESA', 'JSA', 'None', 'Other']}
          error={errors.benefit_type}
        />
        <SelectField
          label="Payment Frequency"
          required
          value={data.benefit_freq}
          onChange={set('benefit_freq')}
          options={['Monthly', 'Fortnightly', 'Weekly']}
          error={errors.benefit_freq}
        />
        <TextField
          label="Benefit Amount (£ per period)"
          required
          type="number"
          value={data.benefit_amount}
          onChange={set('benefit_amount') as (v: string) => void}
          placeholder="0.00"
          min="0"
          error={errors.benefit_amount}
        />
      </FormSection>

      <FormSection title="Next of Kin" number="4.0">
        <TextField
          label="Full Name"
          required
          value={data.nok_name}
          onChange={set('nok_name') as (v: string) => void}
          placeholder="Full name"
          error={errors.nok_name}
        />
        <TextField
          label="Relationship"
          required
          value={data.nok_relation}
          onChange={set('nok_relation') as (v: string) => void}
          placeholder="e.g. Brother, Mother"
          error={errors.nok_relation}
        />
        <PhoneField
          label="Phone Number"
          required
          value={data.nok_phone}
          onChange={set('nok_phone') as (v: string) => void}
          placeholder="+44 7000 000000"
          error={errors.nok_phone}
        />
        <TextField
          label="Address"
          value={data.nok_address}
          onChange={set('nok_address') as (v: string) => void}
          placeholder="Full postal address"
        />
      </FormSection>

      <FormSection title="Medical & Legal" number="5.0">
        <TextField
          label="GP Name & Surgery"
          value={data.doctor}
          onChange={set('doctor') as (v: string) => void}
          placeholder="Dr Smith — Digbeth Medical Centre"
          colSpan2
        />
        <div className="col-span-2 space-y-3">
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={data.on_probation}
              onChange={(e) => set('on_probation')(e.target.checked)}
              className="w-4 h-4 accent-navy"
            />
            <span className="text-xs font-semibold text-navy">Tenant is currently on probation</span>
          </label>
          {data.on_probation && (
            <TextField
              label="Probation Officer Name"
              value={data.probation_officer}
              onChange={set('probation_officer') as (v: string) => void}
              placeholder="Officer name and contact number"
            />
          )}
        </div>
      </FormSection>

      {!readOnly && (
        <FormActions
          onSaveDraft={onSaveDraft ? () => onSaveDraft(data) : undefined}
          onSubmit={handleSubmit}
          submitLabel="Save & Stamp Record"
          submitting={submitting}
        />
      )}
    </div>
  );
}
