'use client';

// Form 06 — Service Charge Agreement
// Source: Ash Shahada Housing Association, Page 6 of 53
// Steps 3–4 — financial setup. Weekly rate, payment method, tenant acknowledgement.

import { useState } from 'react';
import { TextField, SelectField, CheckboxField, TextareaField, FormSection, FormActions } from './FormField';
import { Receipt } from 'lucide-react';

export interface Form06Data {
  weekly_rate:              string;
  payment_method:           string;
  start_date:               string;
  includes_utilities:       boolean;
  includes_internet:        boolean;
  includes_laundry:         boolean;
  charge_breakdown:         string;
  arrears_policy_acknowledged: boolean;
  eviction_warning_acknowledged: boolean;
  tenant_acknowledgement:   string;
  tenant_name:              string;
  tenant_signed_at:         string;
  manager_name:             string;
  manager_signed_at:        string;
}

const EMPTY: Form06Data = {
  weekly_rate: '', payment_method: '', start_date: '',
  includes_utilities: false, includes_internet: false, includes_laundry: false,
  charge_breakdown: '', arrears_policy_acknowledged: false,
  eviction_warning_acknowledged: false, tenant_acknowledgement: '',
  tenant_name: '', tenant_signed_at: '', manager_name: '', manager_signed_at: '',
};

function validate(d: Form06Data): Record<string, string> {
  const e: Record<string, string> = {};
  if (!d.weekly_rate || isNaN(Number(d.weekly_rate)) || Number(d.weekly_rate) <= 0)
    e.weekly_rate = 'Enter a valid weekly rate greater than £0.';
  if (!d.payment_method)   e.payment_method   = 'Payment method is required.';
  if (!d.start_date)       e.start_date       = 'Start date is required.';
  if (!d.arrears_policy_acknowledged)
    e.policies = 'Tenant must acknowledge arrears policy.';
  if (!d.eviction_warning_acknowledged)
    e.policies = 'Tenant must acknowledge eviction warning.';
  if (!d.tenant_name.trim())   e.tenant_name   = 'Tenant name is required.';
  if (!d.manager_name.trim())  e.manager_name  = 'Manager name is required.';
  return e;
}

function calcMonthly(weekly: string) {
  const w = parseFloat(weekly);
  if (isNaN(w) || w <= 0) return '—';
  return `£${(w * 52 / 12).toFixed(2)}`;
}

interface Props {
  isSaving?: boolean;
  initialData?: Partial<Form06Data>;
  tenantName?: string;
  onSubmit: (data: Form06Data) => void;
  onSaveDraft?: (data: Form06Data) => void;
  readOnly?: boolean;
}

export default function Form06ServiceCharge({ isSaving, initialData, tenantName, onSubmit, onSaveDraft, readOnly }: Props) {
  const [data, setData]     = useState<Form06Data>({ ...EMPTY, ...initialData, tenant_name: tenantName ?? initialData?.tenant_name ?? '' });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const set = (field: keyof Form06Data) => (v: string | boolean) =>
    setData((prev) => ({ ...prev, [field]: v }));

  const handleSubmit = () => {
    const errs = validate(data);
    if (Object.keys(errs).length) { setErrors(errs); return; }
    onSubmit({
      ...data,
      tenant_signed_at:  new Date().toISOString(),
      manager_signed_at: new Date().toISOString(),
    });
  };

  return (
    <div>
      <FormSection title="Service Charge Details" number="1.0">
        <div className="col-span-2 flex items-start gap-3 px-4 py-3 bg-amber/10 border border-amber/30 rounded-lg mb-2">
          <Receipt className="w-4 h-4 text-amber-dark flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-xs font-bold text-amber-dark">
              Weekly rate: £{data.weekly_rate || '—'} &nbsp;|&nbsp; Monthly equivalent: {calcMonthly(data.weekly_rate)}
            </p>
            <p className="text-xxs text-slate-500 mt-0.5">
              Service charge covers accommodation and the services listed below.
            </p>
          </div>
        </div>

        <TextField
          label="Weekly Rate (£)"
          required
          type="number"
          value={data.weekly_rate}
          onChange={set('weekly_rate') as (v: string) => void}
          placeholder="150.00"
          min="0"
          error={errors.weekly_rate}
        />
        <SelectField
          label="Payment Method"
          required
          value={data.payment_method}
          onChange={set('payment_method')}
          options={['Cash', 'Bank Transfer', 'Housing Benefit Direct', 'Standing Order']}
          error={errors.payment_method}
        />
        <TextField
          label="Charge Start Date"
          required
          type="date"
          value={data.start_date}
          onChange={set('start_date') as (v: string) => void}
          error={errors.start_date}
        />
      </FormSection>

      <FormSection title="Services Included" number="2.0">
        <CheckboxField label="Utilities (gas, electric, water)" checked={data.includes_utilities}
          onChange={set('includes_utilities') as (v: boolean) => void} colSpan2 />
        <CheckboxField label="Internet / WiFi" checked={data.includes_internet}
          onChange={set('includes_internet') as (v: boolean) => void} colSpan2 />
        <CheckboxField label="Laundry facilities" checked={data.includes_laundry}
          onChange={set('includes_laundry') as (v: boolean) => void} colSpan2 />
        <TextareaField
          label="Additional Charge Breakdown"
          value={data.charge_breakdown}
          onChange={set('charge_breakdown') as (v: string) => void}
          placeholder="e.g. Cleaning £20/wk, meals £30/wk…"
          colSpan2
        />
      </FormSection>

      <FormSection title="Tenant Acknowledgement" number="3.0">
        {errors.policies && (
          <div className="col-span-2 px-3 py-2 bg-red-50 border border-red-200 rounded-lg text-xs text-red-600 font-semibold">
            {errors.policies}
          </div>
        )}
        <CheckboxField
          label="I understand that service charges must be paid weekly in advance."
          description="Failure to pay will result in formal arrears proceedings."
          checked={data.arrears_policy_acknowledged}
          onChange={set('arrears_policy_acknowledged') as (v: boolean) => void}
          colSpan2
        />
        <CheckboxField
          label="I understand that persistent non-payment may result in eviction proceedings."
          description="This is in accordance with the licence agreement and Housing Act 1988."
          checked={data.eviction_warning_acknowledged}
          onChange={set('eviction_warning_acknowledged') as (v: boolean) => void}
          colSpan2
        />
        <TextareaField
          label="Additional Acknowledgement Notes"
          value={data.tenant_acknowledgement}
          onChange={set('tenant_acknowledgement') as (v: string) => void}
          placeholder="Any agreed variations or additional terms…"
          colSpan2
        />
      </FormSection>

      <FormSection title="Signatures" number="4.0">
        <TextField
          label="Tenant Full Name"
          required
          value={data.tenant_name}
          onChange={set('tenant_name') as (v: string) => void}
          placeholder="Type full name to sign"
          error={errors.tenant_name}
        />
        <TextField
          label="Manager / Owner Name"
          required
          value={data.manager_name}
          onChange={set('manager_name') as (v: string) => void}
          placeholder="General Matlub / Ahsan Rehman"
          error={errors.manager_name}
        />
      </FormSection>

      {!readOnly && (
        <FormActions
          submitting={isSaving}
          onSaveDraft={onSaveDraft ? () => onSaveDraft(data) : undefined}
          onSubmit={handleSubmit}
          submitLabel="Confirm Agreement & Stamp"
        />
      )}
    </div>
  );
}
