'use client';

import { useRef, useState, useCallback } from 'react';
import { Save, Link, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import type { Brand } from './LetterheadSwitcher';
import type { FormId } from './FormsPanel';
import type { DbTenant } from '@/types/database';
import AIBrainPanel from '@/components/ai/AIBrainPanel';

// ── Brand letterhead configs ──────────────────────────────────────────────────

const LETTERHEAD: Record<Brand, {
  name: string;
  tagline: string;
  formRef: string;
}> = {
  mattys_place: {
    name: "Matty's Place",
    tagline: 'Supported Housing & Community Services',
    formRef: 'MP-TN-2026',
  },
  ash_shahada: {
    name: 'Ash Shahada Housing Association Ltd',
    tagline: 'Birmingham HMO & Social Housing — Registered Charity',
    formRef: 'ASHA-TN-2026',
  },
  reliance: {
    name: 'Reliance Housing',
    tagline: 'Community Support Services, Birmingham',
    formRef: 'RH-TN-2026',
  },
};

// ── Sub-components ────────────────────────────────────────────────────────────

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-8">
      <h3 className="text-xxs font-black text-navy uppercase tracking-widest mb-4 flex items-center gap-2">
        <span className="w-1 h-3.5 bg-amber rounded-full inline-block" />
        Section {title}
      </h3>
      <div className="grid grid-cols-2 gap-x-8 gap-y-5">
        {children}
      </div>
    </div>
  );
}

function Field({
  name,
  label,
  type = 'text',
  placeholder = '',
  textarea = false,
  mono = false,
  defaultValue = '',
}: {
  name: string;
  label: string;
  type?: string;
  placeholder?: string;
  textarea?: boolean;
  mono?: boolean;
  defaultValue?: string;
}) {
  const fieldId = `field-${name}`;
  const baseClass = `w-full border-b border-field-line py-1.5 text-sm text-navy bg-transparent
    focus:border-navy focus:outline-none transition-colors placeholder-slate-300
    ${mono ? 'font-mono tracking-widest' : ''}`;

  return (
    <div className={`space-y-1 ${textarea ? 'col-span-2' : ''}`}>
      <label htmlFor={fieldId} className="text-xxs font-black text-slate-400 uppercase tracking-wider">
        {label}
      </label>
      {textarea ? (
        <textarea
          id={fieldId}
          name={name}
          placeholder={placeholder}
          rows={3}
          defaultValue={defaultValue}
          className={`${baseClass} border border-slate-200 rounded-lg px-3 py-2 resize-none`}
        />
      ) : (
        <input
          id={fieldId}
          name={name}
          type={type}
          placeholder={placeholder}
          defaultValue={defaultValue}
          className={baseClass}
        />
      )}
    </div>
  );
}

function SelectField({
  name,
  label,
  options,
  defaultValue = '',
}: {
  name: string;
  label: string;
  options: string[];
  defaultValue?: string;
}) {
  const fieldId = `field-${name}`;
  return (
    <div className="space-y-1">
      <label htmlFor={fieldId} className="text-xxs font-black text-slate-400 uppercase tracking-wider">
        {label}
      </label>
      <select
        id={fieldId}
        name={name}
        defaultValue={defaultValue}
        className="w-full border-b border-field-line py-1.5 text-sm text-navy bg-transparent focus:border-navy focus:outline-none transition-colors"
      >
        <option value="">Select…</option>
        {options.map((o) => (
          <option key={o} value={o}>{o}</option>
        ))}
      </select>
    </div>
  );
}

// ── Form section builders (accept tenant for pre-population) ──────────────────

function buildFormSections(
  t: DbTenant | null | undefined
): Partial<Record<FormId, React.ReactNode>> {
  return {
    personal: (
      <>
        <Section title="1.0  Personal Information">
          <SelectField name="title"       label="Title"                        options={['Mr', 'Mrs', 'Ms', 'Miss', 'Dr', 'Other']}   defaultValue={t?.title ?? ''} />
          <Field name="full_name"     label="Full Legal Name"              placeholder="e.g. John Stevenson"        defaultValue={t?.full_name ?? ''} />
          <Field name="dob"           label="Date of Birth"                type="date"                              defaultValue={t?.dob ?? ''} />
          <Field name="nino"          label="National Insurance Number"    placeholder="AB 12 34 56 C" mono         defaultValue={t?.nino ?? ''} />
          <Field name="nationality"   label="Nationality"                  placeholder="e.g. British"               defaultValue={t?.nationality ?? ''} />
          <SelectField name="marital_status" label="Marital Status"       options={['Single', 'Married', 'Divorced', 'Widowed', 'Separated', 'Civil Partnership']} defaultValue={t?.marital_status ?? ''} />
          <Field name="place_of_birth" label="Place of Birth"             placeholder="e.g. Birmingham, UK"        defaultValue={t?.place_of_birth ?? ''} />
          <Field name="date_entry_uk" label="Date of Entry to UK (if applicable)" type="date"                      defaultValue={t?.date_entry_uk ?? ''} />
          <Field name="mobile"        label="Primary Mobile"               placeholder="+44 7000 000000"            defaultValue={t?.mobile ?? ''} />
          <Field name="email"         label="Email Address"                type="email" placeholder="john@example.com" defaultValue={t?.email ?? ''} />
          <Field name="languages"     label="Languages Spoken and Written" placeholder="e.g. English, Urdu"         defaultValue={t?.languages ?? ''} />
        </Section>
        <Section title="2.0  Housing">
          <Field name="address"       label="Full Address"   placeholder="12 Example Street, Birmingham B1 2AB" defaultValue={t?.address ?? ''} />
          <Field name="room_number"   label="Room Number"    placeholder="Room 4B"                               defaultValue={t?.room_number ?? ''} />
          <Field name="moved_in"      label="Move-In Date"   type="date"                                         defaultValue={t?.moved_in ?? ''} />
        </Section>
        <Section title="3.0  Benefits">
          <SelectField name="benefit_type" label="Benefit Type"       options={['Universal Credit', 'Housing Benefit', 'PIP', 'ESA', 'JSA', 'None']}    defaultValue={t?.benefit_type ?? ''} />
          <SelectField name="benefit_freq" label="Payment Frequency"  options={['Monthly', 'Fortnightly', 'Weekly']}                                      defaultValue={t?.benefit_freq ?? ''} />
          <Field       name="benefit_amount" label="Benefit Amount (£)" type="number" placeholder="0.00"                                                  defaultValue={t?.benefit_amount != null ? String(t.benefit_amount) : ''} />
        </Section>
        <Section title="4.0  Next of Kin">
          <Field name="nok_name"     label="Name"         placeholder="Full name"            defaultValue={t?.nok_name ?? ''} />
          <Field name="nok_relation" label="Relationship" placeholder="e.g. Brother"         defaultValue={t?.nok_relation ?? ''} />
          <Field name="nok_phone"    label="Phone"        placeholder="+44 7000 000000"       defaultValue={t?.nok_phone ?? ''} />
          <Field name="nok_address"  label="Address"      placeholder="Full postal address"   defaultValue={t?.nok_address ?? ''} />
        </Section>
        <Section title="5.0  Medical & Other">
          <Field name="doctor"            label="GP Name & Surgery"               placeholder="Dr Smith — Digbeth Medical Centre" defaultValue={t?.doctor ?? ''} />
          <Field name="probation_officer" label="Probation Officer (if applicable)" placeholder="Officer name"                    defaultValue={t?.probation_officer ?? ''} />
        </Section>
      </>
    ),

    housing: (
      <>
        <Section title="1.0  Licence to Occupy">
          <Field name="licence_date"            label="Licence Effective Date"          type="date" />
          <Field name="property_address"        label="Property Address"                placeholder="Full postal address" textarea defaultValue={t?.address ?? ''} />
          <Field name="postcode"                label="Postcode"                        placeholder="B1 2AB" />
          <Field name="room_number"             label="Room Number"                     placeholder="Room 4" defaultValue={t?.room_number ?? ''} />
          <Field name="dob"                     label="Date of Birth"                   type="date" defaultValue={t?.dob ?? ''} />
          <Field name="nino"                    label="National Insurance Number"       placeholder="AB 12 34 56 C" mono defaultValue={t?.nino ?? ''} />
        </Section>
        <Section title="2.0  Licence Charge Payments">
          <Field name="weekly_core_rent"        label="Weekly Core Rent (£)"            type="number" placeholder="0.00" />
          <Field name="service_charge"          label="Service Charge (£)"              type="number" placeholder="0.00" />
          <Field name="total_eligible_rent"     label="Total Eligible Rent per Week (£)" type="number" placeholder="0.00" />
          <Field name="other_charges"           label="Other Charges — Personal (£)"   type="number" placeholder="0.00" />
          <Field name="total_weekly_charge"     label="Total Weekly Licence Charge (£)" type="number" placeholder="0.00" />
        </Section>
        <Section title="3.0  Housing Benefit Claim">
          <Field name="claim_reference"         label="Claim Reference Number"         placeholder="HBC-2026-XXXXX" mono />
          <SelectField name="claim_type"        label="Claim Type"                     options={['Housing Benefit', 'Universal Credit — Housing Element', 'Other']} />
          <Field name="claim_start_date"        label="Claim Start Date"               type="date" />
          <Field name="assessment_notes"        label="Assessment Notes"               textarea />
        </Section>
      </>
    ),

    assessment: (
      <>
        <Section title="1.0  Identification">
          <Field name="full_name"         label="Name"                     defaultValue={t?.full_name ?? ''} />
          <Field name="dob"               label="Date of Birth"            type="date" defaultValue={t?.dob ?? ''} />
          <Field name="nino"              label="National Insurance Number" mono defaultValue={t?.nino ?? ''} />
          <Field name="property_address"  label="Address of Property"      defaultValue={t?.address ?? ''} />
        </Section>

        <Section title="2.0  Family & Personal Support">
          <SelectField name="family_support"       label="Family Support Available?"         options={['Yes', 'No']} />
          <SelectField name="family_support_freq"  label="Level of Family Support"           options={['Daily', 'Weekly', 'Monthly', 'Rarely', 'N/A']} />
          <Field       name="family_support_who"   label="If yes — who provides support?"    placeholder="Name and relationship" />
          <Field       name="family_support_no_why" label="If no — why not?"                 textarea />
        </Section>

        <Section title="3.0  Drugs & Alcohol">
          <SelectField name="uses_drugs"            label="Do you use drugs?"                options={['Yes', 'No']} />
          <Field       name="drugs_specify"         label="If yes — please specify"          textarea placeholder="Type of drug(s)..." />
          <SelectField name="drug_method"           label="Method of Administration"         options={['Oral', 'Smoking', 'Injection', 'Snorting', 'N/A']} />
          <Field       name="drug_injection_site"   label="If injection — which body part?"  placeholder="e.g. arm" />
          <SelectField name="has_drug_worker"       label="Do you have a drug worker?"       options={['Yes', 'No']} />
          <Field       name="drug_worker_name"      label="Name of Drugs Worker"             placeholder="Full name" />
          <Field       name="drug_worker_location"  label="Location of Drugs Team"           placeholder="Address/service name" />
          <SelectField name="on_prescription"       label="Are you on a prescription?"       options={['Yes', 'No']} />
          <Field       name="prescription_for"      label="Prescription for"                 textarea placeholder="What condition(s)..." />
          <Field       name="prescription_dosage"   label="Dosage"                           placeholder="e.g. 20mg twice daily" />
          <Field       name="prescription_qty"      label="Quantity per Prescription"        placeholder="e.g. 28 tablets" />
          <Field       name="prescription_freq"     label="Frequency of Collection"          placeholder="e.g. Monthly" />
          <Field       name="prescription_issuer"   label="Person Issuing Prescription"      placeholder="GP name / clinic" />
          <SelectField name="drinks_alcohol"        label="Do you drink alcohol?"            options={['Yes', 'No']} />
          <SelectField name="alcohol_freq"          label="Frequency of Alcohol Consumption" options={['Daily', 'Weekly', 'Monthly', 'N/A']} />
          <SelectField name="alcohol_is_problem"    label="Do you consider alcohol a problem?" options={['Yes', 'No']} />
          <Field       name="alcohol_problem_details" label="If yes — please give details"   textarea />
        </Section>

        <Section title="4.0  Suicide & Self Harm">
          <SelectField name="has_suicide_thoughts"   label="Do you have thoughts of suicide?"    options={['Yes', 'No']} />
          <Field       name="suicide_thoughts_freq"  label="If yes — how often?"                placeholder="e.g. Rarely / Daily" />
          <SelectField name="attempted_suicide"      label="Have you ever attempted suicide?"    options={['Yes', 'No']} />
          <Field       name="suicide_attempt_when"   label="If yes — when?"                     placeholder="Approximate date" />
          <SelectField name="self_harms"             label="Do you self-harm?"                   options={['Yes', 'No']} />
          <Field       name="self_harm_when"         label="If yes — when?"                     placeholder="Most recent episode" />
          <Field       name="self_harm_how"          label="How?"                               placeholder="Method..." />
          <Field       name="self_harm_where"        label="Where?"                             placeholder="Location..." />
        </Section>

        <Section title="5.0  Mental Health">
          <SelectField name="has_mh_concerns"        label="Do you have mental health concerns?"        options={['Yes', 'No']} />
          <Field       name="mh_details"             label="If yes — details (e.g. Depression)"         textarea />
          <SelectField name="mh_diagnosed"           label="Have you been diagnosed with a mental health condition?" options={['Yes', 'No']} />
          <Field       name="mh_diagnoser"           label="Name/position of person responsible for diagnosis" placeholder="e.g. Dr Smith — CMHT" />
          <Field       name="mh_prescribed_meds"     label="Prescribed Medication"                       placeholder="Medication name(s)" />
          <Field       name="mh_dosage"              label="Dosage of Medication"                        placeholder="e.g. 50mg daily" />
          <Field       name="mh_prescribed_by"       label="Medication Prescribed By"                    placeholder="GP / Psychiatrist name" />
        </Section>

        <Section title="6.0  Previous Housing">
          <SelectField name="lived_alone_before"     label="Have you ever lived alone before?"           options={['Yes', 'No']} />
          <Field       name="lived_alone_when"       label="If yes — when?"                              placeholder="Year(s)" />
          <Field       name="lived_alone_duration"   label="For how long?"                               placeholder="e.g. 6 months" />
        </Section>

        <Section title="7.0  Benefits">
          <Field name="benefits_claimed" label="Benefits Currently Claimed (tick all that apply)"
            textarea placeholder="ESA / DLA / JSA / Universal Credit / Housing Benefit / Other..." />
        </Section>

        <Section title="8.0  Legal Status">
          <SelectField name="on_drr"              label="Subject to DRR Order?"       options={['Yes', 'No']} />
          <SelectField name="on_probation"        label="Subject to Probation?"       options={['Yes', 'No']} />
          <SelectField name="has_injunction"      label="Subject to Injunction?"      options={['Yes', 'No']} />
          <SelectField name="been_to_prison"      label="Have you been to prison?"    options={['Yes', 'No']} />
          <Field name="prison_when_where"         label="If yes — when and which prison?" textarea />
          <Field name="prison_reason"             label="Reason for Prison Sentence"  textarea />
          <Field name="prison_release_date"       label="Last Date of Release"        type="date" />
          <SelectField name="related_conditions"  label="Related under any conditions?" options={['Yes', 'No']} />
          <Field name="conditions_details"        label="If yes — what conditions?"   textarea />
          <Field name="conditions_end_date"       label="End Date of Conditions"      type="date" />
        </Section>

        <Section title="9.0  Support Plan — Agreed Needs">
          <Field name="economic_wellbeing_needs"   label="Achieve Economic Wellbeing — agreed needs & actions"  textarea placeholder="Benefits maximised, bank account, budget plan, debt management..." />
          <Field name="enjoy_achieve_needs"        label="Enjoy & Achieve — agreed needs & actions"             textarea placeholder="Employment, training, education, volunteering, leisure activities..." />
          <Field name="stay_safe_needs"            label="Stay Safe — agreed needs & actions"                   textarea placeholder="Maintain accommodation, minimise risk of harm, develop living skills..." />
          <Field name="be_healthy_needs"           label="Be Healthy — agreed needs & actions"                  textarea placeholder="GP, dentist, physical health, mental health, substance misuse..." />
          <Field name="positive_contribution_needs" label="Making a Positive Contribution — agreed needs"       textarea placeholder="Anti-social behaviour, statutory orders, positive social networks..." />
          <Field name="additional_support_needs"   label="Additional Support Needs Requested by Client"         textarea />
          <Field name="assigned_worker"            label="Assigned Key Worker"                                  placeholder="Full name" defaultValue={t?.assigned_worker_id ?? ''} />
          <Field name="review_date"                label="Review Date"                                          type="date" />
        </Section>
      </>
    ),

    risk: (
      <>
        <Section title="1.0  Referral Details">
          <Field name="assessment_date"       label="Date of Assessment"                    type="date" />
          <Field name="assessor_name"         label="Name of Person Undertaking Assessment" placeholder="Full name" />
          <Field name="assessor_phone"        label="Telephone Number"                      placeholder="+44 7000 000000" />
          <Field name="preferred_area"        label="Preferred Area"                        placeholder="e.g. Birmingham City Centre" />
        </Section>

        <Section title="2.0  Applicant Details">
          <SelectField name="title"           label="Preferred Title"                       options={['Mr', 'Miss', 'Mrs', 'Ms', 'Other']} defaultValue={t?.title ?? ''} />
          <Field name="surname"               label="Surname"                               defaultValue={t?.full_name?.split(' ').slice(-1)[0] ?? ''} />
          <Field name="first_names"           label="First Name(s)"                         defaultValue={t?.full_name?.split(' ').slice(0, -1).join(' ') ?? ''} />
          <Field name="other_names"           label="Other Names Known As"                  placeholder="Aliases or maiden name" />
          <Field name="dob"                   label="Date of Birth"                         type="date" defaultValue={t?.dob ?? ''} />
          <Field name="place_of_birth"        label="Place of Birth"                        defaultValue={t?.place_of_birth ?? ''} />
          <Field name="previous_address"      label="Previous Address (where have you been living/staying)" textarea />
          <Field name="postcode"              label="Postcode"                              placeholder="B1 2AB" />
          <Field name="home_phone"            label="Home Telephone No."                   placeholder="+44 121 000 0000" />
          <Field name="mobile"                label="Mobile Tel No."                        defaultValue={t?.mobile ?? ''} />
          <Field name="work_phone"            label="Work Telephone No."                   placeholder="If applicable" />
          <Field name="nino"                  label="National Insurance No."                mono defaultValue={t?.nino ?? ''} />
          <SelectField name="gender"          label="Gender"                               options={['Male', 'Female', 'Non-Binary', 'Prefer not to say']} />
          <SelectField name="marital_status"  label="Marital Status"                       options={['Single', 'Married', 'Divorced', 'Widowed', 'Separated', 'Civil Partnership']} defaultValue={t?.marital_status ?? ''} />
          <Field name="homelessness_reason"   label="Current Situation / Reason for Homelessness" textarea placeholder="Describe the circumstances leading to this referral..." />
        </Section>

        <Section title="3.0  Diversity Monitoring">
          <SelectField name="ethnic_origin"   label="Ethnic Origin" options={[
            'White: British', 'White: Irish', 'White: Other',
            'Mixed: White & Black Caribbean', 'Mixed: White & Black African', 'Mixed: White & Asian', 'Mixed: Other',
            'Asian/Asian British: Indian', 'Asian/Asian British: Pakistani', 'Asian/Asian British: Bangladeshi', 'Asian/Asian British: Other',
            'Black/Black British: African', 'Black/Black British: Caribbean', 'Black/Black British: Other',
            'Chinese/Other Ethnic Group', 'Refuse to say',
          ]} />
          <SelectField name="religion"        label="Religion" options={[
            'No religion / Atheist', 'Muslim', 'Christian (all denominations)', 'Sikh', 'Buddhist', 'Hindu', 'Jewish', 'Other', 'Prefer not to say',
          ]} />
          <SelectField name="sexual_orientation" label="Sexual Orientation" options={[
            'Heterosexual', 'Homosexual', 'Lesbian', 'Bisexual', 'Trans Gender', 'Other', 'Prefer not to say',
          ]} />
          <Field name="communication_needs"   label="Communication Needs (tick all that apply)"  textarea placeholder="Large Print / Braille / Audiotape / Translation / Interpreter / BSL / Easy Read / Pictures & Symbols..." />
        </Section>

        <Section title="4.0  Medical & Additional Support">
          <Field name="medical_info"          label="Details of Any Disabilities / Illnesses"    textarea placeholder="Physical or mental health conditions..." />
          <Field name="social_worker"         label="Social Worker Name & Contact"               placeholder="Name, address, phone" />
          <Field name="cpn"                   label="CPN (Community Psychiatric Nurse)"          placeholder="Name, address, phone" />
          <Field name="probation_officer"     label="Probation Officer Name & Contact"           placeholder="Name, address, phone" defaultValue={t?.probation_officer ?? ''} />
          <Field name="psychiatrist"          label="Psychiatrist / Psychologist Name & Contact" placeholder="Name, address, phone" />
        </Section>

        <Section title="5.0  Financial Information">
          <Field name="income_sources"        label="Source(s) of Income / Benefits Claimed"     textarea placeholder="List all benefits and income sources..." defaultValue={t?.benefit_type ?? ''} />
          <Field name="total_income"          label="Total Amount Received (£)"                  type="number" placeholder="0.00" defaultValue={t?.benefit_amount != null ? String(t.benefit_amount) : ''} />
          <SelectField name="income_freq"     label="How Often"                                  options={['Daily', 'Weekly', 'Fortnightly', 'Monthly']} defaultValue={t?.benefit_freq ?? ''} />
        </Section>

        <Section title="6.0  Criminal Record">
          <SelectField name="has_criminal_record" label="Have you ever been convicted or have pending court appearances?" options={['Yes', 'No']} />
          <Field name="criminal_record_details"   label="If yes — Nature of Offence, Date, Sentence"  textarea placeholder="List all offences with dates and sentences..." />
        </Section>

        <Section title="7.0  Reason for Requiring Supported Housing (tick at least 5)">
          <Field name="support_needs_checklist" label="Tick all that apply — minimum 5 required" textarea
            placeholder="Tenancy failure / losing accommodation · Ongoing drug/alcohol issues · Rough Sleeping · Becoming homeless (within 28 days) · Risk of self-harm · Mental health · Domestic abuse · Risk of offending · Deteriorating financial position · Unplanned hospital admissions · Risk of long-term worklessness · Developing household skills · Ability to manage health & wellbeing · Increased confidence · Increased knowledge · Other..." />
        </Section>

        <Section title="8.0  Risk Assessment — Potential Risk Areas">
          <Field name="risk_areas_details" label="For each risk area, indicate Yes or No and provide details" textarea
            placeholder="1. Violence/Aggression: · 2. Known associates: · 3. Hazards from others: · 4. Recent discontinuation of medication: · 5. Attempted suicide: · 6. Arson: · 7. Violent ideas/acts: · 8. Harm to self/others: · 9. Criminal/police involvement: · 10. Substance abuse/alcohol misuse: · 11. Mental Health: · 12. Sex Offences: · 13. Domestic Abuse: · 14. Extreme anger and hostility: · 15. Other:" />
          <SelectField name="overall_risk_severity" label="Overall Risk Severity"           options={['Low', 'Medium', 'High', 'Critical']} />
          <Field name="risk_mitigation"             label="Mitigation Actions & Support Plan" textarea placeholder="Agreed actions with support worker..." />
        </Section>

        <Section title="9.0  Interim Risk Review">
          <Field name="review_date"               label="Date of Review"                    type="date" />
          <Field name="interim_risk_details"      label="Risk Areas Update (20 categories)" textarea
            placeholder="1. Violence/aggression: · 2. Known associates: · 3. Hazards from friends/family/visitors: · 4. Recent discontinuation of medication: · 5. Professional boundaries: · 6. Finance/gambling/debt: · 7. Attempted suicide: · 8. Arson: · 9. Violent ideas/acts: · 10. Substance abuse/alcohol misuse: · 11. Harm to self/others: · 12. Criminal/police involvement: · 13. Offending behaviour: · 14. Anti-social behaviour: · 15. Physical Health: · 16. Mental Health: · 17. Sex Offences: · 18. Domestic Abuse: · 19. Extreme anger/hostility: · 20. Other:" />
          <Field name="support_worker_name"       label="Support Worker Name"               placeholder="Full name" />
          <Field name="support_worker_sign_date"  label="Sign-Off Date"                     type="date" />
        </Section>
      </>
    ),

    missing: (
      <>
        <Section title="1.0  Physical Description">
          <Field name="height"                label="Height"                           placeholder="e.g. 5ft 10in / 178cm" />
          <Field name="shoe_size"             label="Shoe Size"                        placeholder="e.g. UK 9" />
          <Field name="clothing_size"         label="Clothing Size"                    placeholder="e.g. Medium / 34W" />
          <Field name="build"                 label="Build"                            placeholder="e.g. Small, Medium, Large" />
          <SelectField name="ethnicity"       label="Ethnicity"                        options={['Asian / Asian British', 'Black / Black British', 'White British', 'White Other', 'Mixed / Multiple', 'Other Ethnic Group', 'Prefer not to say']} />
          <Field name="skin_tone"             label="Skin Tone"                        placeholder="e.g. Light, Medium, Dark" />
          <Field name="hair_colour"           label="Hair Colour"                      placeholder="e.g. Black, short" />
          <Field name="eye_colour"            label="Eye Colour"                       placeholder="e.g. Brown" />
          <Field name="distinguishing_marks"  label="Distinguishing Marks (tattoos, birthmarks, scars)" textarea placeholder="Describe any tattoos, birthmarks, scars or other identifying features..." defaultValue={t?.physical_description ?? ''} />
        </Section>
        <Section title="2.0  Employment & Education">
          <Field name="employer_or_college"   label="Employer / College Name & Address" textarea placeholder="Name, address, contact number, position held, subject studied, hours attended..." defaultValue={t?.employer_or_college ?? ''} />
        </Section>
        <Section title="3.0  Vehicle Details">
          <Field name="vehicle_details"       label="Vehicle Details (colour, make, registration)" textarea placeholder="e.g. Black Ford Focus — AB12 CDE" defaultValue={t?.vehicle_registration ?? ''} />
        </Section>
        <Section title="4.0  Risk & Whereabouts">
          <Field name="potential_risks"       label="Details of Any Potential Risk"    textarea placeholder="Describe any known risks..." />
          <Field name="areas_likely_to_visit" label="Areas / Destinations Likely to Visit" textarea placeholder="List areas or addresses the person may travel to..." />
        </Section>
        <Section title="5.0  Authority Signature">
          <Field name="authorising_officer"   label="Authorising Officer"              placeholder="Full name and role" />
          <Field name="date_reported"         label="Date Reported"                    type="date" />
        </Section>
      </>
    ),

    service: (
      <Section title="1.0  Service Charge Agreement">
        <Field       name="weekly_rate"            label="Weekly Rate (£)"      type="number" placeholder="150.00" />
        <SelectField name="payment_method"         label="Payment Method"       options={['Cash', 'Bank Transfer', 'Housing Benefit Direct', 'Standing Order']} />
        <Field       name="agreement_start_date"   label="Agreement Start Date" type="date" />
        <Field       name="tenant_acknowledgement" label="Tenant Acknowledgement" textarea placeholder="I agree to pay the weekly service charge of £___ per week…" />
      </Section>
    ),

    privacy: (
      <Section title="1.0  Confidentiality Waiver">
        <div className="col-span-2 text-xs text-slate-600 leading-relaxed border border-slate-200 rounded-lg p-4 bg-slate-50">
          I, the undersigned, hereby authorise Ash Shahada Housing Association Ltd and its staff to share
          relevant information about my case with partner agencies, including but not limited to Birmingham
          City Council, probation services, and healthcare providers, where this is necessary for the
          delivery of housing support services. I understand my rights under the Data Protection Act 2018
          and the UK GDPR.
        </div>
        {t?.confidentiality_signed && (
          <div className="col-span-2 flex items-center gap-2 px-3 py-2 bg-emerald-50 border border-emerald-200 rounded-lg">
            <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0" />
            <span className="text-xs text-emerald-700 font-semibold">
              Signed on {t.confidentiality_signed_at
                ? new Date(t.confidentiality_signed_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
                : 'record'}
            </span>
          </div>
        )}
        <Field name="resident_name"      label="Resident Full Name"          placeholder="Print name clearly"                 defaultValue={t?.full_name ?? ''} />
        <Field name="resident_signature" label="Resident Signature"          placeholder="Digital signature or print name" />
        <Field name="date"               label="Date"                        type="date" />
        <Field name="witness_name"       label="Witness: Ahsan Rehman"       placeholder="Authorised signatory — ASHA" />
        <Field name="witness_date"       label="Witness Date"                type="date" />
      </Section>
    ),

    agreement: (
      <>
        <Section title="1.0  Parties">
          <Field name="agreement_date"         label="Agreement Date"               type="date" />
          <Field name="tenant_name"            label="Tenant Full Name"             defaultValue={t?.full_name ?? ''} />
          <Field name="property_address"       label="Property Address"             defaultValue={t?.room_number ?? ''} placeholder="Room / property address" />
          <Field name="support_worker_name"    label="Support Worker Name"          placeholder="Full name" />
          <Field name="support_worker_contact" label="Support Worker Contact"       placeholder="07849634272" />
        </Section>
        <Section title="2.0  Support Goals">
          <Field name="agreed_goals"           label="Agreed Support Goals"         textarea placeholder="Outline the key support goals agreed between tenant and worker…" />
          <Field name="review_frequency"       label="Review Frequency"             placeholder="e.g. Weekly / Fortnightly / Monthly" />
          <Field name="review_date"            label="Next Review Date"             type="date" />
        </Section>
        <Section title="3.0  Responsibilities">
          <Field name="tenant_responsibilities"  label="Tenant Responsibilities"    textarea placeholder="e.g. Attend all scheduled support meetings, report concerns to key worker…" />
          <Field name="worker_responsibilities"  label="Support Worker Responsibilities" textarea placeholder="e.g. Provide weekly key-work sessions, assist with benefit claims…" />
        </Section>
        <Section title="4.0  Signatures">
          <Field name="tenant_signature"       label="Tenant Signature"             placeholder="Print name or digital signature" />
          <Field name="tenant_sig_date"        label="Date"                         type="date" />
          <Field name="worker_signature"       label="Support Worker Signature"     placeholder="Print name or digital signature" />
          <Field name="worker_sig_date"        label="Date"                         type="date" />
        </Section>
      </>
    ),

    induction: (
      <>
        <Section title="1.0  Tenant Details">
          <Field name="tenant_name"            label="Tenant Full Name"             defaultValue={t?.full_name ?? ''} />
          <Field name="property_address"       label="Property Address"             defaultValue={t?.room_number ?? ''} placeholder="Room / property address" />
          <Field name="tenancy_start_date"     label="Tenancy Start Date"           type="date" />
          <Field name="key_worker"             label="Key Worker Name"              placeholder="Support worker conducting induction" />
        </Section>
        <Section title="2.0  Induction Checklist">
          {([
            'Tour of the property and room',
            'Keys, fobs and access codes issued',
            'Fire evacuation procedure explained',
            'Emergency contact numbers provided',
            'House rules and expectations explained',
            'Rent and service charge explained',
            'Housing Benefit claim started',
            'Support plan discussed and agreed',
            'Weekly key-work session scheduled',
            'GP registration (or referral to local GP)',
            'Mental health / substance misuse referral (if required)',
            'Universal Credit / DWP benefits check',
            'ID documents recorded',
            'Bank account / financial needs assessed',
            'Data protection and confidentiality explained',
            'Complaints procedure explained',
            'Internet and communal facilities explained',
            'Kitchen and laundry facilities shown',
            'Visitor and overnight stay policy explained',
            'Tenant handbook issued and reviewed',
          ] as const).map((item, i) => (
            <div key={i} className="col-span-2 grid grid-cols-[1fr_120px_120px] gap-4 items-end border-b border-slate-100 pb-2">
              <label className="text-xs text-navy font-medium">{i + 1}. {item}</label>
              <Field name={`checklist_date_${i}`}   label="Date"          type="date" />
              <Field name={`checklist_staff_${i}`}  label="Staff Initials" placeholder="Initials" />
            </div>
          ))}
        </Section>
        <Section title="3.0  Sign-Off">
          <Field name="print_name"        label="Tenant Print Name"            placeholder="Print clearly" />
          <Field name="tenant_signature"  label="Tenant Signature"             placeholder="Signature or printed name" />
          <Field name="sign_off_date"     label="Date"                         type="date" />
          <Field name="worker_signature"  label="Support Worker Signature"     placeholder="Signature or printed name" />
          <Field name="worker_sig_date"   label="Date"                         type="date" />
        </Section>
      </>
    ),
  };
}

// ── Form title map ────────────────────────────────────────────────────────────

const FORM_TITLES: Record<FormId, string> = {
  personal:   'Personal Details',
  housing:    'Housing Benefit Claim',
  assessment: 'Initial Assessment',
  risk:       'Risk Assessment & Support Plan',
  missing:    'Missing Person Form',
  service:    'Service Charge Agreement',
  privacy:    'Confidentiality Waiver',
  agreement:  'Support Agreement',
  induction:  'Tenant Induction Checklist',
  'ai-brain': 'AI Brain',
};

// ── Main component ────────────────────────────────────────────────────────────

interface Props {
  brand: Brand;
  activeForm: FormId;
  activeTenant: string;
  activeTenantObj?: DbTenant | null;
  workerId?: string;
  onSaved?: () => void;
}

type SaveStatus = 'idle' | 'saving' | 'saved' | 'error';

export default function FormWorkspace({
  brand,
  activeForm,
  activeTenant,
  activeTenantObj,
  workerId,
  onSaved,
}: Props) {
  const lh = LETTERHEAD[brand];
  const today = new Date().toLocaleDateString('en-GB', {
    day: 'numeric', month: 'long', year: 'numeric',
  });

  const formRef = useRef<HTMLFormElement>(null);
  const [status, setStatus]     = useState<SaveStatus>('idle');
  const [errMsg, setErrMsg]     = useState('');

  const handleSave = useCallback(async (stamp: boolean) => {
    if (!activeTenantObj) return;
    if (!formRef.current) return;

    const raw = new FormData(formRef.current);
    const data: Record<string, string> = {};
    raw.forEach((val, key) => { data[key] = String(val); });

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
      setTimeout(() => setStatus('idle'), 3000);
      onSaved?.();
    } catch (e: unknown) {
      setErrMsg(e instanceof Error ? e.message : 'Save failed');
      setStatus('error');
      setTimeout(() => setStatus('idle'), 5000);
    }
  }, [activeForm, activeTenantObj, onSaved]);

  // ── AI Brain gets its own full-height panel ───────────────────────────────

  if (activeForm === 'ai-brain') {
    return (
      <main className="flex-1 overflow-hidden bg-white">
        {activeTenantObj && workerId ? (
          <AIBrainPanel tenant={activeTenantObj} workerId={workerId} />
        ) : (
          <div className="flex items-center justify-center h-full text-slate-400 text-sm">
            Select a tenant to use the AI Brain.
          </div>
        )}
      </main>
    );
  }

  const formSections = buildFormSections(activeTenantObj);

  return (
    <main className="form-workspace flex-1 overflow-y-auto bg-cream px-8 py-6" data-brand={brand}>
      <div
        className="max-w-3xl mx-auto bg-white shadow-lg rounded-sm border border-slate-200
                   min-h-[1056px] p-12 relative"
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
              {lh.formRef}-{String(Math.floor(Math.random() * 90) + 10).padStart(2, '0')}
            </p>
            <p className="text-xs font-medium text-slate-600 mt-0.5">{today}</p>
            <p className="text-xxs text-slate-400 mt-0.5">
              Resident: <span className="text-navy font-semibold">{activeTenant}</span>
            </p>
          </div>
        </div>

        {/* ── Form title ── */}
        <div className="mb-8">
          <div className="brand-badge inline-block text-xxs font-black uppercase tracking-widest px-2 py-1 rounded mb-3">
            {FORM_TITLES[activeForm]}
          </div>
          <p className="text-xxs text-slate-400">
            All fields are recorded and blockchain-stamped upon save. Corrections must be
            made by a Manager or Support Worker — the original entry is preserved in the
            audit trail.
          </p>
        </div>

        {/* ── No tenant selected guard ── */}
        {!activeTenantObj ? (
          <div className="flex items-center justify-center py-20">
            <p className="text-slate-400 text-sm">Select a tenant from the list to load this form.</p>
          </div>
        ) : (
          /* key forces remount (and defaultValue reset) when tenant or form changes */
          <form
            key={`${activeTenantObj.id}-${activeForm}`}
            ref={formRef}
            onSubmit={(e) => { e.preventDefault(); handleSave(true); }}
          >
            {formSections[activeForm]}
          </form>
        )}

        {/* ── Status bar ── */}
        {status !== 'idle' && (
          <div className={`absolute bottom-24 left-12 right-12 flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold
            ${status === 'saved' ? 'bg-emerald-50 border border-emerald-200 text-emerald-700' : ''}
            ${status === 'saving' ? 'bg-amber/10 border border-amber/30 text-amber-dark' : ''}
            ${status === 'error' ? 'bg-red-50 border border-red-200 text-red-600' : ''}`}
          >
            {status === 'saving' && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            {status === 'saved'  && <CheckCircle2 className="w-3.5 h-3.5" />}
            {status === 'error'  && <AlertCircle className="w-3.5 h-3.5" />}
            {status === 'saving' && 'Saving…'}
            {status === 'saved'  && 'Saved and blockchain-stamped.'}
            {status === 'error'  && (errMsg || 'Save failed — try again.')}
          </div>
        )}

        {/* ── Footer actions ── */}
        <div className="absolute bottom-10 right-12 flex items-center gap-3">
          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-navy/5 border border-navy/10 rounded-lg">
            <Link className="w-3 h-3 text-slate-400" />
            <span className="font-mono text-xxs text-slate-400 tracking-widest">
              SHA-256 · {status === 'saved' ? 'stamped' : 'pending'}
            </span>
          </div>

          <button
            type="button"
            onClick={() => handleSave(false)}
            disabled={!activeTenantObj || status === 'saving'}
            className="flex items-center gap-2 border border-slate-300 text-slate-600
                       px-4 py-2 rounded-lg text-xs font-bold hover:bg-slate-50 transition-colors
                       disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <Save className="w-3.5 h-3.5" />
            Save Draft
          </button>

          <button
            type="button"
            onClick={() => handleSave(true)}
            disabled={!activeTenantObj || status === 'saving'}
            className="brand-btn flex items-center gap-2 text-white px-4 py-2 rounded-lg
                       text-xs font-bold transition-colors
                       disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {status === 'saving'
              ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
              : null}
            Save &amp; Stamp
          </button>
        </div>
      </div>
    </main>
  );
}
