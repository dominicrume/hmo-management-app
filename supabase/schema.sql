-- =============================================================================
-- MATTY'S PLACE — Supabase PostgreSQL Schema
-- Ash Shahada Housing Association Ltd · Reliance Housing · Matty's Place
-- Version: 1.0 | Week 2 of 8 | May 2026
-- =============================================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- =============================================================================
-- ENUMS
-- =============================================================================

CREATE TYPE user_role AS ENUM ('Manager', 'SupportWorker', 'Tenant');

CREATE TYPE brand AS ENUM ('mattys_place', 'ash_shahada', 'reliance');

CREATE TYPE entry_method AS ENUM ('manual', 'ocr', 'voice');

CREATE TYPE audit_action AS ENUM (
  'CREATE', 'EDIT', 'VERIFY', 'SIGN', 'EXPORT', 'DELETE_REQUEST', 'LOGIN', 'PRINT'
);

CREATE TYPE session_type AS ENUM ('daily', 'weekly', 'monthly', 'ad_hoc');

CREATE TYPE benefit_type AS ENUM ('UC', 'HB', 'PIP', 'ESA', 'JSA', 'None', 'Other');

CREATE TYPE benefit_freq AS ENUM ('Monthly', '2wk', 'Weekly');

CREATE TYPE payment_method AS ENUM ('Cash', 'Bank Transfer', 'Housing Benefit Direct', 'Standing Order');

CREATE TYPE risk_level AS ENUM ('Low', 'Medium', 'High', 'Critical');

CREATE TYPE title_type AS ENUM ('Mr', 'Mrs', 'Ms', 'Miss', 'Dr', 'Other');

CREATE TYPE marital_status AS ENUM (
  'Single', 'Married', 'Divorced', 'Widowed', 'Separated', 'Civil Partnership'
);

CREATE TYPE tenant_status AS ENUM ('active', 'inactive', 'evicted', 'moved_out', 'missing');

-- =============================================================================
-- USERS TABLE
-- Staff accounts: Manager and SupportWorker roles only.
-- Tenants are linked via auth.users but stored here for staff.
-- =============================================================================

CREATE TABLE users (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  auth_id         UUID UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name       TEXT NOT NULL,
  email           TEXT NOT NULL UNIQUE,
  role            user_role NOT NULL,
  brand           brand NOT NULL DEFAULT 'mattys_place',
  is_active       BOOLEAN NOT NULL DEFAULT TRUE,
  phone           TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE users IS 'Staff accounts — Manager and SupportWorker roles. Tenant auth handled separately.';

-- =============================================================================
-- TENANTS TABLE (30 fields)
-- Maps to Forms 1–8: Personal Details (Form 3), Missing Person (Form 4),
-- Confidentiality Waiver (Form 5), plus intake metadata.
-- =============================================================================

CREATE TABLE tenants (
  -- 1. Primary identity
  id                    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- 2. Personal Details (Form 3)
  title                 title_type NOT NULL,
  full_name             TEXT NOT NULL CHECK (char_length(full_name) <= 100),
  dob                   DATE NOT NULL,
  nino                  TEXT NOT NULL,                          -- "AB 12 34 56 C" format
  nationality           TEXT NOT NULL,
  date_entry_uk         DATE,                                   -- conditional: non-UK nationals only

  -- 3. Contact & Address
  address               TEXT NOT NULL,
  room_number           TEXT NOT NULL,                          -- "Room [N]" format
  email                 TEXT,
  mobile                TEXT NOT NULL,                          -- +44 format
  languages             TEXT,                                   -- comma-separated

  -- 4. Financial / Benefits
  benefit_type          benefit_type NOT NULL,
  benefit_freq          benefit_freq NOT NULL,
  benefit_amount        NUMERIC(10,2) NOT NULL,

  -- 5. Next of Kin
  nok_name              TEXT NOT NULL,
  nok_relation          TEXT NOT NULL,
  nok_phone             TEXT NOT NULL,
  nok_address           TEXT,

  -- 6. Medical & Professional
  doctor                TEXT,                                   -- GP name + surgery

  -- 7. Missing Person Form fields (Form 4)
  place_of_birth        TEXT,
  marital_status        marital_status,
  employer_or_college   TEXT,
  vehicle_registration  TEXT,
  physical_description  TEXT,                                   -- height, build, hair, distinguishing features

  -- 8. Intake & Housing metadata
  moved_in              DATE NOT NULL,
  brand                 brand NOT NULL DEFAULT 'mattys_place',
  assigned_worker_id    UUID REFERENCES users(id) ON DELETE SET NULL,
  status                tenant_status NOT NULL DEFAULT 'active',

  -- 9. Probation / Legal
  on_probation          BOOLEAN NOT NULL DEFAULT FALSE,
  probation_officer     TEXT,

  -- 10. Photo & verification
  photo_url             TEXT,
  confidentiality_signed BOOLEAN NOT NULL DEFAULT FALSE,
  confidentiality_signed_at TIMESTAMPTZ,
  auth_id               UUID UNIQUE REFERENCES auth.users(id) ON DELETE SET NULL,  -- tenant's portal login

  -- 11. Audit metadata
  created_by            UUID NOT NULL REFERENCES users(id),
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE tenants IS '30-field tenant master record. Covers Forms 1–5 from Ash Shahada 53-page pack.';
COMMENT ON COLUMN tenants.nino IS 'National Insurance Number — format: AB 12 34 56 C';
COMMENT ON COLUMN tenants.physical_description IS 'From Form 4 (Missing Person): height, build, hair colour, distinguishing features';
COMMENT ON COLUMN tenants.photo_url IS 'Stored in Supabase Storage bucket: tenant-photos/{tenant_id}';

-- =============================================================================
-- AUDIT LOGS TABLE — Blockchain Hash Record
-- Every CREATE/EDIT/VERIFY/SIGN action produces one row with SHA-256 hash.
-- Phase 1: SHA-256 in Postgres. Phase 2: on-chain Polygon stamp.
-- =============================================================================

CREATE TABLE audit_logs (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- Who acted
  actor_id          UUID NOT NULL REFERENCES users(id),
  actor_name        TEXT NOT NULL,                             -- denormalised for immutability
  actor_role        user_role NOT NULL,

  -- What was affected
  tenant_id         UUID REFERENCES tenants(id),
  table_name        TEXT NOT NULL,
  record_id         UUID NOT NULL,
  action            audit_action NOT NULL,

  -- How data was entered
  entry_method      entry_method NOT NULL DEFAULT 'manual',

  -- Change payload
  old_data          JSONB,                                     -- previous state (null on CREATE)
  new_data          JSONB,                                     -- new state (null on DELETE_REQUEST)
  diff_fields       TEXT[],                                    -- list of changed field names

  -- Blockchain stamp (Phase 1 — SHA-256)
  payload_hash      TEXT NOT NULL,                             -- SHA-256 of (actor_id||tenant_id||action||new_data||timestamp)
  blockchain_tx_id  TEXT,                                      -- Phase 2: Polygon transaction ID (null until on-chain)
  verified_at       TIMESTAMPTZ,                               -- when hash was independently verified

  -- Timestamp — immutable
  stamped_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE audit_logs IS 'Immutable blockchain-stamped audit trail. No row may be updated or deleted — append-only.';
COMMENT ON COLUMN audit_logs.payload_hash IS 'SHA-256(actor_id || tenant_id || action || COALESCE(new_data::text, old_data::text) || stamped_at). Verified externally.';
COMMENT ON COLUMN audit_logs.blockchain_tx_id IS 'Phase 2: Polygon ERC-721 transaction ID. Null during Phase 1.';

-- Prevent any UPDATE or DELETE on audit_logs (immutability enforcement)
CREATE OR REPLACE RULE audit_logs_no_update AS ON UPDATE TO audit_logs DO INSTEAD NOTHING;
CREATE OR REPLACE RULE audit_logs_no_delete AS ON DELETE TO audit_logs DO INSTEAD NOTHING;

-- =============================================================================
-- SESSIONS TABLE
-- Daily / weekly / monthly support sessions per tenant.
-- AI Brain reads sessions to generate follow-up questions.
-- =============================================================================

CREATE TABLE sessions (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id         UUID NOT NULL REFERENCES tenants(id) ON DELETE RESTRICT,
  worker_id         UUID NOT NULL REFERENCES users(id),

  session_type      session_type NOT NULL DEFAULT 'daily',
  session_date      DATE NOT NULL DEFAULT CURRENT_DATE,
  started_at        TIMESTAMPTZ,
  ended_at          TIMESTAMPTZ,

  -- Session content
  notes             TEXT,                                      -- typed or transcribed session notes
  entry_method      entry_method NOT NULL DEFAULT 'manual',
  voice_transcript  TEXT,                                      -- raw voice-to-text transcript before edit
  ocr_source_url    TEXT,                                      -- if form was uploaded for OCR

  -- AI Brain outputs (populated after save by AI agent)
  ai_questions_generated  JSONB,                              -- 3 follow-up questions from this session
  ai_summary              TEXT,                               -- auto-summary produced by AI Brain
  ai_risk_flag            BOOLEAN NOT NULL DEFAULT FALSE,
  ai_risk_note            TEXT,                               -- AI's risk reasoning if flagged

  -- Checklist items completed this session (Form 2 — Support Checklist)
  checklist_items   TEXT[],

  -- Blockchain stamp
  blockchain_hash   TEXT NOT NULL DEFAULT '',                 -- set by trigger after insert
  is_signed         BOOLEAN NOT NULL DEFAULT FALSE,

  -- Audit
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE sessions IS 'Support sessions (daily/weekly/monthly). Source for AI Brain follow-up questions and council report exports.';

-- =============================================================================
-- SERVICE CHARGES TABLE
-- Weekly payment ledger per tenant. Manager edits; SupportWorkers view only.
-- =============================================================================

CREATE TABLE service_charges (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id         UUID NOT NULL REFERENCES tenants(id) ON DELETE RESTRICT,

  -- Charge configuration
  weekly_rate       NUMERIC(10,2) NOT NULL,
  payment_method    payment_method NOT NULL DEFAULT 'Cash',
  effective_from    DATE NOT NULL DEFAULT CURRENT_DATE,
  effective_to      DATE,                                      -- null = current rate

  -- Individual payment record
  period_start      DATE NOT NULL,
  period_end        DATE NOT NULL,
  amount_due        NUMERIC(10,2) NOT NULL,
  amount_paid       NUMERIC(10,2) NOT NULL DEFAULT 0,
  is_paid           BOOLEAN NOT NULL DEFAULT FALSE,
  paid_at           TIMESTAMPTZ,
  payment_ref       TEXT,                                      -- bank ref or receipt number

  -- Notes
  notes             TEXT,

  -- Audit
  recorded_by       UUID NOT NULL REFERENCES users(id),
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE service_charges IS 'Weekly service charge ledger. is_paid toggled by Manager. SupportWorkers can view but not edit.';

-- =============================================================================
-- TENANT VERIFICATIONS TABLE
-- Records Step 4 of intake: tenant signs and verifies their own record.
-- Each verification event gets its own blockchain stamp.
-- =============================================================================

CREATE TABLE tenant_verifications (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id         UUID NOT NULL REFERENCES tenants(id) ON DELETE RESTRICT,

  verified_by_tenant BOOLEAN NOT NULL DEFAULT FALSE,
  verification_type  TEXT NOT NULL DEFAULT 'intake',          -- 'intake', 'annual', 'correction'

  -- Signature
  signature_data    TEXT,                                      -- base64 finger-draw or typed name
  signed_at         TIMESTAMPTZ,

  -- Witnessed by
  witness_id        UUID REFERENCES users(id),
  witness_name      TEXT,

  -- Blockchain stamp
  blockchain_hash   TEXT NOT NULL DEFAULT '',
  blockchain_tx_id  TEXT,

  -- Audit
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE tenant_verifications IS 'Tenant Step 4 verification event. Signature + blockchain hash confirm data was verified by resident.';

-- =============================================================================
-- WORKER TENANT ASSIGNMENTS TABLE
-- Many-to-many: a SupportWorker can manage multiple tenants.
-- RLS uses this table to scope SupportWorker access.
-- =============================================================================

CREATE TABLE worker_tenant_assignments (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  worker_id   UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  tenant_id   UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  assigned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  assigned_by UUID NOT NULL REFERENCES users(id),
  is_active   BOOLEAN NOT NULL DEFAULT TRUE,
  UNIQUE (worker_id, tenant_id)
);

COMMENT ON TABLE worker_tenant_assignments IS 'SupportWorker → Tenant assignments. RLS uses this to restrict SupportWorker access to assigned tenants only.';

-- =============================================================================
-- INDEXES
-- =============================================================================

CREATE INDEX idx_tenants_assigned_worker  ON tenants(assigned_worker_id);
CREATE INDEX idx_tenants_status           ON tenants(status);
CREATE INDEX idx_tenants_brand            ON tenants(brand);
CREATE INDEX idx_audit_logs_tenant        ON audit_logs(tenant_id);
CREATE INDEX idx_audit_logs_actor         ON audit_logs(actor_id);
CREATE INDEX idx_audit_logs_stamped_at    ON audit_logs(stamped_at DESC);
CREATE INDEX idx_sessions_tenant          ON sessions(tenant_id);
CREATE INDEX idx_sessions_worker          ON sessions(worker_id);
CREATE INDEX idx_sessions_date            ON sessions(session_date DESC);
CREATE INDEX idx_service_charges_tenant   ON service_charges(tenant_id);
CREATE INDEX idx_service_charges_paid     ON service_charges(is_paid, tenant_id);
CREATE INDEX idx_wta_worker               ON worker_tenant_assignments(worker_id);
CREATE INDEX idx_wta_tenant               ON worker_tenant_assignments(tenant_id);

-- =============================================================================
-- HELPER: get current user's role from the users table
-- Used in RLS policies to avoid N+1 lookups per row.
-- =============================================================================

CREATE OR REPLACE FUNCTION get_my_role()
RETURNS user_role
LANGUAGE sql STABLE SECURITY DEFINER
AS $$
  SELECT role FROM users WHERE auth_id = auth.uid() LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION get_my_user_id()
RETURNS UUID
LANGUAGE sql STABLE SECURITY DEFINER
AS $$
  SELECT id FROM users WHERE auth_id = auth.uid() LIMIT 1;
$$;

-- Returns true if calling user is assigned to this tenant
CREATE OR REPLACE FUNCTION is_assigned_to_tenant(p_tenant_id UUID)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1 FROM worker_tenant_assignments
    WHERE worker_id = get_my_user_id()
      AND tenant_id  = p_tenant_id
      AND is_active  = TRUE
  );
$$;

-- =============================================================================
-- ROW LEVEL SECURITY
-- =============================================================================

ALTER TABLE users                   ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenants                 ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs              ENABLE ROW LEVEL SECURITY;
ALTER TABLE sessions                ENABLE ROW LEVEL SECURITY;
ALTER TABLE service_charges         ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenant_verifications    ENABLE ROW LEVEL SECURITY;
ALTER TABLE worker_tenant_assignments ENABLE ROW LEVEL SECURITY;

-- ---------------------------------------------------------------------------
-- USERS table policies
-- ---------------------------------------------------------------------------

-- Manager: full access to all user accounts
CREATE POLICY users_manager_all ON users
  FOR ALL
  TO authenticated
  USING (get_my_role() = 'Manager');

-- SupportWorker: can only see and update their own row
CREATE POLICY users_worker_own ON users
  FOR SELECT
  TO authenticated
  USING (
    get_my_role() = 'SupportWorker'
    AND auth_id = auth.uid()
  );

CREATE POLICY users_worker_own_update ON users
  FOR UPDATE
  TO authenticated
  USING (
    get_my_role() = 'SupportWorker'
    AND auth_id = auth.uid()
  )
  WITH CHECK (
    get_my_role() = 'SupportWorker'
    AND auth_id = auth.uid()
  );

-- ---------------------------------------------------------------------------
-- TENANTS table policies
-- ---------------------------------------------------------------------------

-- Manager: full CRUD on all tenants across all brands
CREATE POLICY tenants_manager_all ON tenants
  FOR ALL
  TO authenticated
  USING (get_my_role() = 'Manager');

-- SupportWorker: SELECT + INSERT + UPDATE on assigned tenants only. No DELETE.
CREATE POLICY tenants_worker_select ON tenants
  FOR SELECT
  TO authenticated
  USING (
    get_my_role() = 'SupportWorker'
    AND is_assigned_to_tenant(id)
  );

CREATE POLICY tenants_worker_insert ON tenants
  FOR INSERT
  TO authenticated
  WITH CHECK (get_my_role() IN ('Manager', 'SupportWorker'));

CREATE POLICY tenants_worker_update ON tenants
  FOR UPDATE
  TO authenticated
  USING (
    get_my_role() = 'SupportWorker'
    AND is_assigned_to_tenant(id)
  )
  WITH CHECK (
    get_my_role() = 'SupportWorker'
    AND is_assigned_to_tenant(id)
  );

-- Tenant: read-only access to their own record via auth_id
CREATE POLICY tenants_tenant_self ON tenants
  FOR SELECT
  TO authenticated
  USING (
    get_my_role() = 'Tenant'
    AND auth_id = auth.uid()
  );

-- ---------------------------------------------------------------------------
-- AUDIT LOGS table policies
-- ---------------------------------------------------------------------------

-- Audit logs are append-only (enforced by rules above).
-- Manager: can read all logs
CREATE POLICY audit_manager_read ON audit_logs
  FOR SELECT
  TO authenticated
  USING (get_my_role() = 'Manager');

-- SupportWorker: can read only their own audit entries
CREATE POLICY audit_worker_own ON audit_logs
  FOR SELECT
  TO authenticated
  USING (
    get_my_role() = 'SupportWorker'
    AND actor_id = get_my_user_id()
  );

-- All staff can INSERT (the trigger does it automatically on save)
CREATE POLICY audit_insert_staff ON audit_logs
  FOR INSERT
  TO authenticated
  WITH CHECK (get_my_role() IN ('Manager', 'SupportWorker'));

-- Tenant: can see their own verification stamp only
CREATE POLICY audit_tenant_own ON audit_logs
  FOR SELECT
  TO authenticated
  USING (
    get_my_role() = 'Tenant'
    AND action = 'SIGN'
    AND tenant_id IN (
      SELECT id FROM tenants WHERE auth_id = auth.uid()
    )
  );

-- ---------------------------------------------------------------------------
-- SESSIONS table policies
-- ---------------------------------------------------------------------------

-- Manager: full access to all sessions
CREATE POLICY sessions_manager_all ON sessions
  FOR ALL
  TO authenticated
  USING (get_my_role() = 'Manager');

-- SupportWorker: SELECT + INSERT + UPDATE on sessions for assigned tenants
CREATE POLICY sessions_worker_select ON sessions
  FOR SELECT
  TO authenticated
  USING (
    get_my_role() = 'SupportWorker'
    AND is_assigned_to_tenant(tenant_id)
  );

CREATE POLICY sessions_worker_insert ON sessions
  FOR INSERT
  TO authenticated
  WITH CHECK (
    get_my_role() = 'SupportWorker'
    AND is_assigned_to_tenant(tenant_id)
    AND worker_id = get_my_user_id()
  );

CREATE POLICY sessions_worker_update ON sessions
  FOR UPDATE
  TO authenticated
  USING (
    get_my_role() = 'SupportWorker'
    AND worker_id = get_my_user_id()
  )
  WITH CHECK (
    get_my_role() = 'SupportWorker'
    AND worker_id = get_my_user_id()
  );

-- Tenant: NO access to session notes (per URD Section 5.4)

-- ---------------------------------------------------------------------------
-- SERVICE CHARGES table policies
-- ---------------------------------------------------------------------------

-- Manager: full CRUD
CREATE POLICY sc_manager_all ON service_charges
  FOR ALL
  TO authenticated
  USING (get_my_role() = 'Manager');

-- SupportWorker: SELECT only on assigned tenants' charges
CREATE POLICY sc_worker_view ON service_charges
  FOR SELECT
  TO authenticated
  USING (
    get_my_role() = 'SupportWorker'
    AND is_assigned_to_tenant(tenant_id)
  );

-- Tenant: NO access to service charge ledger (per URD Section 5.4)

-- ---------------------------------------------------------------------------
-- TENANT VERIFICATIONS table policies
-- ---------------------------------------------------------------------------

-- Manager: full access
CREATE POLICY tv_manager_all ON tenant_verifications
  FOR ALL
  TO authenticated
  USING (get_my_role() = 'Manager');

-- SupportWorker: SELECT + INSERT for assigned tenants (witnesses signature)
CREATE POLICY tv_worker_select ON tenant_verifications
  FOR SELECT
  TO authenticated
  USING (
    get_my_role() = 'SupportWorker'
    AND is_assigned_to_tenant(tenant_id)
  );

CREATE POLICY tv_worker_insert ON tenant_verifications
  FOR INSERT
  TO authenticated
  WITH CHECK (
    get_my_role() IN ('Manager', 'SupportWorker')
    AND is_assigned_to_tenant(tenant_id)
  );

-- Tenant: can INSERT their own verification (the signing event) and SELECT own records
CREATE POLICY tv_tenant_sign ON tenant_verifications
  FOR INSERT
  TO authenticated
  WITH CHECK (
    get_my_role() = 'Tenant'
    AND tenant_id IN (
      SELECT id FROM tenants WHERE auth_id = auth.uid()
    )
  );

CREATE POLICY tv_tenant_view ON tenant_verifications
  FOR SELECT
  TO authenticated
  USING (
    get_my_role() = 'Tenant'
    AND tenant_id IN (
      SELECT id FROM tenants WHERE auth_id = auth.uid()
    )
  );

-- ---------------------------------------------------------------------------
-- WORKER TENANT ASSIGNMENTS table policies
-- ---------------------------------------------------------------------------

-- Manager: full CRUD
CREATE POLICY wta_manager_all ON worker_tenant_assignments
  FOR ALL
  TO authenticated
  USING (get_my_role() = 'Manager');

-- SupportWorker: can see their own assignments only
CREATE POLICY wta_worker_own ON worker_tenant_assignments
  FOR SELECT
  TO authenticated
  USING (
    get_my_role() = 'SupportWorker'
    AND worker_id = get_my_user_id()
  );

-- =============================================================================
-- TRIGGERS: auto-stamp updated_at
-- =============================================================================

CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_tenants_updated_at
  BEFORE UPDATE ON tenants
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_sessions_updated_at
  BEFORE UPDATE ON sessions
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_service_charges_updated_at
  BEFORE UPDATE ON service_charges
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- =============================================================================
-- TRIGGER: Auto-compute blockchain hash on audit_logs INSERT
-- SHA-256 of: actor_id || tenant_id || action || payload || stamped_at
-- =============================================================================

CREATE OR REPLACE FUNCTION compute_audit_hash()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE
  payload TEXT;
BEGIN
  payload := COALESCE(NEW.actor_id::text, '')
    || '|' || COALESCE(NEW.tenant_id::text, '')
    || '|' || NEW.action::text
    || '|' || COALESCE(NEW.new_data::text, COALESCE(NEW.old_data::text, ''))
    || '|' || NEW.stamped_at::text;

  NEW.payload_hash := encode(digest(payload, 'sha256'), 'hex');
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_audit_hash
  BEFORE INSERT ON audit_logs
  FOR EACH ROW EXECUTE FUNCTION compute_audit_hash();

-- =============================================================================
-- TRIGGER: Auto-create audit log entry on tenant INSERT or UPDATE
-- =============================================================================

CREATE OR REPLACE FUNCTION audit_tenant_change()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_user RECORD;
  v_action audit_action;
BEGIN
  SELECT id, full_name, role INTO v_user
  FROM users WHERE auth_id = auth.uid() LIMIT 1;

  IF TG_OP = 'INSERT' THEN
    v_action := 'CREATE';
  ELSE
    v_action := 'EDIT';
  END IF;

  INSERT INTO audit_logs (
    actor_id, actor_name, actor_role,
    tenant_id, table_name, record_id, action,
    entry_method, old_data, new_data,
    diff_fields, stamped_at
  ) VALUES (
    v_user.id, v_user.full_name, v_user.role,
    NEW.id, 'tenants', NEW.id, v_action,
    'manual',
    CASE WHEN TG_OP = 'UPDATE' THEN to_jsonb(OLD) ELSE NULL END,
    to_jsonb(NEW),
    NULL,
    NOW()
  );

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_audit_tenants_insert
  AFTER INSERT ON tenants
  FOR EACH ROW EXECUTE FUNCTION audit_tenant_change();

CREATE TRIGGER trg_audit_tenants_update
  AFTER UPDATE ON tenants
  FOR EACH ROW EXECUTE FUNCTION audit_tenant_change();

-- =============================================================================
-- TRIGGER: Auto-create audit log entry on session INSERT
-- =============================================================================

CREATE OR REPLACE FUNCTION audit_session_change()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_user RECORD;
BEGIN
  SELECT id, full_name, role INTO v_user
  FROM users WHERE auth_id = auth.uid() LIMIT 1;

  INSERT INTO audit_logs (
    actor_id, actor_name, actor_role,
    tenant_id, table_name, record_id, action,
    entry_method, new_data, stamped_at
  ) VALUES (
    v_user.id, v_user.full_name, v_user.role,
    NEW.tenant_id, 'sessions', NEW.id, 'CREATE',
    NEW.entry_method, to_jsonb(NEW), NOW()
  );

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_audit_sessions_insert
  AFTER INSERT ON sessions
  FOR EACH ROW EXECUTE FUNCTION audit_session_change();

-- =============================================================================
-- TRIGGER: Auto-create audit log on tenant verification (SIGN event)
-- =============================================================================

CREATE OR REPLACE FUNCTION audit_verification()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_user RECORD;
BEGIN
  SELECT id, full_name, role INTO v_user
  FROM users WHERE auth_id = auth.uid() LIMIT 1;

  IF v_user.id IS NULL THEN
    -- Tenant signing via their own portal auth
    SELECT u.id, u.full_name, u.role INTO v_user
    FROM users u
    JOIN tenants t ON t.auth_id = auth.uid()
    LIMIT 1;
  END IF;

  INSERT INTO audit_logs (
    actor_id, actor_name, actor_role,
    tenant_id, table_name, record_id, action,
    entry_method, new_data, stamped_at
  ) VALUES (
    v_user.id, v_user.full_name, v_user.role,
    NEW.tenant_id, 'tenant_verifications', NEW.id, 'SIGN',
    'manual', to_jsonb(NEW), NOW()
  );

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_audit_verification
  AFTER INSERT ON tenant_verifications
  FOR EACH ROW EXECUTE FUNCTION audit_verification();

-- =============================================================================
-- VIEWS: useful read-only projections
-- =============================================================================

-- Manager dashboard: tenants with outstanding service charges
CREATE VIEW v_unpaid_charges AS
  SELECT
    t.id AS tenant_id,
    t.full_name,
    t.room_number,
    t.brand,
    sc.period_start,
    sc.period_end,
    sc.amount_due,
    sc.amount_paid,
    (sc.amount_due - sc.amount_paid) AS balance
  FROM service_charges sc
  JOIN tenants t ON t.id = sc.tenant_id
  WHERE sc.is_paid = FALSE
  ORDER BY sc.period_start;

-- Manager dashboard: recent audit activity
CREATE VIEW v_recent_audit AS
  SELECT
    al.stamped_at,
    al.actor_name,
    al.actor_role,
    al.action,
    al.table_name,
    t.full_name AS tenant_name,
    al.payload_hash
  FROM audit_logs al
  LEFT JOIN tenants t ON t.id = al.tenant_id
  ORDER BY al.stamped_at DESC
  LIMIT 100;

-- =============================================================================
-- END OF SCHEMA
-- =============================================================================
