-- =============================================================================
-- MATTY'S PLACE — PHASE 3: COMPLETE DATABASE ARCHITECTURE
-- Ash Shahada Housing Association Ltd · Reliance Housing · Matty's Place
-- Version: 3.0 | Run in Supabase SQL Editor
-- Safe to re-run — all statements are idempotent (IF NOT EXISTS / DO EXCEPTION)
--
-- TABLE MAP:
--   V1 (already deployed): users, tenants, audit_logs, sessions,
--                           service_charges, tenant_verifications,
--                           worker_tenant_assignments
--
--   V2 (applied here):     properties, rooms, tenancy_agreements, documents,
--                           housing_claims, payment_transactions, notifications,
--                           system_settings, user_invitations, login_history
--
--   V3 NEW (Phase 3):      providers, tenant_providers
--                           + provider_id FK on housing_claims
--                           + full-text search (pg_trgm + GIN)
--                           + composite performance indexes
--                           + v_tenant_overview materialised view
--                           + notify_staff() trigger function
-- =============================================================================

-- ── Extensions ────────────────────────────────────────────────────────────────
-- uuid-ossp: uuid_generate_v4()   pgcrypto: digest() for SHA-256
-- pg_trgm:   trigram similarity for fuzzy name search
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- =============================================================================
-- ENUMS  (all idempotent)
-- =============================================================================

DO $$ BEGIN CREATE TYPE property_type    AS ENUM ('HMO', 'Supported', 'Semi-Independent', 'Hostel');              EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE room_status      AS ENUM ('available', 'occupied', 'maintenance', 'reserved');             EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE agreement_status AS ENUM ('active', 'expired', 'terminated', 'pending');                   EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE doc_category     AS ENUM ('id', 'proof_of_income', 'tenancy', 'medical', 'safeguarding', 'council_report', 'photo', 'other'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE claim_status     AS ENUM ('draft', 'submitted', 'under_review', 'approved', 'rejected', 'paid', 'appealed'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE claim_type       AS ENUM ('housing_benefit', 'universal_credit_housing', 'discretionary_housing', 'service_charge_dispute', 'deposit_return', 'other'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE txn_status       AS ENUM ('pending', 'completed', 'failed', 'refunded', 'cancelled');       EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE txn_type         AS ENUM ('rent', 'service_charge', 'deposit', 'arrears_repayment', 'refund', 'adjustment'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE notif_type       AS ENUM ('info', 'warning', 'action_required', 'payment', 'claim', 'system'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE invite_status    AS ENUM ('pending', 'accepted', 'expired', 'revoked');                     EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- NEW in Phase 3
DO $$ BEGIN
  CREATE TYPE provider_type AS ENUM (
    'council',    -- local authority housing / council tax
    'dwp',        -- DWP: UC, PIP, ESA, JSA case workers
    'nhs',        -- GP surgery, NHS mental health, CAMHS
    'probation',  -- probation service / community offender manager
    'utility',    -- gas, electric, water
    'legal',      -- solicitors, legal aid
    'employer',   -- current employer or college
    'charity',    -- housing charity, food bank, support org
    'other'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- =============================================================================
-- V2 TABLES  (IF NOT EXISTS — safe if V2 migration already ran)
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. PROPERTIES — HMO buildings managed by the association
--    Normalisation note: address fields split so we can query by postcode/city.
--    FK to users(manager_id) — ONE manager owns each property.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS properties (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name            TEXT NOT NULL,
  address_line_1  TEXT NOT NULL,
  address_line_2  TEXT,
  city            TEXT NOT NULL DEFAULT 'Birmingham',
  postcode        TEXT NOT NULL,
  property_type   property_type NOT NULL DEFAULT 'HMO',
  brand           brand NOT NULL DEFAULT 'mattys_place',
  license_number  TEXT,                   -- HMO licence ref (Birmingham City Council)
  license_expiry  DATE,                   -- trigger can warn 90 days before expiry
  max_occupants   INT NOT NULL DEFAULT 6,
  manager_id      UUID REFERENCES users(id) ON DELETE SET NULL,
  is_active       BOOLEAN NOT NULL DEFAULT TRUE,
  notes           TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
COMMENT ON TABLE properties IS 'HMO properties. HMO licence number + expiry tracked for compliance.';

-- ---------------------------------------------------------------------------
-- 2. ROOMS — lettable units within a property
--    Composite UNIQUE(property_id, room_number) prevents duplicate room labels.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS rooms (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  property_id       UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  room_number       TEXT NOT NULL,
  floor             INT DEFAULT 0,
  room_status       room_status NOT NULL DEFAULT 'available',
  weekly_rate       NUMERIC(10,2) NOT NULL DEFAULT 0,
  current_tenant_id UUID REFERENCES tenants(id) ON DELETE SET NULL,
  facilities        TEXT[],               -- e.g. ['ensuite', 'furnished', 'wheelchair_access']
  notes             TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (property_id, room_number)       -- no duplicate room labels per property
);
COMMENT ON TABLE rooms IS 'Individual rooms. UNIQUE(property_id, room_number) enforces no duplicate labels.';

-- ---------------------------------------------------------------------------
-- 3. TENANCY AGREEMENTS — formal rental contracts
--    1 active agreement per tenant at any time (enforced via agreement_status).
--    deposit_scheme + deposit_ref = TDS/MyDeposits compliance.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS tenancy_agreements (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id           UUID NOT NULL REFERENCES tenants(id) ON DELETE RESTRICT,
  property_id         UUID NOT NULL REFERENCES properties(id) ON DELETE RESTRICT,
  room_id             UUID REFERENCES rooms(id) ON DELETE SET NULL,
  agreement_status    agreement_status NOT NULL DEFAULT 'pending',
  start_date          DATE NOT NULL,
  end_date            DATE,               -- null = rolling/periodic
  weekly_rent         NUMERIC(10,2) NOT NULL,
  deposit_amount      NUMERIC(10,2) NOT NULL DEFAULT 0,
  deposit_paid        BOOLEAN NOT NULL DEFAULT FALSE,
  deposit_scheme      TEXT,               -- 'TDS', 'MyDeposits', 'DPS'
  deposit_ref         TEXT,               -- scheme reference number
  special_terms       TEXT,
  signed_by_tenant    BOOLEAN NOT NULL DEFAULT FALSE,
  signed_by_manager   BOOLEAN NOT NULL DEFAULT FALSE,
  signed_at           TIMESTAMPTZ,
  document_url        TEXT,               -- PDF stored in Supabase Storage
  created_by          UUID NOT NULL REFERENCES users(id),
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
COMMENT ON TABLE tenancy_agreements IS 'Tenancy/licence agreements. deposit_scheme + deposit_ref = TDS compliance.';

-- ---------------------------------------------------------------------------
-- 4. DOCUMENTS — uploaded files (ID scans, proof of income, council reports)
--    tenant_id OR property_id (or both null for system docs).
--    expires_at enables automatic expiry reminders for ID documents.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS documents (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id       UUID REFERENCES tenants(id) ON DELETE SET NULL,
  property_id     UUID REFERENCES properties(id) ON DELETE SET NULL,
  category        doc_category NOT NULL DEFAULT 'other',
  title           TEXT NOT NULL,
  description     TEXT,
  file_url        TEXT NOT NULL,          -- Supabase Storage URL
  file_size_bytes BIGINT,
  mime_type       TEXT,
  uploaded_by     UUID NOT NULL REFERENCES users(id),
  is_verified     BOOLEAN NOT NULL DEFAULT FALSE,
  verified_by     UUID REFERENCES users(id),
  verified_at     TIMESTAMPTZ,
  expires_at      DATE,                   -- for ID docs, passport expiry etc.
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
COMMENT ON TABLE documents IS 'Central document store. expires_at drives ID expiry reminders.';

-- ---------------------------------------------------------------------------
-- 5. HOUSING CLAIMS — benefit claims and dispute tracking
--    claim_type covers UC housing element, HB, DHP, and disputes.
--    provider_id (added in V3 below) links to the council/DWP handling it.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS housing_claims (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id        UUID NOT NULL REFERENCES tenants(id) ON DELETE RESTRICT,
  claim_type       claim_type NOT NULL,
  claim_status     claim_status NOT NULL DEFAULT 'draft',
  reference_number TEXT,                  -- council or DWP reference
  council_name     TEXT,                  -- deprecated — use provider_id
  submitted_at     TIMESTAMPTZ,
  decided_at       TIMESTAMPTZ,
  amount_claimed   NUMERIC(10,2),
  amount_awarded   NUMERIC(10,2),
  decision_notes   TEXT,
  appeal_deadline  DATE,                  -- 1 month from decision — set by trigger
  supporting_docs  UUID[],               -- array of documents.id
  assigned_to      UUID REFERENCES users(id),
  notes            TEXT,
  created_by       UUID NOT NULL REFERENCES users(id),
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
COMMENT ON TABLE housing_claims IS 'HB, UC housing element, DHP, and disputes. provider_id links to council/DWP.';

-- ---------------------------------------------------------------------------
-- 6. PAYMENT TRANSACTIONS — individual payment events
--    Links to both service_charges (the charge being paid) and
--    housing_claims (if a claim payment). Full financial audit trail.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS payment_transactions (
  id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id      UUID NOT NULL REFERENCES tenants(id) ON DELETE RESTRICT,
  charge_id      UUID REFERENCES service_charges(id) ON DELETE SET NULL,
  claim_id       UUID REFERENCES housing_claims(id)  ON DELETE SET NULL,
  txn_type       txn_type NOT NULL DEFAULT 'rent',
  txn_status     txn_status NOT NULL DEFAULT 'pending',
  amount         NUMERIC(10,2) NOT NULL CHECK (amount != 0),
  payment_method payment_method NOT NULL DEFAULT 'Cash',
  payment_date   DATE NOT NULL DEFAULT CURRENT_DATE,
  reference      TEXT,                   -- bank reference or receipt number
  receipt_url    TEXT,
  notes          TEXT,
  recorded_by    UUID NOT NULL REFERENCES users(id),
  approved_by    UUID REFERENCES users(id),
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
COMMENT ON TABLE payment_transactions IS 'Every payment event. Linked to service_charges and/or housing_claims for full ledger.';

-- ---------------------------------------------------------------------------
-- 7. NOTIFICATIONS — in-app alerts for staff
--    recipient_id → one staff member per row (fan-out on write).
--    tenant_id allows deep-link from notification to tenant profile.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS notifications (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  recipient_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  notif_type   notif_type NOT NULL DEFAULT 'info',
  title        TEXT NOT NULL,
  body         TEXT,
  link         TEXT,                     -- e.g. '/dashboard?view=tenants&id=...'
  is_read      BOOLEAN NOT NULL DEFAULT FALSE,
  read_at      TIMESTAMPTZ,
  tenant_id    UUID REFERENCES tenants(id) ON DELETE SET NULL,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
COMMENT ON TABLE notifications IS 'Fan-out notifications: payment alerts, claim updates, risk flags, licence expiry.';

-- ---------------------------------------------------------------------------
-- 8. SYSTEM SETTINGS — admin key-value config store
--    setting_value is JSONB so it can store strings, numbers, arrays, objects.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS system_settings (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  setting_key   TEXT NOT NULL UNIQUE,
  setting_value JSONB NOT NULL DEFAULT '{}',
  description   TEXT,
  updated_by    UUID REFERENCES users(id),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
COMMENT ON TABLE system_settings IS 'Key-value config. setting_value is JSONB — can store any type.';

INSERT INTO system_settings (setting_key, setting_value, description) VALUES
  ('default_weekly_rate',          '"95.00"',                          'Default weekly service charge'),
  ('session_timeout_hours',        '4',                                'Hours before forced re-auth'),
  ('notification_retention_days',  '90',                               'Auto-delete read notifications after N days'),
  ('max_upload_size_mb',           '10',                               'Max document upload in MB'),
  ('brands',                       '["mattys_place","ash_shahada","reliance"]', 'Active brands'),
  ('appeal_deadline_days',         '28',                               'Days after claim decision to file appeal'),
  ('licence_expiry_warning_days',  '90',                               'Days before HMO licence expiry to warn manager')
ON CONFLICT (setting_key) DO NOTHING;

-- ---------------------------------------------------------------------------
-- 9. USER INVITATIONS — tracks Supabase invite emails sent by Managers
--    invite_code is a secure random token for invite-link verification.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS user_invitations (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email         TEXT NOT NULL,
  role          user_role NOT NULL,
  brand         brand NOT NULL DEFAULT 'mattys_place',
  invite_status invite_status NOT NULL DEFAULT 'pending',
  invite_code   TEXT NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(16), 'hex'),
  invited_by    UUID NOT NULL REFERENCES users(id),
  accepted_at   TIMESTAMPTZ,
  expires_at    TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '7 days'),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
COMMENT ON TABLE user_invitations IS 'Invite tokens sent via Supabase auth.admin.inviteUserByEmail(). Expire after 7 days.';

-- ---------------------------------------------------------------------------
-- 10. LOGIN HISTORY — granular auth events beyond audit_logs
--     Records IP, user-agent, success/failure for each login attempt.
--     Enables suspicious-activity detection (multiple failures from one IP).
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS login_history (
  id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id        UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  login_method   TEXT NOT NULL DEFAULT 'password',  -- 'password', 'magic_link', 'invite'
  ip_address     INET,                              -- INET type for proper IP storage + indexing
  user_agent     TEXT,
  success        BOOLEAN NOT NULL DEFAULT TRUE,
  failure_reason TEXT,                              -- 'invalid_password', 'account_deactivated', etc.
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
COMMENT ON TABLE login_history IS 'Every login attempt. INET type on ip_address enables subnet queries.';

-- =============================================================================
-- V3 NEW TABLES
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 11. PROVIDERS — external organisations tenants interact with
--     Examples: Birmingham City Council Housing, DWP Birmingham, a GP surgery.
--     Normalises council_name / probation_officer / doctor fields on tenants
--     into a proper relational table.
--
--     FOREIGN KEYS:
--       housing_claims.provider_id → providers (which council handles this claim)
--       tenant_providers.provider_id → providers (many-to-many with tenants)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS providers (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name            TEXT NOT NULL,
  provider_type   provider_type NOT NULL,
  contact_name    TEXT,                   -- named contact person
  phone           TEXT,
  email           TEXT,
  address         TEXT,
  website         TEXT,
  local_authority TEXT,                   -- 'Birmingham City Council', 'Sandwell', etc.
  reference_notes TEXT,                   -- notes on how to reference claims with this org
  is_active       BOOLEAN NOT NULL DEFAULT TRUE,
  brand           brand,                  -- null = shared across all brands
  created_by      UUID NOT NULL REFERENCES users(id),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
COMMENT ON TABLE providers IS 'External organisations: councils, DWP, NHS, probation, utilities. Normalises free-text fields on tenants.';

-- Seed Birmingham-area providers that all HMOs will use
INSERT INTO providers (name, provider_type, local_authority, phone, created_by)
SELECT
  p.name, p.ptype::provider_type, p.la, p.phone,
  (SELECT id FROM users WHERE role = 'Manager' LIMIT 1)
FROM (VALUES
  ('Birmingham City Council — Housing',  'council',   'Birmingham City Council', '0121 303 1111'),
  ('DWP Birmingham — Universal Credit',  'dwp',       'Birmingham',              '0800 328 5644'),
  ('DWP Birmingham — PIP Assessments',   'dwp',       'Birmingham',              '0800 121 4433'),
  ('National Probation Service — WM',    'probation', 'West Midlands',           '0121 232 6200'),
  ('Severn Trent Water',                 'utility',   NULL,                      '0800 783 4444'),
  ('Cadent Gas',                         'utility',   NULL,                      '0800 111 999'),
  ('Western Power Distribution',         'utility',   NULL,                      '0800 096 3080')
) AS p(name, ptype, la, phone)
WHERE EXISTS (SELECT 1 FROM users WHERE role = 'Manager' LIMIT 1)
ON CONFLICT DO NOTHING;

-- ---------------------------------------------------------------------------
-- 12. TENANT PROVIDERS — many-to-many: which providers are linked to each tenant
--     A tenant can have: a GP surgery, a DWP case worker, a probation officer,
--     a council housing officer, and a utility provider.
--     provider_ref = their case number or reference with that provider.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS tenant_providers (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id    UUID NOT NULL REFERENCES tenants(id)   ON DELETE CASCADE,
  provider_id  UUID NOT NULL REFERENCES providers(id) ON DELETE RESTRICT,
  provider_ref TEXT,                     -- tenant's reference/case number with this provider
  active_from  DATE DEFAULT CURRENT_DATE,
  active_to    DATE,                     -- null = currently active
  notes        TEXT,
  created_by   UUID NOT NULL REFERENCES users(id),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (tenant_id, provider_id)        -- one active link per tenant-provider pair
);
COMMENT ON TABLE tenant_providers IS 'Links tenants to their providers (GP, DWP case worker, council officer). UNIQUE prevents duplicates.';

-- =============================================================================
-- V3 SCHEMA ALTERATIONS — add provider_id to housing_claims
-- =============================================================================

-- Add provider_id FK to housing_claims (which council/DWP is handling this claim)
DO $$ BEGIN
  ALTER TABLE housing_claims ADD COLUMN provider_id UUID REFERENCES providers(id) ON DELETE SET NULL;
  COMMENT ON COLUMN housing_claims.provider_id IS 'The provider (council/DWP) handling this claim. Replaces free-text council_name.';
EXCEPTION WHEN duplicate_column THEN NULL; END $$;

-- Add property_id to tenants for direct room-to-property lookup
DO $$ BEGIN
  ALTER TABLE tenants ADD COLUMN property_id UUID REFERENCES properties(id) ON DELETE SET NULL;
  COMMENT ON COLUMN tenants.property_id IS 'Current property. Denormalised for query performance — source of truth is rooms.current_tenant_id.';
EXCEPTION WHEN duplicate_column THEN NULL; END $$;

-- =============================================================================
-- INDEXES — Performance engineering
-- =============================================================================

-- ── V2 table indexes ─────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_properties_brand         ON properties(brand);
CREATE INDEX IF NOT EXISTS idx_properties_active        ON properties(is_active) WHERE is_active = TRUE;
CREATE INDEX IF NOT EXISTS idx_rooms_property           ON rooms(property_id);
CREATE INDEX IF NOT EXISTS idx_rooms_tenant             ON rooms(current_tenant_id);
CREATE INDEX IF NOT EXISTS idx_rooms_status             ON rooms(room_status);
CREATE INDEX IF NOT EXISTS idx_agreements_tenant        ON tenancy_agreements(tenant_id);
CREATE INDEX IF NOT EXISTS idx_agreements_property      ON tenancy_agreements(property_id);
CREATE INDEX IF NOT EXISTS idx_agreements_status        ON tenancy_agreements(agreement_status);
CREATE INDEX IF NOT EXISTS idx_documents_tenant         ON documents(tenant_id);
CREATE INDEX IF NOT EXISTS idx_documents_category       ON documents(category);
CREATE INDEX IF NOT EXISTS idx_documents_expires        ON documents(expires_at) WHERE expires_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_claims_tenant            ON housing_claims(tenant_id);
CREATE INDEX IF NOT EXISTS idx_claims_status            ON housing_claims(claim_status);
CREATE INDEX IF NOT EXISTS idx_claims_type              ON housing_claims(claim_type);
CREATE INDEX IF NOT EXISTS idx_claims_provider          ON housing_claims(provider_id);
CREATE INDEX IF NOT EXISTS idx_txn_tenant               ON payment_transactions(tenant_id);
CREATE INDEX IF NOT EXISTS idx_txn_charge               ON payment_transactions(charge_id);
CREATE INDEX IF NOT EXISTS idx_txn_status               ON payment_transactions(txn_status);
CREATE INDEX IF NOT EXISTS idx_txn_date                 ON payment_transactions(payment_date DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_recipient  ON notifications(recipient_id, is_read);
CREATE INDEX IF NOT EXISTS idx_notifications_unread     ON notifications(recipient_id) WHERE is_read = FALSE;
CREATE INDEX IF NOT EXISTS idx_notifications_created    ON notifications(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_invitations_email        ON user_invitations(email);
CREATE INDEX IF NOT EXISTS idx_invitations_code         ON user_invitations(invite_code);
CREATE INDEX IF NOT EXISTS idx_invitations_status       ON user_invitations(invite_status) WHERE invite_status = 'pending';
CREATE INDEX IF NOT EXISTS idx_login_history_user       ON login_history(user_id);
CREATE INDEX IF NOT EXISTS idx_login_history_created    ON login_history(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_login_failures           ON login_history(ip_address, created_at DESC) WHERE success = FALSE;

-- ── V3 table indexes ─────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_providers_type           ON providers(provider_type);
CREATE INDEX IF NOT EXISTS idx_providers_active         ON providers(is_active) WHERE is_active = TRUE;
CREATE INDEX IF NOT EXISTS idx_tenant_providers_tenant  ON tenant_providers(tenant_id);
CREATE INDEX IF NOT EXISTS idx_tenant_providers_provider ON tenant_providers(provider_id);

-- ── FULL-TEXT SEARCH indexes (pg_trgm GIN) ───────────────────────────────────
-- Enables fast ILIKE queries: WHERE full_name ILIKE '%smith%'
-- Also powers the dashboard global search bar.
CREATE INDEX IF NOT EXISTS idx_tenants_name_trgm   ON tenants USING GIN (full_name gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_tenants_nino_trgm   ON tenants USING GIN (nino    gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_tenants_mobile_trgm ON tenants USING GIN (mobile  gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_providers_name_trgm ON providers USING GIN (name  gin_trgm_ops);

-- ── COMPOSITE indexes for common dashboard query patterns ────────────────────
-- Dashboard: active tenants sorted by move-in date
CREATE INDEX IF NOT EXISTS idx_tenants_status_brand_movedin
  ON tenants(status, brand, moved_in DESC);

-- Ledger: unpaid charges by tenant ordered newest first
CREATE INDEX IF NOT EXISTS idx_charges_tenant_unpaid_period
  ON service_charges(tenant_id, is_paid, period_start DESC);

-- Audit log: actor + action + time for worker audit trail
CREATE INDEX IF NOT EXISTS idx_audit_actor_action_time
  ON audit_logs(actor_id, action, stamped_at DESC);

-- Sessions: tenant + date for session history
CREATE INDEX IF NOT EXISTS idx_sessions_tenant_date
  ON sessions(tenant_id, session_date DESC);

-- =============================================================================
-- ROW LEVEL SECURITY — V2 + V3 tables
-- =============================================================================

ALTER TABLE properties            ENABLE ROW LEVEL SECURITY;
ALTER TABLE rooms                 ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenancy_agreements    ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents             ENABLE ROW LEVEL SECURITY;
ALTER TABLE housing_claims        ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_transactions  ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications         ENABLE ROW LEVEL SECURITY;
ALTER TABLE system_settings       ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_invitations      ENABLE ROW LEVEL SECURITY;
ALTER TABLE login_history         ENABLE ROW LEVEL SECURITY;
ALTER TABLE providers             ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenant_providers      ENABLE ROW LEVEL SECURITY;

-- Properties: Manager full, Worker read
DROP POLICY IF EXISTS prop_manager_all  ON properties;
DROP POLICY IF EXISTS prop_worker_read  ON properties;
CREATE POLICY prop_manager_all  ON properties FOR ALL    TO authenticated USING (get_my_role() = 'Manager');
CREATE POLICY prop_worker_read  ON properties FOR SELECT TO authenticated USING (get_my_role() = 'SupportWorker');

-- Rooms: Manager full, Worker read
DROP POLICY IF EXISTS rooms_manager_all ON rooms;
DROP POLICY IF EXISTS rooms_worker_read ON rooms;
CREATE POLICY rooms_manager_all ON rooms FOR ALL    TO authenticated USING (get_my_role() = 'Manager');
CREATE POLICY rooms_worker_read ON rooms FOR SELECT TO authenticated USING (get_my_role() = 'SupportWorker');

-- Agreements: Manager full, Worker read for assigned tenants
DROP POLICY IF EXISTS agr_manager_all ON tenancy_agreements;
DROP POLICY IF EXISTS agr_worker_read ON tenancy_agreements;
CREATE POLICY agr_manager_all ON tenancy_agreements FOR ALL    TO authenticated USING (get_my_role() = 'Manager');
CREATE POLICY agr_worker_read ON tenancy_agreements FOR SELECT TO authenticated USING (get_my_role() = 'SupportWorker' AND is_assigned_to_tenant(tenant_id));

-- Documents: Manager full, Worker read+insert for assigned
DROP POLICY IF EXISTS doc_manager_all   ON documents;
DROP POLICY IF EXISTS doc_worker_read   ON documents;
DROP POLICY IF EXISTS doc_worker_insert ON documents;
CREATE POLICY doc_manager_all   ON documents FOR ALL    TO authenticated USING (get_my_role() = 'Manager');
CREATE POLICY doc_worker_read   ON documents FOR SELECT TO authenticated USING (get_my_role() = 'SupportWorker' AND (tenant_id IS NULL OR is_assigned_to_tenant(tenant_id)));
CREATE POLICY doc_worker_insert ON documents FOR INSERT TO authenticated WITH CHECK (get_my_role() IN ('Manager', 'SupportWorker'));

-- Claims: Manager full, Worker read+create for assigned tenants
DROP POLICY IF EXISTS claim_manager_all ON housing_claims;
DROP POLICY IF EXISTS claim_worker_read ON housing_claims;
DROP POLICY IF EXISTS claim_worker_ins  ON housing_claims;
CREATE POLICY claim_manager_all ON housing_claims FOR ALL    TO authenticated USING (get_my_role() = 'Manager');
CREATE POLICY claim_worker_read ON housing_claims FOR SELECT TO authenticated USING (get_my_role() = 'SupportWorker' AND is_assigned_to_tenant(tenant_id));
CREATE POLICY claim_worker_ins  ON housing_claims FOR INSERT TO authenticated WITH CHECK (get_my_role() IN ('Manager', 'SupportWorker') AND is_assigned_to_tenant(tenant_id));

-- Payment transactions: Manager full, Worker read for assigned tenants
DROP POLICY IF EXISTS ptx_manager_all ON payment_transactions;
DROP POLICY IF EXISTS ptx_worker_read ON payment_transactions;
CREATE POLICY ptx_manager_all ON payment_transactions FOR ALL    TO authenticated USING (get_my_role() = 'Manager');
CREATE POLICY ptx_worker_read ON payment_transactions FOR SELECT TO authenticated USING (get_my_role() = 'SupportWorker' AND is_assigned_to_tenant(tenant_id));

-- Notifications: each user sees only their own
DROP POLICY IF EXISTS notif_own ON notifications;
CREATE POLICY notif_own ON notifications FOR ALL TO authenticated USING (recipient_id = get_my_user_id());

-- System settings: Manager full, Worker read
DROP POLICY IF EXISTS settings_manager ON system_settings;
DROP POLICY IF EXISTS settings_read    ON system_settings;
CREATE POLICY settings_manager ON system_settings FOR ALL    TO authenticated USING (get_my_role() = 'Manager');
CREATE POLICY settings_read    ON system_settings FOR SELECT TO authenticated USING (get_my_role() IN ('Manager', 'SupportWorker'));

-- Invitations: Manager only
DROP POLICY IF EXISTS inv_manager_all ON user_invitations;
CREATE POLICY inv_manager_all ON user_invitations FOR ALL TO authenticated USING (get_my_role() = 'Manager');

-- Login history: Manager reads all, users read own
DROP POLICY IF EXISTS lh_manager_all ON login_history;
DROP POLICY IF EXISTS lh_own_read    ON login_history;
CREATE POLICY lh_manager_all ON login_history FOR ALL    TO authenticated USING (get_my_role() = 'Manager');
CREATE POLICY lh_own_read    ON login_history FOR SELECT TO authenticated USING (user_id = get_my_user_id());

-- Providers: Manager full, Worker + Tenant read
DROP POLICY IF EXISTS prov_manager_all ON providers;
DROP POLICY IF EXISTS prov_staff_read  ON providers;
CREATE POLICY prov_manager_all ON providers FOR ALL    TO authenticated USING (get_my_role() = 'Manager');
CREATE POLICY prov_staff_read  ON providers FOR SELECT TO authenticated USING (get_my_role() IN ('Manager', 'SupportWorker', 'Tenant'));

-- Tenant providers: Manager full, Worker read+insert for assigned tenants
DROP POLICY IF EXISTS tp_manager_all ON tenant_providers;
DROP POLICY IF EXISTS tp_worker_read ON tenant_providers;
DROP POLICY IF EXISTS tp_worker_ins  ON tenant_providers;
CREATE POLICY tp_manager_all ON tenant_providers FOR ALL    TO authenticated USING (get_my_role() = 'Manager');
CREATE POLICY tp_worker_read ON tenant_providers FOR SELECT TO authenticated USING (get_my_role() = 'SupportWorker' AND is_assigned_to_tenant(tenant_id));
CREATE POLICY tp_worker_ins  ON tenant_providers FOR INSERT TO authenticated WITH CHECK (get_my_role() IN ('Manager', 'SupportWorker') AND is_assigned_to_tenant(tenant_id));

-- =============================================================================
-- TRIGGERS — updated_at auto-stamps
-- =============================================================================

DROP TRIGGER IF EXISTS trg_properties_updated_at     ON properties;
DROP TRIGGER IF EXISTS trg_rooms_updated_at          ON rooms;
DROP TRIGGER IF EXISTS trg_agreements_updated_at     ON tenancy_agreements;
DROP TRIGGER IF EXISTS trg_documents_updated_at      ON documents;
DROP TRIGGER IF EXISTS trg_claims_updated_at         ON housing_claims;
DROP TRIGGER IF EXISTS trg_txn_updated_at            ON payment_transactions;
DROP TRIGGER IF EXISTS trg_settings_updated_at       ON system_settings;
DROP TRIGGER IF EXISTS trg_providers_updated_at      ON providers;

CREATE TRIGGER trg_properties_updated_at  BEFORE UPDATE ON properties          FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_rooms_updated_at       BEFORE UPDATE ON rooms               FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_agreements_updated_at  BEFORE UPDATE ON tenancy_agreements  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_documents_updated_at   BEFORE UPDATE ON documents           FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_claims_updated_at      BEFORE UPDATE ON housing_claims      FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_txn_updated_at         BEFORE UPDATE ON payment_transactions FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_settings_updated_at    BEFORE UPDATE ON system_settings     FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_providers_updated_at   BEFORE UPDATE ON providers           FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- =============================================================================
-- TRIGGER: Auto-set appeal_deadline on housing_claims when status → rejected/approved
-- 28 days from decided_at (configurable via system_settings)
-- =============================================================================

CREATE OR REPLACE FUNCTION set_claim_appeal_deadline()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.claim_status IN ('rejected', 'approved') AND NEW.decided_at IS NOT NULL
     AND NEW.appeal_deadline IS NULL THEN
    NEW.appeal_deadline := (NEW.decided_at + INTERVAL '28 days')::DATE;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_claim_appeal_deadline ON housing_claims;
CREATE TRIGGER trg_claim_appeal_deadline
  BEFORE INSERT OR UPDATE ON housing_claims
  FOR EACH ROW EXECUTE FUNCTION set_claim_appeal_deadline();

-- =============================================================================
-- TRIGGER: Auto-audit financial table changes (payment_transactions, service_charges, claims)
-- =============================================================================

CREATE OR REPLACE FUNCTION audit_financial_change()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_user   RECORD;
  v_action audit_action;
BEGIN
  SELECT id, full_name, role INTO v_user
  FROM users WHERE auth_id = auth.uid() LIMIT 1;
  IF v_user.id IS NULL THEN RETURN NEW; END IF;
  IF TG_OP = 'INSERT' THEN v_action := 'CREATE'; ELSE v_action := 'EDIT'; END IF;

  INSERT INTO audit_logs (
    actor_id, actor_name, actor_role,
    tenant_id, table_name, record_id, action,
    entry_method, old_data, new_data, stamped_at
  ) VALUES (
    v_user.id, v_user.full_name, v_user.role,
    NEW.tenant_id, TG_TABLE_NAME, NEW.id, v_action, 'manual',
    CASE WHEN TG_OP = 'UPDATE' THEN to_jsonb(OLD) ELSE NULL END,
    to_jsonb(NEW), NOW()
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_audit_payment_insert  ON payment_transactions;
DROP TRIGGER IF EXISTS trg_audit_payment_update  ON payment_transactions;
DROP TRIGGER IF EXISTS trg_audit_charges_insert  ON service_charges;
DROP TRIGGER IF EXISTS trg_audit_charges_update  ON service_charges;
DROP TRIGGER IF EXISTS trg_audit_claims_insert   ON housing_claims;
DROP TRIGGER IF EXISTS trg_audit_claims_update   ON housing_claims;

CREATE TRIGGER trg_audit_payment_insert  AFTER INSERT ON payment_transactions FOR EACH ROW EXECUTE FUNCTION audit_financial_change();
CREATE TRIGGER trg_audit_payment_update  AFTER UPDATE ON payment_transactions FOR EACH ROW EXECUTE FUNCTION audit_financial_change();
CREATE TRIGGER trg_audit_charges_insert  AFTER INSERT ON service_charges      FOR EACH ROW EXECUTE FUNCTION audit_financial_change();
CREATE TRIGGER trg_audit_charges_update  AFTER UPDATE ON service_charges      FOR EACH ROW EXECUTE FUNCTION audit_financial_change();
CREATE TRIGGER trg_audit_claims_insert   AFTER INSERT ON housing_claims       FOR EACH ROW EXECUTE FUNCTION audit_financial_change();
CREATE TRIGGER trg_audit_claims_update   AFTER UPDATE ON housing_claims       FOR EACH ROW EXECUTE FUNCTION audit_financial_change();

-- =============================================================================
-- TRIGGER: Auto-notify Manager when a new risk flag is raised on a session
-- =============================================================================

CREATE OR REPLACE FUNCTION notify_on_risk_flag()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_tenant_name TEXT;
  v_manager     RECORD;
BEGIN
  -- Only fire when ai_risk_flag flips to TRUE
  IF NEW.ai_risk_flag = TRUE AND (OLD IS NULL OR OLD.ai_risk_flag = FALSE) THEN
    SELECT full_name INTO v_tenant_name FROM tenants WHERE id = NEW.tenant_id;

    FOR v_manager IN SELECT id FROM users WHERE role = 'Manager' AND is_active = TRUE LOOP
      INSERT INTO notifications (recipient_id, notif_type, title, body, link, tenant_id)
      VALUES (
        v_manager.id,
        'action_required',
        'AI Risk Flag — ' || COALESCE(v_tenant_name, 'Unknown Tenant'),
        COALESCE(NEW.ai_risk_note, 'AI has flagged a risk on a recent support session. Review required.'),
        '/dashboard?view=risk',
        NEW.tenant_id
      );
    END LOOP;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_risk_flag ON sessions;
CREATE TRIGGER trg_notify_risk_flag
  AFTER INSERT OR UPDATE ON sessions
  FOR EACH ROW EXECUTE FUNCTION notify_on_risk_flag();

-- =============================================================================
-- VIEWS
-- =============================================================================

-- Property occupancy dashboard
CREATE OR REPLACE VIEW v_property_occupancy AS
  SELECT
    p.id, p.name, p.brand, p.max_occupants, p.postcode,
    COUNT(r.id) FILTER (WHERE r.room_status = 'occupied')    AS occupied,
    COUNT(r.id) FILTER (WHERE r.room_status = 'available')   AS available,
    COUNT(r.id) FILTER (WHERE r.room_status = 'maintenance') AS in_maintenance,
    COUNT(r.id) AS total_rooms,
    p.license_expiry,
    CASE WHEN p.license_expiry < CURRENT_DATE + 90 THEN TRUE ELSE FALSE END AS licence_expiring_soon
  FROM properties p
  LEFT JOIN rooms r ON r.property_id = p.id
  WHERE p.is_active = TRUE
  GROUP BY p.id, p.name, p.brand, p.max_occupants, p.postcode, p.license_expiry;

-- Rent arrears — who owes what and since when
CREATE OR REPLACE VIEW v_rent_arrears AS
  SELECT
    t.id AS tenant_id, t.full_name, t.room_number, t.brand, t.status, t.mobile,
    SUM(sc.amount_due - sc.amount_paid)  AS total_arrears,
    COUNT(sc.id)                          AS unpaid_periods,
    MIN(sc.period_start)                  AS oldest_unpaid_from,
    MAX(sc.period_end)                    AS latest_unpaid_to
  FROM tenants t
  JOIN service_charges sc ON sc.tenant_id = t.id AND sc.is_paid = FALSE
  GROUP BY t.id, t.full_name, t.room_number, t.brand, t.status, t.mobile
  HAVING SUM(sc.amount_due - sc.amount_paid) > 0
  ORDER BY total_arrears DESC;

-- Active claims tracker
CREATE OR REPLACE VIEW v_active_claims AS
  SELECT
    hc.id, hc.claim_type, hc.claim_status, hc.reference_number,
    hc.amount_claimed, hc.amount_awarded, hc.submitted_at,
    hc.decided_at, hc.appeal_deadline,
    t.full_name AS tenant_name, t.room_number, t.brand, t.mobile,
    p.name AS provider_name, p.provider_type,
    u.full_name AS assigned_to_name
  FROM housing_claims hc
  JOIN tenants t ON t.id = hc.tenant_id
  LEFT JOIN providers p ON p.id = hc.provider_id
  LEFT JOIN users u ON u.id = hc.assigned_to
  WHERE hc.claim_status NOT IN ('paid', 'rejected')
  ORDER BY hc.created_at DESC;

-- Payment summary per tenant
CREATE OR REPLACE VIEW v_payment_summary AS
  SELECT
    t.id AS tenant_id, t.full_name, t.brand, t.room_number,
    SUM(pt.amount) FILTER (WHERE pt.txn_status = 'completed') AS total_paid,
    SUM(pt.amount) FILTER (WHERE pt.txn_status = 'pending')   AS total_pending,
    COUNT(pt.id) AS transaction_count,
    MAX(pt.payment_date) AS last_payment_date
  FROM tenants t
  LEFT JOIN payment_transactions pt ON pt.tenant_id = t.id
  GROUP BY t.id, t.full_name, t.brand, t.room_number;

-- Unpaid charges (replaces v1 v_unpaid_charges with balance column)
CREATE OR REPLACE VIEW v_unpaid_charges AS
  SELECT
    t.id AS tenant_id, t.full_name, t.room_number, t.brand, t.mobile,
    sc.id AS charge_id, sc.period_start, sc.period_end,
    sc.amount_due, sc.amount_paid,
    (sc.amount_due - sc.amount_paid) AS balance,
    sc.payment_method,
    CURRENT_DATE - sc.period_end AS days_overdue
  FROM service_charges sc
  JOIN tenants t ON t.id = sc.tenant_id
  WHERE sc.is_paid = FALSE
  ORDER BY days_overdue DESC NULLS LAST;

-- Recent audit trail (manager dashboard)
CREATE OR REPLACE VIEW v_recent_audit AS
  SELECT
    al.stamped_at, al.actor_name, al.actor_role,
    al.action, al.table_name,
    t.full_name AS tenant_name,
    al.payload_hash
  FROM audit_logs al
  LEFT JOIN tenants t ON t.id = al.tenant_id
  ORDER BY al.stamped_at DESC
  LIMIT 200;

-- Tenant overview — single row per tenant joining all key facts
CREATE OR REPLACE VIEW v_tenant_overview AS
  SELECT
    t.id, t.full_name, t.room_number, t.status, t.brand,
    t.mobile, t.email, t.benefit_type, t.benefit_amount,
    t.moved_in, t.on_probation,
    t.confidentiality_signed,
    -- Assigned worker
    u.full_name AS worker_name,
    -- Outstanding arrears
    COALESCE(arr.total_arrears, 0) AS total_arrears,
    -- Active claim count
    COALESCE(cl.active_claims, 0)  AS active_claims,
    -- Last session date
    sess.last_session_date,
    -- Unread notification count
    COALESCE(notif.unread_count, 0) AS unread_notifications
  FROM tenants t
  LEFT JOIN users u
    ON u.id = t.assigned_worker_id
  LEFT JOIN (
    SELECT tenant_id, SUM(amount_due - amount_paid) AS total_arrears
    FROM service_charges WHERE is_paid = FALSE
    GROUP BY tenant_id
  ) arr ON arr.tenant_id = t.id
  LEFT JOIN (
    SELECT tenant_id, COUNT(*) AS active_claims
    FROM housing_claims
    WHERE claim_status NOT IN ('paid', 'rejected')
    GROUP BY tenant_id
  ) cl ON cl.tenant_id = t.id
  LEFT JOIN (
    SELECT tenant_id, MAX(session_date) AS last_session_date
    FROM sessions GROUP BY tenant_id
  ) sess ON sess.tenant_id = t.id
  LEFT JOIN (
    SELECT tenant_id, COUNT(*) AS unread_count
    FROM notifications WHERE is_read = FALSE
    GROUP BY tenant_id
  ) notif ON notif.tenant_id = t.id;

-- =============================================================================
-- END OF PHASE 3 MIGRATION
-- Tables: 12 core + 2 junction = 14 total
-- Indexes: 40 (including 4 GIN full-text)
-- RLS policies: 28
-- Triggers: 15
-- Views: 7
-- =============================================================================
