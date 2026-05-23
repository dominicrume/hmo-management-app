'use client';

// Form 08 — Initial Support Plan
// Source: Ash Shahada Housing Association, Page 8 of 53
// Steps 3–5. Council-format header. Goals, needs, actions, assigned worker, review date.
// This document is submitted to Birmingham City Council as part of monthly reporting.

import { useState } from 'react';
import { TextField, TextareaField, SelectField, FormSection, FormActions } from './FormField';
import { Plus, Trash2, Target } from 'lucide-react';

// ── Types ─────────────────────────────────────────────────────────────────────

interface Goal {
  id:          string;
  goal:        string;
  need:        string;
  action:      string;
  responsibility: string;
  target_date: string;
  status:      string;
}

export interface Form08Data {
  // Council header
  tenant_name:       string;
  dob:               string;
  nino:              string;
  room_number:       string;
  brand:             string;
  plan_start_date:   string;
  plan_review_date:  string;
  // Goals
  goals:             Goal[];
  // Narrative sections (council format)
  presenting_needs:  string;
  strengths:         string;
  barriers:          string;
  outcome_vision:    string;
  // Worker details
  assigned_worker:   string;
  worker_role:       string;
  created_at:        string;
  // Manager sign-off
  manager_name:      string;
  manager_approved_at: string;
}

const EMPTY_GOAL = (): Goal => ({
  id:             Math.random().toString(36).slice(2),
  goal:           '',
  need:           '',
  action:         '',
  responsibility: '',
  target_date:    '',
  status:         'Active',
});

const EMPTY: Form08Data = {
  tenant_name: '', dob: '', nino: '', room_number: '', brand: 'mattys_place',
  plan_start_date: '', plan_review_date: '', goals: [EMPTY_GOAL()],
  presenting_needs: '', strengths: '', barriers: '', outcome_vision: '',
  assigned_worker: '', worker_role: '', created_at: '', manager_name: '',
  manager_approved_at: '',
};

function validate(d: Form08Data): Record<string, string> {
  const e: Record<string, string> = {};
  if (!d.tenant_name.trim())    e.tenant_name    = 'Tenant name is required.';
  if (!d.plan_start_date)       e.plan_start_date = 'Start date is required.';
  if (!d.plan_review_date)      e.plan_review_date = 'Review date is required.';
  if (!d.presenting_needs.trim()) e.presenting_needs = 'Presenting needs are required.';
  if (!d.assigned_worker.trim()) e.assigned_worker = 'Assigned worker is required.';
  if (d.goals.length === 0)     e.goals          = 'At least one goal is required.';
  const incompleteGoal = d.goals.find((g) => !g.goal.trim() || !g.action.trim());
  if (incompleteGoal)           e.goals          = 'All goals must have a goal and action.';
  return e;
}

interface Props {
  isSaving?: boolean;
  initialData?: Partial<Form08Data>;
  tenantName?: string;
  dob?: string;
  nino?: string;
  onSubmit: (data: Form08Data) => void;
  onSaveDraft?: (data: Form08Data) => void;
  readOnly?: boolean;
}

export default function Form08SupportPlan({
  isSaving, initialData, tenantName, dob, nino, onSubmit, onSaveDraft, readOnly,
}: Props) {
  const [data, setData] = useState<Form08Data>({
    ...EMPTY,
    ...initialData,
    tenant_name: tenantName ?? initialData?.tenant_name ?? '',
    dob:         dob        ?? initialData?.dob         ?? '',
    nino:        nino       ?? initialData?.nino        ?? '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const set = (field: keyof Form08Data) => (v: string) =>
    setData((prev) => ({ ...prev, [field]: v }));

  const addGoal = () =>
    setData((prev) => ({ ...prev, goals: [...prev.goals, EMPTY_GOAL()] }));

  const removeGoal = (id: string) =>
    setData((prev) => ({ ...prev, goals: prev.goals.filter((g) => g.id !== id) }));

  const setGoal = (id: string, field: keyof Goal, value: string) =>
    setData((prev) => ({
      ...prev,
      goals: prev.goals.map((g) => g.id === id ? { ...g, [field]: value } : g),
    }));

  const handleSubmit = () => {
    const errs = validate(data);
    if (Object.keys(errs).length) { setErrors(errs); return; }
    onSubmit({ ...data, created_at: new Date().toISOString() });
  };

  return (
    <div>
      {/* Council format header notice */}
      <div className="mb-6 px-4 py-3 bg-navy/5 border border-navy/10 rounded-lg">
        <p className="text-xxs font-black text-navy uppercase tracking-widest mb-1">Council Format</p>
        <p className="text-xxs text-slate-500">
          This document meets Birmingham City Council&apos;s monthly support plan submission format.
          Complete all sections before export.
        </p>
      </div>

      <FormSection title="Plan Header — Council Reference" number="1.0">
        <TextField label="Tenant Full Name" required value={data.tenant_name}
          onChange={set('tenant_name')} placeholder="As per Form 3" error={errors.tenant_name} />
        <TextField label="Date of Birth" type="date" value={data.dob} onChange={set('dob')} />
        <TextField label="NINO" value={data.nino} onChange={set('nino')}
          placeholder="AB 12 34 56 C" mono />
        <TextField label="Room Number" value={data.room_number}
          onChange={set('room_number')} placeholder="Room 4B" />
        <SelectField label="Brand / Property" value={data.brand} onChange={set('brand')}
          options={["Matty's Place", 'Ash Shahada Housing Association', 'Reliance Housing']} />
        <div />
        <TextField label="Plan Start Date" required type="date" value={data.plan_start_date}
          onChange={set('plan_start_date')} error={errors.plan_start_date} />
        <TextField label="Review Date" required type="date" value={data.plan_review_date}
          onChange={set('plan_review_date')} error={errors.plan_review_date} />
      </FormSection>

      <FormSection title="Presenting Needs & Context" number="2.0">
        <TextareaField
          label="Presenting Needs"
          required
          value={data.presenting_needs}
          onChange={set('presenting_needs')}
          placeholder="Describe the tenant's primary needs at the time of assessment. Include housing, financial, health, and social needs."
          rows={4}
          colSpan2
          error={errors.presenting_needs}
        />
        <TextareaField
          label="Strengths & Protective Factors"
          value={data.strengths}
          onChange={set('strengths')}
          placeholder="Identify the tenant's strengths, skills, support network, and any protective factors…"
          rows={3}
          colSpan2
        />
        <TextareaField
          label="Barriers to Progress"
          value={data.barriers}
          onChange={set('barriers')}
          placeholder="Identify factors that may hinder progress towards goals…"
          rows={3}
          colSpan2
        />
        <TextareaField
          label="Desired Outcome (Tenant's Vision)"
          value={data.outcome_vision}
          onChange={set('outcome_vision')}
          placeholder="In the tenant's own words — what does a good outcome look like for them?"
          rows={3}
          colSpan2
        />
      </FormSection>

      {/* Goals section */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-xxs font-black text-navy uppercase tracking-widest flex items-center gap-2">
            <span className="w-1 h-3.5 bg-amber rounded-full inline-block flex-shrink-0" />
            Section 3.0 — Goals, Needs & Actions
          </h3>
          {!readOnly && (
            <button
              type="button"
              onClick={addGoal}
              className="flex items-center gap-1.5 text-xxs font-bold text-navy border border-navy/20
                         px-2.5 py-1.5 rounded-lg hover:bg-navy/5 transition-colors"
            >
              <Plus className="w-3 h-3" />
              Add Goal
            </button>
          )}
        </div>

        {errors.goals && (
          <div className="mb-3 px-3 py-2 bg-red-50 border border-red-200 rounded-lg text-xs text-red-600 font-semibold">
            {errors.goals}
          </div>
        )}

        <div className="space-y-4">
          {data.goals.map((goal, idx) => (
            <div key={goal.id} className="border border-slate-200 rounded-xl p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Target className="w-3.5 h-3.5 text-amber-dark" />
                  <span className="text-xxs font-black text-navy uppercase tracking-wider">
                    Goal {idx + 1}
                  </span>
                </div>
                {!readOnly && data.goals.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeGoal(goal.id)}
                    className="text-slate-300 hover:text-red-400 transition-colors"
                    aria-label="Remove goal"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="col-span-2 space-y-1">
                  <label className="text-xxs font-black text-slate-400 uppercase tracking-wider">Goal <span className="text-red-400">*</span></label>
                  <input type="text" value={goal.goal}
                    onChange={(e) => setGoal(goal.id, 'goal', e.target.value)}
                    placeholder="e.g. Maintain tenancy and develop independent living skills"
                    className="w-full border-b border-field-line py-1.5 text-sm text-navy bg-transparent focus:outline-none focus:border-navy" />
                </div>
                <div className="col-span-2 space-y-1">
                  <label className="text-xxs font-black text-slate-400 uppercase tracking-wider">Identified Need</label>
                  <input type="text" value={goal.need}
                    onChange={(e) => setGoal(goal.id, 'need', e.target.value)}
                    placeholder="e.g. Tenant has no previous independent tenancy experience"
                    className="w-full border-b border-field-line py-1.5 text-sm text-navy bg-transparent focus:outline-none focus:border-navy" />
                </div>
                <div className="col-span-2 space-y-1">
                  <label className="text-xxs font-black text-slate-400 uppercase tracking-wider">Action <span className="text-red-400">*</span></label>
                  <input type="text" value={goal.action}
                    onChange={(e) => setGoal(goal.id, 'action', e.target.value)}
                    placeholder="e.g. Weekly life-skills sessions with key worker. Budget planning by Week 4."
                    className="w-full border-b border-field-line py-1.5 text-sm text-navy bg-transparent focus:outline-none focus:border-navy" />
                </div>
                <div className="space-y-1">
                  <label className="text-xxs font-black text-slate-400 uppercase tracking-wider">Responsibility</label>
                  <input type="text" value={goal.responsibility}
                    onChange={(e) => setGoal(goal.id, 'responsibility', e.target.value)}
                    placeholder="e.g. Key worker + tenant"
                    className="w-full border-b border-field-line py-1.5 text-sm text-navy bg-transparent focus:outline-none focus:border-navy" />
                </div>
                <div className="space-y-1">
                  <label className="text-xxs font-black text-slate-400 uppercase tracking-wider">Target Date</label>
                  <input type="date" value={goal.target_date}
                    onChange={(e) => setGoal(goal.id, 'target_date', e.target.value)}
                    className="w-full border-b border-field-line py-1.5 text-sm text-navy bg-transparent focus:outline-none focus:border-navy" />
                </div>
                <div className="space-y-1">
                  <label className="text-xxs font-black text-slate-400 uppercase tracking-wider">Status</label>
                  <select value={goal.status}
                    onChange={(e) => setGoal(goal.id, 'status', e.target.value)}
                    className="w-full border-b border-field-line py-1.5 text-sm text-navy bg-transparent focus:outline-none focus:border-navy">
                    {['Active', 'In Progress', 'Achieved', 'On Hold', 'Discontinued'].map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <FormSection title="Assigned Worker & Sign-Off" number="4.0">
        <TextField label="Assigned Key Worker" required value={data.assigned_worker}
          onChange={set('assigned_worker')} placeholder="Full name" error={errors.assigned_worker} />
        <TextField label="Role / Title" value={data.worker_role}
          onChange={set('worker_role')} placeholder="e.g. Housing Support Officer" />
        <TextField label="Manager Approval" value={data.manager_name}
          onChange={set('manager_name')} placeholder="General Matlub / Ahsan Rehman" />
      </FormSection>

      {!readOnly && (
        <FormActions
          submitting={isSaving}
          onSaveDraft={onSaveDraft ? () => onSaveDraft(data) : undefined}
          onSubmit={handleSubmit}
          submitLabel="Save Support Plan"
        />
      )}
    </div>
  );
}
