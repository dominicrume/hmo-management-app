'use client';

// Form 04 — Missing Person Form
// Source: Ash Shahada Housing Association, Page 4 of 53
// Steps 1–3. Completed on admission to create a record that can be activated
// immediately if tenant goes missing. Police protocol documentation.

import { useState } from 'react';
import { TextField, TextareaField, SelectField, PhoneField, FormSection, FormActions } from './FormField';
import { AlertTriangle } from 'lucide-react';

export interface Form04Data {
  // Physical descriptors
  height:                 string;
  build:                  string;
  hair_colour:            string;
  hair_style:             string;
  eye_colour:             string;
  skin_tone:              string;
  distinguishing_features: string;
  // Personal
  place_of_birth:         string;
  marital_status:         string;
  nationality:            string;
  // Employment / education
  employer_or_college:    string;
  employer_address:       string;
  // Vehicle
  vehicle_registration:   string;
  vehicle_make_model:     string;
  vehicle_colour:         string;
  // Benefits
  benefit_type:           string;
  // Next of Kin (may differ from Form 3)
  nok_name:               string;
  nok_relation:           string;
  nok_phone:              string;
  nok_address:            string;
  // Authority sign-off
  authorising_officer:    string;
  authorising_role:       string;
  date_completed:         string;
  additional_notes:       string;
}

const EMPTY: Form04Data = {
  height: '', build: '', hair_colour: '', hair_style: '', eye_colour: '',
  skin_tone: '', distinguishing_features: '', place_of_birth: '',
  marital_status: '', nationality: '', employer_or_college: '',
  employer_address: '', vehicle_registration: '', vehicle_make_model: '',
  vehicle_colour: '', benefit_type: '', nok_name: '', nok_relation: '',
  nok_phone: '', nok_address: '', authorising_officer: '',
  authorising_role: '', date_completed: '', additional_notes: '',
};

function validate(d: Form04Data): Record<string, string> {
  const e: Record<string, string> = {};
  if (!d.height.trim())              e.height              = 'Height is required.';
  if (!d.build.trim())               e.build               = 'Build is required.';
  if (!d.hair_colour.trim())         e.hair_colour         = 'Hair colour is required.';
  if (!d.eye_colour.trim())          e.eye_colour          = 'Eye colour is required.';
  if (!d.place_of_birth.trim())      e.place_of_birth      = 'Place of birth is required.';
  if (!d.nok_name.trim())            e.nok_name            = 'Next of kin name is required.';
  if (!d.authorising_officer.trim()) e.authorising_officer = 'Authorising officer is required.';
  if (!d.date_completed)             e.date_completed      = 'Date is required.';
  return e;
}

interface Props {
  initialData?: Partial<Form04Data>;
  ocrData?: Partial<Form04Data>;
  onSubmit: (data: Form04Data) => void;
  onSaveDraft?: (data: Form04Data) => void;
  readOnly?: boolean;
}

export default function Form04MissingPerson({ initialData, ocrData, onSubmit, onSaveDraft, readOnly }: Props) {
  const [data, setData]     = useState<Form04Data>({ ...EMPTY, ...initialData, ...ocrData });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const set = (field: keyof Form04Data) => (v: string) =>
    setData((prev) => ({ ...prev, [field]: v }));

  const handleSubmit = () => {
    const errs = validate(data);
    if (Object.keys(errs).length) { setErrors(errs); return; }
    onSubmit(data);
  };

  return (
    <div>
      <div className="mb-6 flex items-start gap-3 px-4 py-3 bg-amber/10 border border-amber/30 rounded-lg">
        <AlertTriangle className="w-4 h-4 text-amber-dark flex-shrink-0 mt-0.5" />
        <p className="text-xs text-amber-dark font-semibold">
          This form is completed at admission and held on file. It is activated only if the
          tenant is reported missing. All fields must be as accurate as possible.
        </p>
      </div>

      <FormSection title="Physical Description" number="1.0">
        <TextField label="Height" required value={data.height}
          onChange={set('height')} placeholder="e.g. 5ft 10in / 178cm" error={errors.height} />
        <SelectField label="Build" required value={data.build}
          onChange={set('build')} options={['Slim', 'Medium', 'Stocky', 'Heavy', 'Athletic']}
          error={errors.build} />
        <TextField label="Hair Colour" required value={data.hair_colour}
          onChange={set('hair_colour')} placeholder="e.g. Black, Brown, Grey" error={errors.hair_colour} />
        <TextField label="Hair Style" value={data.hair_style}
          onChange={set('hair_style')} placeholder="e.g. Short, Afro, Braided, Bald" />
        <TextField label="Eye Colour" required value={data.eye_colour}
          onChange={set('eye_colour')} placeholder="e.g. Brown, Blue, Hazel" error={errors.eye_colour} />
        <SelectField label="Skin Tone" value={data.skin_tone}
          onChange={set('skin_tone')}
          options={['Very light', 'Light', 'Medium', 'Medium-dark', 'Dark', 'Very dark']} />
        <TextareaField
          label="Distinguishing Features"
          value={data.distinguishing_features}
          onChange={set('distinguishing_features')}
          placeholder="Tattoos, scars, birthmarks, piercings, glasses, prosthetics…"
          colSpan2
        />
      </FormSection>

      <FormSection title="Personal Background" number="2.0">
        <TextField label="Place of Birth" required value={data.place_of_birth}
          onChange={set('place_of_birth')} placeholder="City / Country" error={errors.place_of_birth} />
        <SelectField label="Marital Status" value={data.marital_status}
          onChange={set('marital_status')}
          options={['Single', 'Married', 'Divorced', 'Widowed', 'Separated', 'Civil Partnership']} />
        <TextField label="Nationality" value={data.nationality}
          onChange={set('nationality')} placeholder="e.g. British, Somali" />
        <SelectField label="Benefit Type" value={data.benefit_type}
          onChange={set('benefit_type')}
          options={['Universal Credit', 'Housing Benefit', 'PIP', 'ESA', 'JSA', 'None']} />
      </FormSection>

      <FormSection title="Employment / Education" number="3.0">
        <TextField label="Employer or College" value={data.employer_or_college}
          onChange={set('employer_or_college')} placeholder="Name of employer or college" />
        <TextField label="Employer / College Address" value={data.employer_address}
          onChange={set('employer_address')} placeholder="Full address" />
      </FormSection>

      <FormSection title="Vehicle Details" number="4.0">
        <TextField label="Vehicle Registration" value={data.vehicle_registration}
          onChange={(v) => set('vehicle_registration')(v.toUpperCase())}
          placeholder="AB12 CDE" mono />
        <TextField label="Make & Model" value={data.vehicle_make_model}
          onChange={set('vehicle_make_model')} placeholder="e.g. Ford Focus" />
        <TextField label="Colour" value={data.vehicle_colour}
          onChange={set('vehicle_colour')} placeholder="e.g. Black" />
      </FormSection>

      <FormSection title="Next of Kin" number="5.0">
        <TextField label="Full Name" required value={data.nok_name}
          onChange={set('nok_name')} placeholder="Full name" error={errors.nok_name} />
        <TextField label="Relationship" value={data.nok_relation}
          onChange={set('nok_relation')} placeholder="e.g. Mother, Brother" />
        <PhoneField label="Phone Number" value={data.nok_phone}
          onChange={set('nok_phone')} placeholder="+44 7000 000000" />
        <TextField label="Address" value={data.nok_address}
          onChange={set('nok_address')} placeholder="Full postal address" />
      </FormSection>

      <FormSection title="Authority Sign-Off" number="6.0">
        <TextField label="Authorising Officer" required value={data.authorising_officer}
          onChange={set('authorising_officer')} placeholder="Full name"
          error={errors.authorising_officer} />
        <TextField label="Role / Title" required value={data.authorising_role}
          onChange={set('authorising_role')} placeholder="e.g. Housing Manager" />
        <TextField label="Date Completed" required type="date" value={data.date_completed}
          onChange={set('date_completed')} error={errors.date_completed} />
        <TextareaField label="Additional Notes" value={data.additional_notes}
          onChange={set('additional_notes')}
          placeholder="Any additional information relevant to locating this person…"
          colSpan2 />
      </FormSection>

      {!readOnly && (
        <FormActions
          onSaveDraft={onSaveDraft ? () => onSaveDraft(data) : undefined}
          onSubmit={handleSubmit}
          submitLabel="Save Missing Person Record"
        />
      )}
    </div>
  );
}
