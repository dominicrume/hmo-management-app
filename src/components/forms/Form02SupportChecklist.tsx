'use client';

// Form 02 — Support Checklist
// Source: Ash Shahada Housing Association, Page 2 of 53
// Three-phase workflow: On Arrival / Within 3 Days / After 3 Days
// All interactions must be recorded (legal safeguarding obligation — URD §4.5)

import { useState } from 'react';
import { CheckboxField, TextareaField, FormSection, FormActions } from './FormField';

// Exact items from the Ash Shahada Support Checklist operational document
const ON_ARRIVAL: { id: string; label: string }[] = [
  { id: 'hb_form_completed',   label: 'Housing Benefit Application completed online (or Change of Circumstance if previously claiming HB)' },
  { id: 'hb_reference_noted',  label: 'HB reference number noted and recorded on property database (shared Gmail Drive)' },
  { id: 'personal_details',    label: 'Personal Details Form completed with resident' },
  { id: 'missing_person_form', label: 'Missing Person Form completed with resident' },
  { id: 'support_agreement',   label: 'Support Agreement explained to resident and signed' },
  { id: 'initial_assessment',  label: 'Initial Assessment / Needs Assessment completed with service user' },
  { id: 'service_charge_letter', label: 'Service Charge letter completed and given to resident' },
  { id: 'confidentiality_form', label: 'Confidentiality Form signed by resident' },
  { id: 'daily_case_note',     label: 'Daily case note completed recording all information discussed on this visit' },
  { id: 'next_appointment',    label: 'Next appointment booked for the following week' },
];

const WITHIN_3_DAYS: { id: string; label: string }[] = [
  { id: 'risk_assessment_completed', label: 'Risk Assessment completed by support worker (internal document — not shared with resident)' },
  { id: 'risk_assessment_emailed',   label: 'Risk Assessment emailed to senior for approval' },
];

const AFTER_3_DAYS: { id: string; label: string }[] = [
  { id: 'support_plan_drafted',  label: 'Support Plan completed using referral and Initial/Needs Assessment' },
  { id: 'appointment_made',      label: 'Appointment made within 1 week for resident to review and sign Support Plan' },
  { id: 'resident_signed_plan',  label: 'Resident signed Support Plan confirming they are happy with the goals set' },
  { id: 'quarterly_review_set',  label: 'Quarterly review date set (reviewed immediately if outstanding issues arise)' },
  { id: 'ongoing_recording',     label: 'Confirmed: all ongoing interactions will be recorded on daily case notes or Key Work Session Notes' },
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
          title="Complete on the day of arrival — Housing Benefit application first, then all sign-up pack paperwork"
          items={ON_ARRIVAL}
          values={onArrival}
          onChange={set(setOnArrival)}
        />
      </FormSection>

      <FormSection title="Within 3 Days" number="2.0">
        <CheckGroup
          title="Support worker responsible — Risk Assessment is an internal document, not shared with the resident"
          items={WITHIN_3_DAYS}
          values={within3Days}
          onChange={set(setWithin3Days)}
        />
      </FormSection>

      <FormSection title="After 3 Days" number="3.0">
        <CheckGroup
          title="Support Plan drafted and appointment made within 1 week for resident to sign — all interactions must be recorded"
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
