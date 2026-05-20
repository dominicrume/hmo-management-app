// EU AI Act compliance — risk classification and human oversight rules.
//
// This application processes data about vulnerable people (supported housing tenants)
// to inform housing, welfare, and safeguarding decisions. Under EU AI Act Annex III
// it may qualify as HIGH RISK (category 8: social protection, essential services).
//
// Key obligations for high-risk AI systems:
//   Art. 9  — Risk management system
//   Art. 10 — Data governance
//   Art. 13 — Transparency and information provision
//   Art. 14 — Human oversight
//   Art. 15 — Accuracy, robustness, cybersecurity

export type AIRiskClass = 'minimal' | 'limited' | 'high' | 'unacceptable';

export interface AIRiskProfile {
  classification: AIRiskClass;
  rationale:      string;
  requiresHumanApproval: boolean;
  maxAutoAction:  string;      // what the AI is allowed to do without approval
  disclosureRequired: boolean; // must the subject be told AI was used?
}

// Risk classification per task type
// Based on EU AI Act Annex III and UK ICO AI guidance
const TASK_RISK_MAP: Record<string, AIRiskProfile> = {
  brain: {
    classification:        'high',
    rationale:             'AI analyses vulnerable individuals\' personal data to inform housing and safeguarding decisions. Annex III category 8 (social protection services).',
    requiresHumanApproval: true,
    maxAutoAction:         'Generate summary text for human review. Cannot trigger eviction, referral, or benefit action without manager approval.',
    disclosureRequired:    true,
  },
  questions: {
    classification:        'limited',
    rationale:             'AI generates session questions for human support workers to use at their discretion. Low risk of direct harm.',
    requiresHumanApproval: false,
    maxAutoAction:         'Generate question suggestions. Worker chooses which to ask.',
    disclosureRequired:    false,
  },
  extract: {
    classification:        'limited',
    rationale:             'AI extracts structured data from voice transcripts. Human reviews and corrects before saving.',
    requiresHumanApproval: false,
    maxAutoAction:         'Pre-populate form fields. Human confirms before save.',
    disclosureRequired:    false,
  },
  ocr: {
    classification:        'minimal',
    rationale:             'Document text extraction only. No decision-making capability.',
    requiresHumanApproval: false,
    maxAutoAction:         'Extract text for human review.',
    disclosureRequired:    false,
  },
};

export function classifyAIRisk(taskType: string): AIRiskProfile {
  return TASK_RISK_MAP[taskType] ?? {
    classification:        'high',
    rationale:             'Unknown task type — applying maximum caution.',
    requiresHumanApproval: true,
    maxAutoAction:         'None — all outputs require human review.',
    disclosureRequired:    true,
  };
}

// Severity levels that ALWAYS require human approval before any action
export const REQUIRES_APPROVAL_SEVERITY = new Set(['high', 'critical']);

export function requiresHumanApproval(taskType: string, riskSeverity?: string): boolean {
  const profile = classifyAIRisk(taskType);
  if (profile.requiresHumanApproval) return true;
  if (riskSeverity && REQUIRES_APPROVAL_SEVERITY.has(riskSeverity)) return true;
  return false;
}

// Data processing manifest — Art. 30 record of processing activities
export const PROCESSING_MANIFEST = {
  controller:       'Ash Shahada Housing Association Ltd',
  dpo_contact:      'dpo@ashsh.org.uk',
  purposes: [
    {
      purpose:      'HMO tenancy management',
      lawful_basis: 'Contract (Art. 6(1)(b)) + Legitimate interest (Art. 6(1)(f))',
      data_types:   ['identity', 'financial', 'housing', 'health (AI-inferred risk only)'],
      retention:    '7 years from end of tenancy',
    },
    {
      purpose:      'AI-assisted safeguarding',
      lawful_basis: 'Vital interests (Art. 6(1)(d)) + Substantial public interest (Art. 9(2)(g))',
      data_types:   ['session_notes', 'risk_flags', 'ai_analysis'],
      retention:    '2 years',
      ai_system:    'Claude Sonnet 4.6 (Anthropic) + GPT-4o-mini (OpenAI)',
      ai_risk_class: 'HIGH — human oversight required for all consequential outputs',
    },
    {
      purpose:      'System security and fraud prevention',
      lawful_basis: 'Legitimate interest (Art. 6(1)(f))',
      data_types:   ['api_metrics', 'system_logs', 'audit_trails'],
      retention:    '90–180 days',
    },
  ],
  third_parties: [
    { name: 'Supabase Inc',   role: 'Data processor', location: 'EU (Frankfurt)', dpa: true },
    { name: 'Anthropic PBC',  role: 'AI processor',   location: 'USA',            dpa: true },
    { name: 'OpenAI LLC',     role: 'AI processor',   location: 'USA',            dpa: true },
    { name: 'Vercel Inc',     role: 'Hosting',        location: 'USA',            dpa: true },
    { name: 'Polygon Network',role: 'Blockchain audit', location: 'Decentralised', dpa: false },
  ],
  last_reviewed: '2026-05-20',
} as const;
