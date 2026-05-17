// ── UI primitives ──────────────────────────────────────────
export * from './ui';

// ── Navigation ─────────────────────────────────────────────
export { Navbar }  from './navbar';
export { Sidebar } from './sidebar';
export type { SidebarView } from './sidebar';

// ── Cards ──────────────────────────────────────────────────
export * from './cards';

// ── Tables ─────────────────────────────────────────────────
export * from './tables';

// ── Modals ─────────────────────────────────────────────────
export * from './modals';

// ── Forms (Form01–Form08) ──────────────────────────────────
export { default as Form01IntakeChecklist }    from './forms/Form01IntakeChecklist';
export { default as Form02SupportChecklist }   from './forms/Form02SupportChecklist';
export { default as Form03PersonalDetails }    from './forms/Form03PersonalDetails';
export { default as Form04MissingPerson }      from './forms/Form04MissingPerson';
export { default as Form05ConfidentialityWaiver } from './forms/Form05ConfidentialityWaiver';
export { default as Form06ServiceCharge }      from './forms/Form06ServiceCharge';
export { default as Form07RiskAssessment }     from './forms/Form07RiskAssessment';
export { default as Form08SupportPlan }        from './forms/Form08SupportPlan';

// ── Layout ─────────────────────────────────────────────────
export { default as FormWorkspace }      from './layout/FormWorkspace';
export { default as FormsPanel }         from './layout/FormsPanel';
export { default as LetterheadSwitcher } from './layout/LetterheadSwitcher';
