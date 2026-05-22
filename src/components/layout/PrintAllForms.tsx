'use client';

import type { DbTenant } from '@/types/database';
import Form01IntakeChecklist       from '@/components/forms/Form01IntakeChecklist';
import Form02SupportChecklist      from '@/components/forms/Form02SupportChecklist';
import Form03PersonalDetails       from '@/components/forms/Form03PersonalDetails';
import Form04MissingPerson         from '@/components/forms/Form04MissingPerson';
import Form05ConfidentialityWaiver from '@/components/forms/Form05ConfidentialityWaiver';
import Form06ServiceCharge         from '@/components/forms/Form06ServiceCharge';
import Form07RiskAssessment        from '@/components/forms/Form07RiskAssessment';
import Form08SupportPlan           from '@/components/forms/Form08SupportPlan';
import {
  TextField, TextareaField, SelectField, FormSection
} from '@/components/forms/FormField';
import { Brand, BRANDS } from './LetterheadSwitcher';

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

function PrintHousingBenefitForm({ tenant }: { tenant: DbTenant }) {
  const data: HousingFormData = {
    licence_date: '', property_address: tenant.address,
    room_number: tenant.room_number, weekly_core_rent: '',
    service_charge: '', total_weekly_charge: '',
    claim_reference: '', claim_type: '', claim_start_date: '',
    weekly_rent: String(tenant.benefit_amount || ''), assessment_notes: '',
  };

  return (
    <div>
      <FormSection title="Licence to Occupy" number="1.0">
        <TextField label="Licence Effective Date" type="date" value={data.licence_date} onChange={() => {}} />
        <TextField label="Room Number" value={data.room_number} onChange={() => {}} placeholder="Room 4B" />
        <TextareaField label="Property Address" value={data.property_address} onChange={() => {}} colSpan2 />
      </FormSection>

      <FormSection title="Licence Charge Payments" number="2.0">
        <TextField label="Weekly Core Rent (£)" type="number" value={data.weekly_core_rent} onChange={() => {}} placeholder="0.00" />
        <TextField label="Service Charge (£)" type="number" value={data.service_charge} onChange={() => {}} placeholder="0.00" />
        <TextField label="Total Weekly Licence Charge (£)" type="number" value={data.total_weekly_charge} onChange={() => {}} placeholder="0.00" />
      </FormSection>

      <FormSection title="Housing Benefit Claim" number="3.0">
        <TextField label="Claim Reference Number" required mono value={data.claim_reference} onChange={() => {}} placeholder="HBC-2026-XXXXX" />
        <SelectField label="Claim Type" required value={data.claim_type} onChange={() => {}} options={['Housing Benefit', 'Universal Credit — Housing Element', 'Other']} />
        <TextField label="Claim Start Date" required type="date" value={data.claim_start_date} onChange={() => {}} />
        <TextField label="Weekly Rent Amount (£)" type="number" value={data.weekly_rent} onChange={() => {}} placeholder="0.00" />
        <TextareaField label="Assessment Notes" value={data.assessment_notes} onChange={() => {}} placeholder="Additional notes for the housing benefit assessment…" colSpan2 />
      </FormSection>
    </div>
  );
}

export default function PrintAllForms({ tenant, brand }: { tenant: DbTenant, brand: Brand }) {
  const noop = () => {};
  const activeBrand = BRANDS.find((b) => b.id === brand) ?? BRANDS[0];
  
  const PageBreak = () => <div className="break-after-page my-8 border-b-2 border-dashed border-slate-300 print:border-none" />;

  const LetterHead = ({ title, subtitle }: { title: string, subtitle: string }) => (
    <div className="flex justify-between items-start pb-6 mb-8 border-b-4" style={{ borderColor: activeBrand.accentColor }}>
      <div>
        <h2 className="text-2xl font-black text-navy tracking-tight uppercase" style={{ color: activeBrand.accentColor }}>
          {activeBrand.label}
        </h2>
        <p className="text-xxs text-slate-400 font-semibold tracking-widest uppercase mt-1">
          {activeBrand.subtitle}
        </p>
      </div>
      <div className="text-right">
        <p className="text-xxs font-mono font-semibold text-slate-400 uppercase">
          {title}
        </p>
        <p className="text-xs font-medium text-slate-600 mt-0.5">{new Date().toLocaleDateString('en-GB')}</p>
        <p className="text-xxs text-slate-400 mt-0.5">
          Resident: <span className="text-navy font-semibold">{tenant.full_name}</span>
        </p>
      </div>
    </div>
  );

  const FormWrapper = ({ title, subtitle, children }: { title: string, subtitle: string, children: React.ReactNode }) => (
    <div className="bg-white p-8 max-w-3xl mx-auto print:shadow-none print:p-0 print:max-w-none">
      <LetterHead title={title} subtitle={subtitle} />
      <div className="flex items-start justify-between mb-8">
        <div>
          <div className="inline-block text-xxs font-black uppercase tracking-widest px-2.5 py-1 rounded-sm mb-2" style={{ backgroundColor: `${activeBrand.accentColor}20`, color: activeBrand.accentColor }}>
            {title}
          </div>
          <p className="text-xxs text-slate-400">{subtitle}</p>
        </div>
      </div>
      {children}
    </div>
  );

  return (
    <div className="print-all-container">
      {/* 1. Housing Benefit Claim */}
      <FormWrapper title="Housing Benefit Claim" subtitle="Online application or Change of Circumstance.">
        <PrintHousingBenefitForm tenant={tenant} />
      </FormWrapper>
      <PageBreak />

      {/* 2. Personal Details */}
      <FormWrapper title="Personal Details — Form 3" subtitle="Primary identity and contact information collection.">
        <Form03PersonalDetails
          initialData={{
            title: tenant.title, full_name: tenant.full_name, dob: tenant.dob, nino: tenant.nino,
            nationality: tenant.nationality, date_entry_uk: tenant.date_entry_uk ?? '',
            address: tenant.address, room_number: tenant.room_number, email: tenant.email ?? '',
            mobile: tenant.mobile, languages: tenant.languages ?? '', moved_in: tenant.moved_in,
            benefit_type: tenant.benefit_type, benefit_freq: tenant.benefit_freq,
            benefit_amount: String(tenant.benefit_amount ?? ''), nok_name: tenant.nok_name,
            nok_relation: tenant.nok_relation, nok_phone: tenant.nok_phone, nok_address: tenant.nok_address ?? '',
            doctor: tenant.doctor ?? '', on_probation: tenant.on_probation, probation_officer: tenant.probation_officer ?? '',
            marital_status: tenant.marital_status ?? '',
          }}
          onSubmit={noop} onSaveDraft={noop}
        />
      </FormWrapper>
      <PageBreak />

      {/* 3. Missing Person */}
      <FormWrapper title="Missing Person — Form 4" subtitle="Police report and risk profiling documentation.">
        <Form04MissingPerson
          initialData={{
            place_of_birth: tenant.place_of_birth ?? '', marital_status: tenant.marital_status ?? '',
            nationality: tenant.nationality, employer_or_college: tenant.employer_or_college ?? '',
            vehicle_registration: tenant.vehicle_registration ?? '',
          }}
          onSubmit={noop} onSaveDraft={noop}
        />
      </FormWrapper>
      <PageBreak />

      {/* 4. Support Checklist */}
      <FormWrapper title="Support Checklist — Form 2" subtitle="On arrival, within 3 days, and after 3 days task sign-off.">
        <Form02SupportChecklist initialData={{}} onSubmit={noop} onSaveDraft={noop} />
      </FormWrapper>
      <PageBreak />

      {/* 5. Initial Assessment */}
      <FormWrapper title="Initial Assessment — Form 1" subtitle="Needs assessment completed with service user on arrival.">
        <Form01IntakeChecklist initialData={{}} onSubmit={noop} onSaveDraft={noop} />
      </FormWrapper>
      <PageBreak />

      {/* 6. Service Charge */}
      <FormWrapper title="Service Charge — Form 6" subtitle="Service charge letter — weekly and monthly breakdown.">
        <Form06ServiceCharge initialData={{}} onSubmit={noop} onSaveDraft={noop} />
      </FormWrapper>
      <PageBreak />

      {/* 7. Confidentiality Waiver */}
      <FormWrapper title="Confidentiality Waiver — Form 5" subtitle="GDPR consent and data sharing agreement.">
        <Form05ConfidentialityWaiver residentName={tenant.full_name} onSubmit={noop} onSaveDraft={noop} />
      </FormWrapper>
      <PageBreak />

      {/* 8. Risk Assessment */}
      <FormWrapper title="Risk Assessment — Form 7" subtitle="Internal document.">
        <Form07RiskAssessment initialData={{}} onSubmit={noop} onSaveDraft={noop} />
      </FormWrapper>
      <PageBreak />

      {/* 9. Support Plan */}
      <FormWrapper title="Admission Checklist — Form 8" subtitle="Tenant admission & key handover.">
        <Form08SupportPlan initialData={{}} onSubmit={noop} onSaveDraft={noop} />
      </FormWrapper>
    </div>
  );
}
