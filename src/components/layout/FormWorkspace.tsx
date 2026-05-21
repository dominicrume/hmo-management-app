'use client';

import { useState, useCallback } from 'react';
import { Link, CheckCircle2, AlertCircle, Loader2, Printer } from 'lucide-react';
import type { Brand } from './LetterheadSwitcher';
import type { FormId } from './FormsPanel';
import type { DbTenant } from '@/types/database';

// ── Digitalized form components (Form 1–8 from the Ash Shahada 53-page pack) ──
import AIBrainPanel                from '@/components/ai/AIBrainPanel';
import Form01IntakeChecklist       from '@/components/forms/Form01IntakeChecklist';
import Form02SupportChecklist      from '@/components/forms/Form02SupportChecklist';
import Form03PersonalDetails       from '@/components/forms/Form03PersonalDetails';
import Form04MissingPerson         from '@/components/forms/Form04MissingPerson';
import Form05ConfidentialityWaiver from '@/components/forms/Form05ConfidentialityWaiver';
import Form06ServiceCharge         from '@/components/forms/Form06ServiceCharge';
import Form07RiskAssessment        from '@/components/forms/Form07RiskAssessment';
import Form08SupportPlan           from '@/components/forms/Form08SupportPlan';
import {
  TextField, TextareaField, SelectField, FormSection, FormActions,
} from '@/components/forms/FormField';

// ── Housing Benefit Claim — no dedicated Form09 component, saved as session ──

interface HousingFormData {
  licence_date:        string;
  property_address:    string;
  room_number:         string;
  weekly_core_rent:    string;
  service_charge:      string;
  total_weekly_charge: string;
  claim_reference:     string;
  claim_type:          string;
  claim_start_date:    string;
  weekly_rent:         string;
  assessment_notes:    string;
}

function HousingBenefitForm({
  tenant, onSubmit, onSaveDraft,
}: {
  tenant:       DbTenant;
  onSubmit:     (data: unknown) => void;
  onSaveDraft:  (data: unknown) => void;
}) {
  const [data, setData] = useState<HousingFormData>({
    licence_date: '', property_address: tenant.address,
    room_number: tenant.room_number, weekly_core_rent: '',
    service_charge: '', total_weekly_charge: '',
    claim_reference: '', claim_type: '', claim_start_date: '',
    weekly_rent: String(tenant.benefit_amount || ''), assessment_notes: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const set = (f: keyof HousingFormData) => (v: string) =>
    setData((prev) => ({ ...prev, [f]: v }));

  const validate = () => {
    const e: Record<string, string> = {};
    if (!data.claim_reference.trim()) e.claim_reference  = 'Claim reference is required.';
    if (!data.claim_type)             e.claim_type       = 'Claim type is required.';
    if (!data.claim_start_date)       e.claim_start_date = 'Claim start date is required.';
    return e;
  };

  return (
    <div>
      <FormSection title="Licence to Occupy" number="1.0">
        <TextField label="Licence Effective Date" type="date"
          value={data.licence_date} onChange={set('licence_date')} />
        <TextField label="Room Number" value={data.room_number}
          onChange={set('room_number')} placeholder="Room 4B" />
        <TextareaField label="Property Address" value={data.property_address}
          onChange={set('property_address')} colSpan2 />
      </FormSection>

      <FormSection title="Licence Charge Payments" number="2.0">
        <TextField label="Weekly Core Rent (£)" type="number"
          value={data.weekly_core_rent} onChange={set('weekly_core_rent')} placeholder="0.00" />
        <TextField label="Service Charge (£)" type="number"
          value={data.service_charge} onChange={set('service_charge')} placeholder="0.00" />
        <TextField label="Total Weekly Licence Charge (£)" type="number"
          value={data.total_weekly_charge} onChange={set('total_weekly_charge')} placeholder="0.00" />
      </FormSection>

      <FormSection title="Housing Benefit Claim" number="3.0">
        <TextField label="Claim Reference Number" required mono
          value={data.claim_reference} onChange={set('claim_reference')}
          placeholder="HBC-2026-XXXXX" error={errors.claim_reference} />
        <SelectField label="Claim Type" required
          value={data.claim_type} onChange={set('claim_type')}
          options={['Housing Benefit', 'Universal Credit — Housing Element', 'Other']}
          error={errors.claim_type} />
        <TextField label="Claim Start Date" required type="date"
          value={data.claim_start_date} onChange={set('claim_start_date')}
          error={errors.claim_start_date} />
        <TextField label="Weekly Rent Amount (£)" type="number"
          value={data.weekly_rent} onChange={set('weekly_rent')} placeholder="0.00" />
        <TextareaField label="Assessment Notes" value={data.assessment_notes}
          onChange={set('assessment_notes')}
          placeholder="Additional notes for the housing benefit assessment…" colSpan2 />
      </FormSection>

      <FormActions
        onSaveDraft={() => onSaveDraft(data)}
        onSubmit={() => {
          const errs = validate();
          if (Object.keys(errs).length) { setErrors(errs); return; }
          onSubmit(data);
        }}
        submitLabel="Save & Stamp Claim"
      />
    </div>
  );
}

// ── Brand letterhead configs ──────────────────────────────────────────────────

const LETTERHEAD: Record<Brand, { name: string; tagline: string; formRef: string }> = {
  mattys_place: {
    name:    "Matty's Place",
    tagline: 'Supported Housing & Community Services',
    formRef: 'MP-TN-2026',
  },
  ash_shahada: {
    name:    'Ash Shahada Housing Association Ltd',
    tagline: 'Birmingham HMO & Social Housing — Registered Charity',
    formRef: 'ASHA-TN-2026',
  },
  reliance: {
    name:    'Reliance Housing',
    tagline: 'Community Support Services, Birmingham',
    formRef: 'RH-TN-2026',
  },
};

const FORM_TITLES: Record<FormId, string> = {
  personal:   'Personal Details — Form 3',
  housing:    'Housing Benefit Claim',
  assessment: 'Initial Support Plan — Form 8',
  risk:       'Risk Assessment — Form 7',
  missing:    'Missing Person Form — Form 4',
  service:    'Service Charge Agreement — Form 6',
  privacy:    'Confidentiality Waiver — Form 5',
  agreement:  'Support Checklist — Form 2',
  induction:  'Admission Checklist — Form 1',
  'ai-brain': 'AI Brain',
};

// ── Types ────────────────────────────────────────────────────────────────────

type SaveStatus = 'idle' | 'saving' | 'saved' | 'error';

interface Props {
  brand:            Brand;
  activeForm:       FormId;
  activeTenant:     string;
  activeTenantObj?: DbTenant | null;
  workerId?:        string;
  isManager?:       boolean;
  onAdminAction?:   () => void;
  onSaved?:         () => void;
}

// ── Main component ────────────────────────────────────────────────────────────

export default function FormWorkspace({
  brand, activeForm, activeTenant, activeTenantObj, workerId, isManager, onAdminAction, onSaved,
}: Props) {
  const lh    = LETTERHEAD[brand];
  const today = new Date().toLocaleDateString('en-GB', {
    day: 'numeric', month: 'long', year: 'numeric',
  });

  const [status, setStatus] = useState<SaveStatus>('idle');
  const [errMsg, setErrMsg] = useState('');

  // Central save — every form's onSubmit/onSaveDraft flows through here
  const save = useCallback(async (data: Record<string, unknown>, stamp: boolean) => {
    if (!activeTenantObj) return;
    setStatus('saving');
    setErrMsg('');
    try {
      const res = await fetch('/api/forms/save', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          form_id:   activeForm,
          tenant_id: activeTenantObj.id,
          data,
          stamp,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? 'Save failed');
      setStatus('saved');
      setTimeout(() => setStatus('idle'), 8000);
      onSaved?.();
    } catch (e: unknown) {
      setErrMsg(e instanceof Error ? e.message : 'Save failed');
      setStatus('error');
      // Do NOT auto-clear error — support worker must acknowledge it
    }
  }, [activeForm, activeTenantObj, onSaved]);

  // (data: unknown) is assignable to every Form0X onSubmit type via contravariance
  const onSubmit = useCallback((data: unknown) => save(data as Record<string, unknown>, true),  [save]);
  const onDraft  = useCallback((data: unknown) => save(data as Record<string, unknown>, false), [save]);

  // ── AI Brain — full-height panel, no letterhead ───────────────────────────

  if (activeForm === 'ai-brain') {
    return (
      <main className="flex-1 overflow-hidden bg-white">
        {activeTenantObj && workerId
          ? <AIBrainPanel tenant={activeTenantObj} workerId={workerId} />
          : (
            <div className="flex items-center justify-center h-full text-slate-400 text-sm">
              Select a tenant to use the AI Brain.
            </div>
          )
        }
      </main>
    );
  }

  const t = activeTenantObj;

  // ── Form body — keyed so state resets on tenant/form change ───────────────

  const renderFormBody = () => {
    if (!t) {
      return (
        <div className="py-20 text-center">
          <p className="text-slate-400 text-sm">Select a tenant from the list to load this form.</p>
        </div>
      );
    }

    const key = `${t.id}-${activeForm}`;

    switch (activeForm) {

      case 'personal':
        return (
          <Form03PersonalDetails
            key={key}
            initialData={{
              title:             t.title,
              full_name:         t.full_name,
              dob:               t.dob,
              nino:              t.nino,
              nationality:       t.nationality,
              date_entry_uk:     t.date_entry_uk   ?? '',
              address:           t.address,
              room_number:       t.room_number,
              email:             t.email           ?? '',
              mobile:            t.mobile,
              languages:         t.languages       ?? '',
              moved_in:          t.moved_in,
              benefit_type:      t.benefit_type,
              benefit_freq:      t.benefit_freq,
              benefit_amount:    String(t.benefit_amount ?? ''),
              nok_name:          t.nok_name,
              nok_relation:      t.nok_relation,
              nok_phone:         t.nok_phone,
              nok_address:       t.nok_address     ?? '',
              doctor:            t.doctor          ?? '',
              on_probation:      t.on_probation,
              probation_officer: t.probation_officer ?? '',
              marital_status:    t.marital_status  ?? '',
            }}
            onSubmit={onSubmit}
            onSaveDraft={onDraft}
          />
        );

      case 'missing':
        return (
          <Form04MissingPerson
            key={key}
            initialData={{
              place_of_birth:       t.place_of_birth      ?? '',
              marital_status:       t.marital_status      ?? '',
              nationality:          t.nationality,
              employer_or_college:  t.employer_or_college ?? '',
              vehicle_registration: t.vehicle_registration ?? '',
            }}
            onSubmit={onSubmit}
            onSaveDraft={onDraft}
          />
        );

      case 'privacy':
        return (
          <Form05ConfidentialityWaiver
            key={key}
            residentName={t.full_name}
            onSubmit={onSubmit}
            onSaveDraft={onDraft}
          />
        );

      case 'service':
        return (
          <Form06ServiceCharge
            key={key}
            tenantName={t.full_name}
            onSubmit={onSubmit}
            onSaveDraft={onDraft}
          />
        );

      case 'risk':
        return (
          <Form07RiskAssessment
            key={key}
            onSubmit={onSubmit}
            onSaveDraft={onDraft}
          />
        );

      case 'assessment':
        return (
          <Form08SupportPlan
            key={key}
            tenantName={t.full_name}
            dob={t.dob}
            nino={t.nino}
            onSubmit={onSubmit}
            onSaveDraft={onDraft}
          />
        );

      case 'agreement':
        return (
          <Form02SupportChecklist
            key={key}
            onSubmit={onSubmit}
            onSaveDraft={onDraft}
          />
        );

      case 'induction':
        return (
          <Form01IntakeChecklist
            key={key}
            onSubmit={onSubmit}
            onSaveDraft={onDraft}
          />
        );

      case 'housing':
        return (
          <HousingBenefitForm
            key={key}
            tenant={t}
            onSubmit={onSubmit}
            onSaveDraft={onDraft}
          />
        );

      default:
        return null;
    }
  };

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <main
      className="form-workspace flex-1 overflow-y-auto bg-cream px-8 py-6"
      data-brand={brand}
    >
      <div
        className="max-w-3xl mx-auto bg-white shadow-lg rounded-sm border border-slate-200
                   min-h-[1056px] p-12"
      >
        {/* ── Letterhead ── */}
        <div className="flex justify-between items-start pb-6 mb-8 brand-border-bottom">
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
              {lh.formRef}-{activeTenantObj ? activeTenantObj.id.slice(-4).toUpperCase() : 'NEW'}
            </p>
            <p className="text-xs font-medium text-slate-600 mt-0.5">{today}</p>
            <p className="text-xxs text-slate-400 mt-0.5">
              Resident: <span className="text-navy font-semibold">{activeTenant}</span>
            </p>
          </div>
        </div>

        {/* ── Form title bar ── */}
        <div className="flex items-start justify-between mb-8">
          <div>
            <div className="brand-badge inline-block text-xxs font-black uppercase tracking-widest
                            px-2 py-1 rounded mb-3">
              {FORM_TITLES[activeForm]}
            </div>
            <p className="text-xxs text-slate-400">
              All entries are blockchain-stamped on save. The original is preserved in the audit trail.
            </p>
          </div>
          <div className="flex items-center gap-2">
            {isManager && activeTenantObj && (
              <button
                type="button"
                onClick={onAdminAction}
                className="no-print flex items-center gap-1.5 px-3 py-1.5 border border-red-200
                           bg-red-50 rounded-lg text-xxs font-bold text-red-600 hover:bg-red-100 transition-colors"
                title="Erase or Archive this tenant record"
              >
                <AlertCircle className="w-3 h-3" />
                Manage Record
              </button>
            )}
            <button
              type="button"
              onClick={() => window.print()}
              className="no-print flex items-center gap-1.5 px-3 py-1.5 border border-slate-200
                         rounded-lg text-xxs font-bold text-slate-500 hover:bg-slate-50 transition-colors"
            >
              <Printer className="w-3 h-3" />
              Print
            </button>
          </div>
        </div>

        {/* ── Save status bar ── */}
        {status !== 'idle' && (
          <div
            className={`mb-6 flex items-center gap-2 px-4 py-2.5 rounded-lg text-xs font-semibold
              ${status === 'saved'  ? 'bg-emerald-50 border border-emerald-200 text-emerald-700' : ''}
              ${status === 'saving' ? 'bg-amber/10  border border-amber/30  text-amber-dark'     : ''}
              ${status === 'error'  ? 'bg-red-50    border border-red-200   text-red-600'        : ''}`}
          >
            {status === 'saving' && <Loader2 className="w-3.5 h-3.5 animate-spin flex-shrink-0" />}
            {status === 'saved'  && <CheckCircle2 className="w-3.5 h-3.5 flex-shrink-0" />}
            {status === 'error'  && <AlertCircle  className="w-3.5 h-3.5 flex-shrink-0" />}
            <span className="flex items-center gap-2 flex-1">
              {status === 'saving' && 'Saving and computing blockchain hash…'}
              {status === 'saved'  && (
                <>
                  Saved &amp; blockchain-stamped.
                  <span className="font-mono text-xxs flex items-center gap-1 opacity-70">
                    <Link className="w-2.5 h-2.5" /> SHA-256 · verified
                  </span>
                </>
              )}
              {status === 'error' && (errMsg || 'Save failed — check the form and try again.')}
            </span>
            {status === 'error' && (
              <button
                type="button"
                onClick={() => { setStatus('idle'); setErrMsg(''); }}
                className="ml-auto text-red-400 hover:text-red-600 font-bold text-sm leading-none"
                aria-label="Dismiss error"
              >×</button>
            )}
          </div>
        )}

        {/* ── Form body — real Form01-Form08 components ── */}
        {renderFormBody()}

      </div>
    </main>
  );
}
