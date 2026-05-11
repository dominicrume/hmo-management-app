'use client';

// Form 01 — Intake Checklist
// Source: Ash Shahada Housing Association, Page 1 of 53
// Step 1 — tick on arrival. All 7 items must be reviewed before tenant is admitted.

import { useState } from 'react';
import { CheckboxField, FormSection, FormActions } from './FormField';
import { ClipboardCheck } from 'lucide-react';

interface ChecklistItem {
  id: string;
  label: string;
  description: string;
  required: boolean;
}

const CHECKLIST_ITEMS: ChecklistItem[] = [
  {
    id: 'housing_benefit',
    label: 'Housing Benefit Claim',
    description: 'Tenant has an active HB/UC claim or application in progress.',
    required: true,
  },
  {
    id: 'personal_details',
    label: 'Personal Details Form',
    description: 'Form 3 completed — name, DOB, NINO, address, contact details.',
    required: true,
  },
  {
    id: 'missing_person',
    label: 'Missing Person Form',
    description: 'Form 4 completed — physical descriptors and next of kin recorded.',
    required: true,
  },
  {
    id: 'initial_assessment',
    label: 'Initial Assessment',
    description: 'Form 8 completed — goals, needs, actions, assigned worker.',
    required: true,
  },
  {
    id: 'service_charge',
    label: 'Service Charge Agreement',
    description: 'Form 6 signed — weekly rate agreed and payment method confirmed.',
    required: true,
  },
  {
    id: 'confidentiality_form',
    label: 'Confidentiality Form',
    description: 'Form 5 signed by resident and Ahsan Rehman.',
    required: true,
  },
  {
    id: 'risk_assessment',
    label: 'Risk Assessment / Support Plan',
    description: 'Form 7 completed — risk categories, severity, mitigation actions.',
    required: true,
  },
];

export interface Form01Data {
  items: Record<string, boolean>;
  completedBy: string;
  completedAt: string;
}

interface Props {
  initialData?: Partial<Form01Data>;
  onSubmit: (data: Form01Data) => void;
  onSaveDraft?: (data: Form01Data) => void;
  readOnly?: boolean;
}

function validate(data: Form01Data): Record<string, string> {
  const errors: Record<string, string> = {};
  if (!data.completedBy.trim()) {
    errors.completedBy = 'Staff name is required.';
  }
  const unchecked = CHECKLIST_ITEMS.filter((i) => i.required && !data.items[i.id]);
  if (unchecked.length > 0) {
    errors.items = `${unchecked.length} required item(s) not ticked.`;
  }
  return errors;
}

export default function Form01IntakeChecklist({ initialData, onSubmit, onSaveDraft, readOnly }: Props) {
  const [items, setItems] = useState<Record<string, boolean>>(
    initialData?.items ?? Object.fromEntries(CHECKLIST_ITEMS.map((i) => [i.id, false]))
  );
  const [completedBy, setCompletedBy] = useState(initialData?.completedBy ?? '');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  const buildData = (): Form01Data => ({
    items,
    completedBy,
    completedAt: new Date().toISOString(),
  });

  const handleSubmit = () => {
    const errs = validate(buildData());
    if (Object.keys(errs).length) { setErrors(errs); return; }
    setSubmitting(true);
    onSubmit(buildData());
  };

  const allChecked = CHECKLIST_ITEMS.every((i) => items[i.id]);
  const checkedCount = Object.values(items).filter(Boolean).length;

  return (
    <div>
      {/* Progress indicator */}
      <div className="flex items-center justify-between mb-6 pb-4 border-b border-slate-100">
        <div className="flex items-center gap-2">
          <ClipboardCheck className="w-4 h-4 text-navy" />
          <span className="text-xs font-bold text-navy">Admission Checklist</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="h-1.5 w-32 bg-slate-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-amber rounded-full transition-all"
              style={{ width: `${(checkedCount / CHECKLIST_ITEMS.length) * 100}%` }}
            />
          </div>
          <span className="text-xxs font-semibold text-slate-400">
            {checkedCount}/{CHECKLIST_ITEMS.length}
          </span>
        </div>
      </div>

      {errors.items && (
        <div className="mb-4 px-3 py-2 bg-red-50 border border-red-200 rounded-lg text-xs text-red-600 font-semibold">
          {errors.items}
        </div>
      )}

      <FormSection title="Admission Items" number="1.0">
        {CHECKLIST_ITEMS.map((item) => (
          <CheckboxField
            key={item.id}
            label={item.label}
            description={item.description}
            checked={items[item.id]}
            onChange={(v) => setItems((prev) => ({ ...prev, [item.id]: v }))}
            colSpan2
          />
        ))}
      </FormSection>

      <FormSection title="Sign-Off" number="2.0">
        <div className="col-span-2 space-y-1">
          <label className="text-xxs font-black text-slate-400 uppercase tracking-wider">
            Completed By (Staff Name) <span className="text-red-400">*</span>
          </label>
          <input
            type="text"
            value={completedBy}
            onChange={(e) => setCompletedBy(e.target.value)}
            placeholder="Full name of staff member"
            readOnly={readOnly}
            className={`w-full border-b py-1.5 text-sm bg-transparent focus:outline-none transition-colors
              ${errors.completedBy ? 'border-red-400 text-red-700' : 'border-field-line text-navy focus:border-navy'}`}
          />
          {errors.completedBy && (
            <p className="text-xxs text-red-500 font-semibold">{errors.completedBy}</p>
          )}
        </div>

        {allChecked && (
          <div className="col-span-2 flex items-center gap-2 px-3 py-2 bg-emerald-50 border border-emerald-200 rounded-lg">
            <ClipboardCheck className="w-3.5 h-3.5 text-emerald-600" />
            <span className="text-xs font-semibold text-emerald-700">
              All items confirmed — ready to proceed to intake.
            </span>
          </div>
        )}
      </FormSection>

      {!readOnly && (
        <FormActions
          onSaveDraft={onSaveDraft ? () => onSaveDraft(buildData()) : undefined}
          onSubmit={handleSubmit}
          submitLabel="Confirm Checklist"
          submitting={submitting}
        />
      )}
    </div>
  );
}
