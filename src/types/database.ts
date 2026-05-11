// Auto-typed from supabase/schema.sql
// Update by running: npx supabase gen types typescript --local > src/types/database.ts

export type UserRole     = 'Manager' | 'SupportWorker' | 'Tenant';
export type Brand        = 'mattys_place' | 'ash_shahada' | 'reliance';
export type EntryMethod  = 'manual' | 'ocr' | 'voice';
export type AuditAction  = 'CREATE' | 'EDIT' | 'VERIFY' | 'SIGN' | 'EXPORT' | 'DELETE_REQUEST' | 'LOGIN' | 'PRINT';
export type SessionType  = 'daily' | 'weekly' | 'monthly' | 'ad_hoc';
export type TenantStatus = 'active' | 'inactive' | 'evicted' | 'moved_out' | 'missing';
export type RiskLevel    = 'Low' | 'Medium' | 'High' | 'Critical';
export type TitleType    = 'Mr' | 'Mrs' | 'Ms' | 'Miss' | 'Dr' | 'Other';
export type MaritalStatus = 'Single' | 'Married' | 'Divorced' | 'Widowed' | 'Separated' | 'Civil Partnership';
export type PaymentMethod = 'Cash' | 'Bank Transfer' | 'Housing Benefit Direct' | 'Standing Order';

// ── Row types (what comes back from SELECT) ───────────────────────────────────

export interface DbUser {
  id:          string;
  auth_id:     string | null;
  full_name:   string;
  email:       string;
  role:        UserRole;
  brand:       Brand;
  is_active:   boolean;
  phone:       string | null;
  created_at:  string;
  updated_at:  string;
}

export interface DbTenant {
  id:                      string;
  title:                   TitleType;
  full_name:               string;
  dob:                     string;
  nino:                    string;
  nationality:             string;
  date_entry_uk:           string | null;
  address:                 string;
  room_number:             string;
  email:                   string | null;
  mobile:                  string;
  languages:               string | null;
  benefit_type:            string;
  benefit_freq:            string;
  benefit_amount:          number;
  nok_name:                string;
  nok_relation:            string;
  nok_phone:               string;
  nok_address:             string | null;
  doctor:                  string | null;
  place_of_birth:          string | null;
  marital_status:          MaritalStatus | null;
  employer_or_college:     string | null;
  vehicle_registration:    string | null;
  physical_description:    string | null;
  moved_in:                string;
  brand:                   Brand;
  assigned_worker_id:      string | null;
  status:                  TenantStatus;
  on_probation:            boolean;
  probation_officer:       string | null;
  photo_url:               string | null;
  confidentiality_signed:  boolean;
  confidentiality_signed_at: string | null;
  auth_id:                 string | null;
  created_by:              string;
  created_at:              string;
  updated_at:              string;
}

export interface DbSession {
  id:                      string;
  tenant_id:               string;
  worker_id:               string;
  session_type:            SessionType;
  session_date:            string;
  started_at:              string | null;
  ended_at:                string | null;
  notes:                   string | null;
  entry_method:            EntryMethod;
  voice_transcript:        string | null;
  ocr_source_url:          string | null;
  ai_questions_generated:  Record<string, unknown> | null;
  ai_summary:              string | null;
  ai_risk_flag:            boolean;
  ai_risk_note:            string | null;
  checklist_items:         string[] | null;
  blockchain_hash:         string;
  is_signed:               boolean;
  created_at:              string;
  updated_at:              string;
}

export interface DbServiceCharge {
  id:             string;
  tenant_id:      string;
  weekly_rate:    number;
  payment_method: PaymentMethod;
  effective_from: string;
  effective_to:   string | null;
  period_start:   string;
  period_end:     string;
  amount_due:     number;
  amount_paid:    number;
  is_paid:        boolean;
  paid_at:        string | null;
  payment_ref:    string | null;
  notes:          string | null;
  recorded_by:    string;
  created_at:     string;
  updated_at:     string;
}

export interface DbAuditLog {
  id:               string;
  actor_id:         string;
  actor_name:       string;
  actor_role:       UserRole;
  tenant_id:        string | null;
  table_name:       string;
  record_id:        string;
  action:           AuditAction;
  entry_method:     EntryMethod;
  old_data:         Record<string, unknown> | null;
  new_data:         Record<string, unknown> | null;
  diff_fields:      string[] | null;
  payload_hash:     string;
  blockchain_tx_id: string | null;
  verified_at:      string | null;
  stamped_at:       string;
}

export interface DbTenantVerification {
  id:                  string;
  tenant_id:           string;
  verified_by_tenant:  boolean;
  verification_type:   string;
  signature_data:      string | null;
  signed_at:           string | null;
  witness_id:          string | null;
  witness_name:        string | null;
  blockchain_hash:     string;
  blockchain_tx_id:    string | null;
  created_at:          string;
}

// ── Insert types (what you send on INSERT) ────────────────────────────────────

export type InsertTenant = Omit<DbTenant,
  'id' | 'created_at' | 'updated_at' | 'blockchain_hash' | 'confidentiality_signed_at'
>;

export type InsertSession = Omit<DbSession,
  'id' | 'created_at' | 'updated_at' | 'blockchain_hash'
>;

export type InsertServiceCharge = Omit<DbServiceCharge,
  'id' | 'created_at' | 'updated_at'
>;

// ── Auth session user (decoded from JWT) ──────────────────────────────────────

export interface AuthUser {
  id:        string;   // auth.users.id
  email:     string;
  dbUser:    DbUser;   // joined from users table
}
