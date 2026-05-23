'use client';

// Form 07 — Risk Assessment & Support Plan
// Source: Ash Shahada Housing Association, Page 7 of 53
// Step 3 — staff completes. Risk categories, severity, mitigation, sign-off.

import { useState } from 'react';
import { TextField, TextareaField, SelectField, CheckboxField, FormSection, FormActions } from './FormField';
import { ShieldAlert } from 'lucide-react';

const RISK_CATEGORIES = [
  { id: 'self_harm',            label: 'Self-Harm / Suicide Risk' },
  { id: 'substance_misuse',     label: 'Substance Misuse (alcohol / drugs)' },
  { id: 'mental_health',        label: 'Mental Health' },
  { id: 'domestic_abuse',       label: 'Domestic Abuse (as victim or perpetrator)' },
  { id: 'offending_history',    label: 'Offending History' },
  { id: 'vulnerability',        label: 'General Vulnerability / Exploitation Risk' },
  { id: 'physical_health',      label: 'Physical Health Conditions' },
  { id: 'financial',            label: 'Financial Hardship / Debt' },
  { id: 'social_isolation',     label: 'Social Isolation' },
  { id: 'other',                label: 'Other (specify in notes)' },
] as const;

type RiskCategoryId = typeof RISK_CATEGORIES[number]['id'];

interface RiskEntry {
  present:    boolean;
  severity:   string;
  mitigation: string;
}

export interface Form07Data {
  risks:           Record<RiskCategoryId, RiskEntry>;
  overall_severity: string;
  immediate_actions: string;
  safeguarding_referral: boolean;
  safeguarding_agency:   string;
  additional_notes:      string;
  worker_name:           string;
  worker_signed_at:      string;
  review_date:           string;
}

const emptyRisk = (): RiskEntry => ({ present: false, severity: '', mitigation: '' });

const EMPTY_RISKS = Object.fromEntries(
  RISK_CATEGORIES.map((c) => [c.id, emptyRisk()])
) as Record<RiskCategoryId, RiskEntry>;

function validate(d: Form07Data): Record<string, string> {
  const e: Record<string, string> = {};
  if (!d.overall_severity)    e.overall_severity = 'Overall severity is required.';
  if (!d.worker_name.trim())  e.worker_name      = 'Worker name is required.';
  if (!d.review_date)         e.review_date      = 'Review date is required.';
  if (d.safeguarding_referral && !d.safeguarding_agency.trim())
    e.safeguarding_agency = 'Specify the agency for referral.';
  return e;
}

const SEVERITY_COLOURS: Record<string, string> = {
  Low:      'text-emerald-600 bg-emerald-50 border-emerald-200',
  Medium:   'text-amber-700 bg-amber/10 border-amber/30',
  High:     'text-orange-700 bg-orange-50 border-orange-200',
  Critical: 'text-red-700 bg-red-50 border-red-200',
};

interface Props {
  isSaving?: boolean;
  initialData?: Partial<Form07Data>;
  onSubmit: (data: Form07Data) => void;
  onSaveDraft?: (data: Form07Data) => void;
  readOnly?: boolean;
}

export default function Form07RiskAssessment({ isSaving, initialData, onSubmit, onSaveDraft, readOnly }: Props) {
  const [risks, setRisks]             = useState<Record<RiskCategoryId, RiskEntry>>(
    (initialData?.risks as Record<RiskCategoryId, RiskEntry>) ?? { ...EMPTY_RISKS }
  );
  const [overallSeverity, setOverall] = useState(initialData?.overall_severity ?? '');
  const [immediateActions, setActions]= useState(initialData?.immediate_actions ?? '');
  const [safeguardingReferral, setSG] = useState(initialData?.safeguarding_referral ?? false);
  const [safeguardingAgency, setAgency] = useState(initialData?.safeguarding_agency ?? '');
  const [additionalNotes, setNotes]   = useState(initialData?.additional_notes ?? '');
  const [workerName, setWorker]       = useState(initialData?.worker_name ?? '');
  const [reviewDate, setReview]       = useState(initialData?.review_date ?? '');
  const [errors, setErrors]           = useState<Record<string, string>>({});

  const buildData = (): Form07Data => ({
    risks, overall_severity: overallSeverity, immediate_actions: immediateActions,
    safeguarding_referral: safeguardingReferral, safeguarding_agency: safeguardingAgency,
    additional_notes: additionalNotes, worker_name: workerName,
    worker_signed_at: new Date().toISOString(), review_date: reviewDate,
  });

  const handleSubmit = () => {
    const errs = validate(buildData());
    if (Object.keys(errs).length) { setErrors(errs); return; }
    onSubmit(buildData());
  };

  const setRisk = (id: RiskCategoryId, field: keyof RiskEntry, value: string | boolean) =>
    setRisks((prev) => ({ ...prev, [id]: { ...prev[id], [field]: value } }));

  const activeRisks = RISK_CATEGORIES.filter((c) => risks[c.id].present);

  return (
    <div>
      {overallSeverity && (
        <div className={`mb-6 flex items-center gap-3 px-4 py-3 border rounded-lg ${SEVERITY_COLOURS[overallSeverity] ?? ''}`}>
          <ShieldAlert className="w-4 h-4 flex-shrink-0" />
          <span className="text-xs font-bold uppercase tracking-wide">
            Overall Risk: {overallSeverity}
          </span>
        </div>
      )}

      <FormSection title="Risk Category Identification" number="1.0">
        <div className="col-span-2 space-y-3">
          {RISK_CATEGORIES.map((cat) => {
            const entry = risks[cat.id];
            return (
              <div key={cat.id} className={`border rounded-xl p-3 transition-all ${entry.present ? 'border-amber/40 bg-amber/5' : 'border-slate-100'}`}>
                <div className="flex items-center gap-3 mb-2">
                  <input
                    type="checkbox"
                    checked={entry.present}
                    onChange={(e) => setRisk(cat.id, 'present', e.target.checked)}
                    className="w-4 h-4 accent-navy"
                  />
                  <span className={`text-xs font-semibold ${entry.present ? 'text-navy' : 'text-slate-400'}`}>
                    {cat.label}
                  </span>
                </div>
                {entry.present && (
                  <div className="pl-7 grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-xxs font-black text-slate-400 uppercase tracking-wider">Severity</label>
                      <select
                        value={entry.severity}
                        onChange={(e) => setRisk(cat.id, 'severity', e.target.value)}
                        className="w-full border-b border-field-line py-1 text-sm text-navy bg-transparent focus:outline-none focus:border-navy"
                      >
                        <option value="">Select…</option>
                        {['Low', 'Medium', 'High', 'Critical'].map((s) => (
                          <option key={s} value={s}>{s}</option>
                        ))}
                      </select>
                    </div>
                    <div className="space-y-1">
                      <label className="text-xxs font-black text-slate-400 uppercase tracking-wider">Mitigation Action</label>
                      <input
                        type="text"
                        value={entry.mitigation}
                        onChange={(e) => setRisk(cat.id, 'mitigation', e.target.value)}
                        placeholder="Action taken or planned…"
                        className="w-full border-b border-field-line py-1 text-sm text-navy bg-transparent focus:outline-none focus:border-navy"
                      />
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </FormSection>

      <FormSection title="Overall Assessment" number="2.0">
        <SelectField
          label="Overall Risk Severity"
          required
          value={overallSeverity}
          onChange={setOverall}
          options={['Low', 'Medium', 'High', 'Critical']}
          error={errors.overall_severity}
        />
        <div />
        <TextareaField
          label="Immediate Actions Required"
          value={immediateActions}
          onChange={setActions}
          placeholder={activeRisks.length === 0
            ? 'No immediate risks identified — standard monitoring applies.'
            : 'List any actions that must be taken immediately…'}
          rows={4}
          colSpan2
        />
        <TextareaField
          label="Additional Notes"
          value={additionalNotes}
          onChange={setNotes}
          placeholder="Any further context for this assessment…"
          colSpan2
        />
      </FormSection>

      <FormSection title="Safeguarding Referral" number="3.0">
        <CheckboxField
          label="A safeguarding referral is required"
          description="Check if an external referral to Birmingham Children's Services, Adult Social Care, or another agency is required."
          checked={safeguardingReferral}
          onChange={setSG}
          colSpan2
        />
        {safeguardingReferral && (
          <TextField
            label="Referral Agency"
            required
            value={safeguardingAgency}
            onChange={setAgency}
            placeholder="e.g. Birmingham Adult Social Care"
            error={errors.safeguarding_agency}
          />
        )}
      </FormSection>

      <FormSection title="Worker Sign-Off" number="4.0">
        <TextField
          label="Support Worker Name"
          required
          value={workerName}
          onChange={setWorker}
          placeholder="Full name"
          error={errors.worker_name}
        />
        <TextField
          label="Review Date"
          required
          type="date"
          value={reviewDate}
          onChange={setReview}
          hint="Risk assessment must be reviewed at this date."
          error={errors.review_date}
        />
      </FormSection>

      {!readOnly && (
        <FormActions
          submitting={isSaving}
          onSaveDraft={onSaveDraft ? () => onSaveDraft(buildData()) : undefined}
          onSubmit={handleSubmit}
          submitLabel="Complete Risk Assessment"
        />
      )}
    </div>
  );
}
