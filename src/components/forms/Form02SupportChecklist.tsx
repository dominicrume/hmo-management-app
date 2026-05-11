'use client';

// Form 02 — Support Checklist
// Source: Ash Shahada Housing Association, Page 2 of 53
// Three-phase workflow: On Arrival / Within 3 Days / After 3 Days
// All interactions must be recorded (legal safeguarding obligation — URD §4.5)

import { useState } from 'react';
import { CheckboxField, TextareaField, FormSection, FormActions } from './FormField';

const ON_ARRIVAL: { id: string; label: string }[] = [
  { id: 'room_shown',          label: 'Room shown to tenant and key given' },
  { id: 'house_rules',         label: 'House rules explained verbally' },
  { id: 'emergency_contacts',  label: 'Emergency contact numbers provided' },
  { id: 'fire_safety',         label: 'Fire safety and evacuation route explained' },
  { id: 'wifi_facilities',     label: 'WiFi, kitchen, and shared facilities explained' },
  { id: 'benefits_status',     label: 'Benefits status checked — claim active or initiated' },
  { id: 'initial_risk_check',  label: 'Initial risk check completed verbally' },
];

const WITHIN_3_DAYS: { id: string; label: string }[] = [
  { id: 'personal_form',       label: 'Personal Details Form (Form 3) completed' },
  { id: 'missing_person_form', label: 'Missing Person Form (Form 4) completed' },
  { id: 'confidentiality',     label: 'Confidentiality Waiver (Form 5) signed' },
  { id: 'service_charge_agree',label: 'Service Charge Agreement (Form 6) signed' },
  { id: 'gp_registered',       label: 'GP registration checked or initiated' },
  { id: 'bank_account',        label: 'Bank account status checked' },
  { id: 'id_documents',        label: 'ID documents viewed and recorded' },
];

const AFTER_3_DAYS: { id: string; label: string }[] = [
  { id: 'risk_assessment',     label: 'Full Risk Assessment (Form 7) completed' },
  { id: 'support_plan',        label: 'Initial Support Plan (Form 8) drafted' },
  { id: 'key_worker_assigned', label: 'Key worker assigned and introduced' },
  { id: 'first_session',       label: 'First formal support session recorded' },
  { id: 'council_notified',    label: 'Birmingham City Council notified (if required)' },
  { id: 'benefit_claim_check', label: 'Benefit claim progressed and reference number recorded' },
];

export interface Form02Data {
  onArrival:    Record<string, boolean>;
  within3Days:  Record<string, boolean>;
  after3Days:   Record<string, boolean>;
  workerNotes:  string;
  workerName:   string;
  completedAt:  string;
}

const initChecks = (items: { id: string }[]) =>
  Object.fromEntries(items.map((i) => [i.id, false]));

function validate(data: Form02Data): Record<string, string> {
  const errors: Record<string, string> = {};
  if (!data.workerName.trim()) errors.workerName = 'Worker name is required.';
  return errors;
}

interface Props {
  initialData?: Partial<Form02Data>;
  onSubmit: (data: Form02Data) => void;
  onSaveDraft?: (data: Form02Data) => void;
  readOnly?: boolean;
}

function CheckGroup({
  title,
  items,
  values,
  onChange,
}: {
  title: string;
  items: { id: string; label: string }[];
  values: Record<string, boolean>;
  onChange: (id: string, v: boolean) => void;
}) {
  const done = items.filter((i) => values[i.id]).length;
  return (
    <div className="col-span-2">
      <div className="flex items-center justify-between mb-3">
        <p className="text-xxs font-black text-slate-500 uppercase tracking-wider">{title}</p>
        <span className="text-xxs font-semibold text-slate-400">{done}/{items.length}</span>
      </div>
      <div className="space-y-2">
        {items.map((item) => (
          <CheckboxField
            key={item.id}
            label={item.label}
            checked={values[item.id]}
            onChange={(v) => onChange(item.id, v)}
          />
        ))}
      </div>
    </div>
  );
}

export default function Form02SupportChecklist({ initialData, onSubmit, onSaveDraft, readOnly }: Props) {
  const [onArrival,   setOnArrival]   = useState(initialData?.onArrival   ?? initChecks(ON_ARRIVAL));
  const [within3Days, setWithin3Days] = useState(initialData?.within3Days ?? initChecks(WITHIN_3_DAYS));
  const [after3Days,  setAfter3Days]  = useState(initialData?.after3Days  ?? initChecks(AFTER_3_DAYS));
  const [workerNotes, setWorkerNotes] = useState(initialData?.workerNotes ?? '');
  const [workerName,  setWorkerName]  = useState(initialData?.workerName  ?? '');
  const [errors,      setErrors]      = useState<Record<string, string>>({});

  const buildData = (): Form02Data => ({
    onArrival, within3Days, after3Days,
    workerNotes, workerName,
    completedAt: new Date().toISOString(),
  });

  const handleSubmit = () => {
    const errs = validate(buildData());
    if (Object.keys(errs).length) { setErrors(errs); return; }
    onSubmit(buildData());
  };

  const set = (setter: React.Dispatch<React.SetStateAction<Record<string, boolean>>>) =>
    (id: string, v: boolean) => setter((prev) => ({ ...prev, [id]: v }));

  return (
    <div>
      <FormSection title="On Arrival" number="1.0">
        <CheckGroup
          title="Complete on the day of arrival"
          items={ON_ARRIVAL}
          values={onArrival}
          onChange={set(setOnArrival)}
        />
      </FormSection>

      <FormSection title="Within 3 Days" number="2.0">
        <CheckGroup
          title="Complete within 72 hours of move-in"
          items={WITHIN_3_DAYS}
          values={within3Days}
          onChange={set(setWithin3Days)}
        />
      </FormSection>

      <FormSection title="After 3 Days" number="3.0">
        <CheckGroup
          title="Complete within the first week"
          items={AFTER_3_DAYS}
          values={after3Days}
          onChange={set(setAfter3Days)}
        />
      </FormSection>

      <FormSection title="Worker Notes & Sign-Off" number="4.0">
        <TextareaField
          label="Worker Notes"
          value={workerNotes}
          onChange={setWorkerNotes}
          placeholder="Record any concerns, observations, or actions from this checklist review…"
          rows={4}
          colSpan2
        />
        <div className="col-span-2 space-y-1">
          <label className="text-xxs font-black text-slate-400 uppercase tracking-wider">
            Key Worker Name <span className="text-red-400">*</span>
          </label>
          <input
            type="text"
            value={workerName}
            onChange={(e) => setWorkerName(e.target.value)}
            placeholder="Full name"
            readOnly={readOnly}
            className={`w-full border-b py-1.5 text-sm bg-transparent focus:outline-none
              ${errors.workerName ? 'border-red-400 text-red-700' : 'border-field-line text-navy focus:border-navy'}`}
          />
          {errors.workerName && <p className="text-xxs text-red-500 font-semibold">{errors.workerName}</p>}
        </div>
      </FormSection>

      {!readOnly && (
        <FormActions
          onSaveDraft={onSaveDraft ? () => onSaveDraft(buildData()) : undefined}
          onSubmit={handleSubmit}
          submitLabel="Save Checklist"
        />
      )}
    </div>
  );
}
