// Auto-typed from supabase/schema.sql
// Update by running: npx supabase gen types typescript --local > src/types/database.ts

export type UserRole     = 'Manager' | 'SupportWorker' | 'Tenant';
export type Brand        = 'mattys_place' | 'ash_shahada' | 'reliance';
export type EntryMethod  = 'manual' | 'ocr' | 'voice';
export type AuditAction  = 'CREATE' | 'EDIT' | 'VERIFY' | 'SIGN' | 'EXPORT' | 'DELETE' | 'DELETE_REQUEST' | 'LOGIN' | 'PRINT';
export type SessionType  = 'daily' | 'weekly' | 'monthly' | 'ad_hoc';
export type BenefitType  = 'UC' | 'HB' | 'PIP' | 'ESA' | 'JSA' | 'None' | 'Other';
export type BenefitFreq  = 'Monthly' | '2wk' | 'Weekly';
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
  benefit_type:            BenefitType;
  benefit_freq:            BenefitFreq;
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

// ── V2 Enum Types ─────────────────────────────────────────────────────────────

export type PropertyType    = 'HMO' | 'Supported' | 'Semi-Independent' | 'Hostel';
export type RoomStatus      = 'available' | 'occupied' | 'maintenance' | 'reserved';
export type AgreementStatus = 'active' | 'expired' | 'terminated' | 'pending';
export type DocCategory     = 'id' | 'proof_of_income' | 'tenancy' | 'medical' | 'safeguarding' | 'council_report' | 'photo' | 'other';
export type ClaimStatus     = 'draft' | 'submitted' | 'under_review' | 'approved' | 'rejected' | 'paid' | 'appealed';
export type ClaimType       = 'housing_benefit' | 'universal_credit_housing' | 'discretionary_housing' | 'service_charge_dispute' | 'deposit_return' | 'other';
export type TxnStatus       = 'pending' | 'completed' | 'failed' | 'refunded' | 'cancelled';
export type TxnType         = 'rent' | 'service_charge' | 'deposit' | 'arrears_repayment' | 'refund' | 'adjustment';
export type NotifType       = 'info' | 'warning' | 'action_required' | 'payment' | 'claim' | 'system';
export type InviteStatus    = 'pending' | 'accepted' | 'expired' | 'revoked';

// ── V2 Row Types ──────────────────────────────────────────────────────────────

export interface DbProperty {
  id:              string;
  name:            string;
  address_line_1:  string;
  address_line_2:  string | null;
  city:            string;
  postcode:        string;
  property_type:   PropertyType;
  brand:           Brand;
  license_number:  string | null;
  license_expiry:  string | null;
  max_occupants:   number;
  manager_id:      string | null;
  is_active:       boolean;
  notes:           string | null;
  created_at:      string;
  updated_at:      string;
}

export interface DbRoom {
  id:                string;
  property_id:       string;
  room_number:       string;
  floor:             number;
  room_status:       RoomStatus;
  weekly_rate:       number;
  current_tenant_id: string | null;
  facilities:        string[] | null;
  notes:             string | null;
  created_at:        string;
  updated_at:        string;
}

export interface DbTenancyAgreement {
  id:                string;
  tenant_id:         string;
  property_id:       string;
  room_id:           string | null;
  agreement_status:  AgreementStatus;
  start_date:        string;
  end_date:          string | null;
  weekly_rent:       number;
  deposit_amount:    number;
  deposit_paid:      boolean;
  deposit_scheme:    string | null;
  deposit_ref:       string | null;
  special_terms:     string | null;
  signed_by_tenant:  boolean;
  signed_by_manager: boolean;
  signed_at:         string | null;
  document_url:      string | null;
  created_by:        string;
  created_at:        string;
  updated_at:        string;
}

export interface DbDocument {
  id:              string;
  tenant_id:       string | null;
  property_id:     string | null;
  category:        DocCategory;
  title:           string;
  description:     string | null;
  file_url:        string;
  file_size_bytes: number | null;
  mime_type:       string | null;
  uploaded_by:     string;
  is_verified:     boolean;
  verified_by:     string | null;
  verified_at:     string | null;
  expires_at:      string | null;
  created_at:      string;
  updated_at:      string;
}

export interface DbHousingClaim {
  id:               string;
  tenant_id:        string;
  claim_type:       ClaimType;
  claim_status:     ClaimStatus;
  reference_number: string | null;
  council_name:     string | null;
  submitted_at:     string | null;
  decided_at:       string | null;
  amount_claimed:   number | null;
  amount_awarded:   number | null;
  decision_notes:   string | null;
  appeal_deadline:  string | null;
  supporting_docs:  string[] | null;
  assigned_to:      string | null;
  notes:            string | null;
  created_by:       string;
  created_at:       string;
  updated_at:       string;
}

export interface DbPaymentTransaction {
  id:             string;
  tenant_id:      string;
  charge_id:      string | null;
  claim_id:       string | null;
  txn_type:       TxnType;
  txn_status:     TxnStatus;
  amount:         number;
  payment_method: PaymentMethod;
  payment_date:   string;
  reference:      string | null;
  receipt_url:    string | null;
  notes:          string | null;
  recorded_by:    string;
  approved_by:    string | null;
  created_at:     string;
  updated_at:     string;
}

export interface DbNotification {
  id:           string;
  recipient_id: string;
  notif_type:   NotifType;
  title:        string;
  body:         string | null;
  link:         string | null;
  is_read:      boolean;
  read_at:      string | null;
  tenant_id:    string | null;
  created_at:   string;
}

export interface DbSystemSetting {
  id:            string;
  setting_key:   string;
  setting_value: Record<string, unknown> | string | number | boolean;
  description:   string | null;
  updated_by:    string | null;
  created_at:    string;
  updated_at:    string;
}

export interface DbUserInvitation {
  id:            string;
  email:         string;
  role:          UserRole;
  brand:         Brand;
  invite_status: InviteStatus;
  invite_code:   string;
  invited_by:    string;
  accepted_at:   string | null;
  expires_at:    string;
  created_at:    string;
}

export interface DbLoginHistory {
  id:             string;
  user_id:        string;
  login_method:   string;
  ip_address:     string | null;
  user_agent:     string | null;
  success:        boolean;
  failure_reason: string | null;
  created_at:     string;
}

// ── Insert types (what you send on INSERT) ────────────────────────────────────

export type InsertTenant = Omit<DbTenant,
  'id' | 'created_at' | 'updated_at' | 'confidentiality_signed_at'
>;

export type InsertSession = Omit<DbSession,
  'id' | 'created_at' | 'updated_at' | 'blockchain_hash'
>;

export type InsertServiceCharge = Omit<DbServiceCharge,
  'id' | 'created_at' | 'updated_at'
>;

export type InsertProperty = Omit<DbProperty,
  'id' | 'created_at' | 'updated_at'
>;

export type InsertRoom = Omit<DbRoom,
  'id' | 'created_at' | 'updated_at'
>;

export type InsertTenancyAgreement = Omit<DbTenancyAgreement,
  'id' | 'created_at' | 'updated_at'
>;

export type InsertDocument = Omit<DbDocument,
  'id' | 'created_at' | 'updated_at'
>;

export type InsertHousingClaim = Omit<DbHousingClaim,
  'id' | 'created_at' | 'updated_at'
>;

export type InsertPaymentTransaction = Omit<DbPaymentTransaction,
  'id' | 'created_at' | 'updated_at'
>;

export type InsertNotification = Omit<DbNotification,
  'id' | 'created_at'
>;

// ── Auth session user (decoded from JWT) ──────────────────────────────────────

export interface AuthUser {
  id:        string;   // auth.users.id
  email:     string;
  dbUser:    DbUser;   // joined from users table
}
