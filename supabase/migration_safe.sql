-- =============================================================================
-- MATTY'S PLACE — SAFE MIGRATION (idempotent — run even if schema partially exists)
-- Run this in Supabase SQL Editor for project gjfbjyrhkblqdcsmmckb
-- =============================================================================

-- Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ENUMS — wrapped in DO blocks so they skip if already present
DO $$ BEGIN CREATE TYPE user_role    AS ENUM ('Manager', 'SupportWorker', 'Tenant'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE brand        AS ENUM ('mattys_place', 'ash_shahada', 'reliance'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE entry_method AS ENUM ('manual', 'ocr', 'voice'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE audit_action AS ENUM ('CREATE', 'EDIT', 'VERIFY', 'SIGN', 'EXPORT', 'DELETE_REQUEST', 'LOGIN', 'PRINT'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE session_type AS ENUM ('daily', 'weekly', 'monthly', 'ad_hoc'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE benefit_type AS ENUM ('UC', 'HB', 'PIP', 'ESA', 'JSA', 'None', 'Other'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE benefit_freq AS ENUM ('Monthly', '2wk', 'Weekly'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE payment_method AS ENUM ('Cash', 'Bank Transfer', 'Housing Benefit Direct', 'Standing Order'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE risk_level   AS ENUM ('Low', 'Medium', 'High', 'Critical'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE title_type   AS ENUM ('Mr', 'Mrs', 'Ms', 'Miss', 'Dr', 'Other'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE marital_status AS ENUM ('Single', 'Married', 'Divorced', 'Widowed', 'Separated', 'Civil Partnership'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE tenant_status AS ENUM ('active', 'inactive', 'evicted', 'moved_out', 'missing'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- TABLES
CREATE TABLE IF NOT EXISTS users (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  auth_id     UUID UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name   TEXT NOT NULL,
  email       TEXT NOT NULL UNIQUE,
  role        user_role NOT NULL,
  brand       brand NOT NULL DEFAULT 'mattys_place',
  is_active   BOOLEAN NOT NULL DEFAULT TRUE,
  phone       TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS tenants (
  id                    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title                 title_type NOT NULL,
  full_name             TEXT NOT NULL CHECK (char_length(full_name) <= 100),
  dob                   DATE NOT NULL,
  nino                  TEXT NOT NULL,
  nationality           TEXT NOT NULL,
  date_entry_uk         DATE,
  address               TEXT NOT NULL,
  room_number           TEXT NOT NULL,
  email                 TEXT,
  mobile                TEXT NOT NULL,
  languages             TEXT,
  benefit_type          benefit_type NOT NULL,
  benefit_freq          benefit_freq NOT NULL,
  benefit_amount        NUMERIC(10,2) NOT NULL,
  nok_name              TEXT NOT NULL,
  nok_relation          TEXT NOT NULL,
  nok_phone             TEXT NOT NULL,
  doctor                TEXT,
  place_of_birth        TEXT,
  marital_status        marital_status,
  employer_or_college   TEXT,
  vehicle_registration  TEXT,
  physical_description  TEXT,
  moved_in              DATE NOT NULL,
  brand                 brand NOT NULL DEFAULT 'mattys_place',
  assigned_worker_id    UUID REFERENCES users(id) ON DELETE SET NULL,
  status                tenant_status NOT NULL DEFAULT 'active',
  on_probation          BOOLEAN NOT NULL DEFAULT FALSE,
  probation_officer     TEXT,
  photo_url             TEXT,
  confidentiality_signed     BOOLEAN NOT NULL DEFAULT FALSE,
  confidentiality_signed_at  TIMESTAMPTZ,
  auth_id               UUID UNIQUE REFERENCES auth.users(id) ON DELETE SET NULL,
  created_by            UUID NOT NULL REFERENCES users(id),
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS audit_logs (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  actor_id         UUID NOT NULL REFERENCES users(id),
  actor_name       TEXT NOT NULL,
  actor_role       user_role NOT NULL,
  tenant_id        UUID REFERENCES tenants(id),
  table_name       TEXT NOT NULL,
  record_id        UUID NOT NULL,
  action           audit_action NOT NULL,
  entry_method     entry_method NOT NULL DEFAULT 'manual',
  old_data         JSONB,
  new_data         JSONB,
  diff_fields      TEXT[],
  payload_hash     TEXT NOT NULL DEFAULT '',
  blockchain_tx_id TEXT,
  verified_at      TIMESTAMPTZ,
  stamped_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

DO $$ BEGIN
  CREATE OR REPLACE RULE audit_logs_no_update AS ON UPDATE TO audit_logs DO INSTEAD NOTHING;
EXCEPTION WHEN undefined_table THEN NULL; END $$;
DO $$ BEGIN
  CREATE OR REPLACE RULE audit_logs_no_delete AS ON DELETE TO audit_logs DO INSTEAD NOTHING;
EXCEPTION WHEN undefined_table THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS sessions (
  id                     UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id              UUID NOT NULL REFERENCES tenants(id) ON DELETE RESTRICT,
  worker_id              UUID NOT NULL REFERENCES users(id),
  session_type           session_type NOT NULL DEFAULT 'daily',
  session_date           DATE NOT NULL DEFAULT CURRENT_DATE,
  started_at             TIMESTAMPTZ,
  ended_at               TIMESTAMPTZ,
  notes                  TEXT,
  entry_method           entry_method NOT NULL DEFAULT 'manual',
  voice_transcript       TEXT,
  ocr_source_url         TEXT,
  ai_questions_generated JSONB,
  ai_summary             TEXT,
  ai_risk_flag           BOOLEAN NOT NULL DEFAULT FALSE,
  ai_risk_note           TEXT,
  checklist_items        TEXT[],
  blockchain_hash        TEXT NOT NULL DEFAULT '',
  is_signed              BOOLEAN NOT NULL DEFAULT FALSE,
  created_at             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at             TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS service_charges (
  id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id      UUID NOT NULL REFERENCES tenants(id) ON DELETE RESTRICT,
  weekly_rate    NUMERIC(10,2) NOT NULL,
  payment_method payment_method NOT NULL DEFAULT 'Cash',
  effective_from DATE NOT NULL DEFAULT CURRENT_DATE,
  effective_to   DATE,
  period_start   DATE NOT NULL,
  period_end     DATE NOT NULL,
  amount_due     NUMERIC(10,2) NOT NULL,
  amount_paid    NUMERIC(10,2) NOT NULL DEFAULT 0,
  is_paid        BOOLEAN NOT NULL DEFAULT FALSE,
  paid_at        TIMESTAMPTZ,
  payment_ref    TEXT,
  notes          TEXT,
  recorded_by    UUID NOT NULL REFERENCES users(id),
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS tenant_verifications (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id           UUID NOT NULL REFERENCES tenants(id) ON DELETE RESTRICT,
  verified_by_tenant  BOOLEAN NOT NULL DEFAULT FALSE,
  verification_type   TEXT NOT NULL DEFAULT 'intake',
  signature_data      TEXT,
  signed_at           TIMESTAMPTZ,
  witness_id          UUID REFERENCES users(id),
  witness_name        TEXT,
  blockchain_hash     TEXT NOT NULL DEFAULT '',
  blockchain_tx_id    TEXT,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS worker_tenant_assignments (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  worker_id   UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  tenant_id   UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  assigned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  assigned_by UUID NOT NULL REFERENCES users(id),
  is_active   BOOLEAN NOT NULL DEFAULT TRUE,
  UNIQUE (worker_id, tenant_id)
);

-- INDEXES (IF NOT EXISTS)
CREATE INDEX IF NOT EXISTS idx_tenants_assigned_worker  ON tenants(assigned_worker_id);
CREATE INDEX IF NOT EXISTS idx_tenants_status           ON tenants(status);
CREATE INDEX IF NOT EXISTS idx_tenants_brand            ON tenants(brand);
CREATE INDEX IF NOT EXISTS idx_audit_logs_tenant        ON audit_logs(tenant_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_actor         ON audit_logs(actor_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_stamped_at    ON audit_logs(stamped_at DESC);
CREATE INDEX IF NOT EXISTS idx_sessions_tenant          ON sessions(tenant_id);
CREATE INDEX IF NOT EXISTS idx_sessions_worker          ON sessions(worker_id);
CREATE INDEX IF NOT EXISTS idx_sessions_date            ON sessions(session_date DESC);
CREATE INDEX IF NOT EXISTS idx_service_charges_tenant   ON service_charges(tenant_id);
CREATE INDEX IF NOT EXISTS idx_service_charges_paid     ON service_charges(is_paid, tenant_id);
CREATE INDEX IF NOT EXISTS idx_wta_worker               ON worker_tenant_assignments(worker_id);
CREATE INDEX IF NOT EXISTS idx_wta_tenant               ON worker_tenant_assignments(tenant_id);

-- HELPER FUNCTIONS (CREATE OR REPLACE — always safe)
CREATE OR REPLACE FUNCTION get_my_role()
RETURNS user_role LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT role FROM users WHERE auth_id = auth.uid() LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION get_my_user_id()
RETURNS UUID LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT id FROM users WHERE auth_id = auth.uid() LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION is_assigned_to_tenant(p_tenant_id UUID)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT EXISTS (
    SELECT 1 FROM worker_tenant_assignments
    WHERE worker_id = get_my_user_id() AND tenant_id = p_tenant_id AND is_active = TRUE
  );
$$;

-- RLS
ALTER TABLE users                     ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenants                   ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs                ENABLE ROW LEVEL SECURITY;
ALTER TABLE sessions                  ENABLE ROW LEVEL SECURITY;
ALTER TABLE service_charges           ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenant_verifications      ENABLE ROW LEVEL SECURITY;
ALTER TABLE worker_tenant_assignments ENABLE ROW LEVEL SECURITY;

-- POLICIES — drop first so re-running is safe
DROP POLICY IF EXISTS users_manager_all         ON users;
DROP POLICY IF EXISTS users_worker_own          ON users;
DROP POLICY IF EXISTS users_worker_own_update   ON users;
DROP POLICY IF EXISTS tenants_manager_all       ON tenants;
DROP POLICY IF EXISTS tenants_worker_select     ON tenants;
DROP POLICY IF EXISTS tenants_worker_insert     ON tenants;
DROP POLICY IF EXISTS tenants_worker_update     ON tenants;
DROP POLICY IF EXISTS tenants_tenant_self       ON tenants;
DROP POLICY IF EXISTS audit_manager_read        ON audit_logs;
DROP POLICY IF EXISTS audit_worker_own          ON audit_logs;
DROP POLICY IF EXISTS audit_insert_staff        ON audit_logs;
DROP POLICY IF EXISTS audit_tenant_own          ON audit_logs;
DROP POLICY IF EXISTS sessions_manager_all      ON sessions;
DROP POLICY IF EXISTS sessions_worker_select    ON sessions;
DROP POLICY IF EXISTS sessions_worker_insert    ON sessions;
DROP POLICY IF EXISTS sessions_worker_update    ON sessions;
DROP POLICY IF EXISTS sc_manager_all            ON service_charges;
DROP POLICY IF EXISTS sc_worker_view            ON service_charges;
DROP POLICY IF EXISTS tv_manager_all            ON tenant_verifications;
DROP POLICY IF EXISTS tv_worker_select          ON tenant_verifications;
DROP POLICY IF EXISTS tv_worker_insert          ON tenant_verifications;
DROP POLICY IF EXISTS tv_tenant_sign            ON tenant_verifications;
DROP POLICY IF EXISTS tv_tenant_view            ON tenant_verifications;
DROP POLICY IF EXISTS wta_manager_all           ON worker_tenant_assignments;
DROP POLICY IF EXISTS wta_worker_own            ON worker_tenant_assignments;

CREATE POLICY users_manager_all       ON users FOR ALL       TO authenticated USING (get_my_role() = 'Manager');
CREATE POLICY users_worker_own        ON users FOR SELECT    TO authenticated USING (get_my_role() = 'SupportWorker' AND auth_id = auth.uid());
CREATE POLICY users_worker_own_update ON users FOR UPDATE    TO authenticated USING (get_my_role() = 'SupportWorker' AND auth_id = auth.uid()) WITH CHECK (get_my_role() = 'SupportWorker' AND auth_id = auth.uid());

CREATE POLICY tenants_manager_all     ON tenants FOR ALL     TO authenticated USING (get_my_role() = 'Manager');
CREATE POLICY tenants_worker_select   ON tenants FOR SELECT  TO authenticated USING (get_my_role() = 'SupportWorker' AND is_assigned_to_tenant(id));
CREATE POLICY tenants_worker_insert   ON tenants FOR INSERT  TO authenticated WITH CHECK (get_my_role() IN ('Manager', 'SupportWorker'));
CREATE POLICY tenants_worker_update   ON tenants FOR UPDATE  TO authenticated USING (get_my_role() = 'SupportWorker' AND is_assigned_to_tenant(id)) WITH CHECK (get_my_role() = 'SupportWorker' AND is_assigned_to_tenant(id));
CREATE POLICY tenants_tenant_self     ON tenants FOR SELECT  TO authenticated USING (get_my_role() = 'Tenant' AND auth_id = auth.uid());

CREATE POLICY audit_manager_read      ON audit_logs FOR SELECT TO authenticated USING (get_my_role() = 'Manager');
CREATE POLICY audit_worker_own        ON audit_logs FOR SELECT TO authenticated USING (get_my_role() = 'SupportWorker' AND actor_id = get_my_user_id());
CREATE POLICY audit_insert_staff      ON audit_logs FOR INSERT TO authenticated WITH CHECK (get_my_role() IN ('Manager', 'SupportWorker'));
CREATE POLICY audit_tenant_own        ON audit_logs FOR SELECT TO authenticated USING (get_my_role() = 'Tenant' AND action = 'SIGN' AND tenant_id IN (SELECT id FROM tenants WHERE auth_id = auth.uid()));

CREATE POLICY sessions_manager_all    ON sessions FOR ALL     TO authenticated USING (get_my_role() = 'Manager');
CREATE POLICY sessions_worker_select  ON sessions FOR SELECT  TO authenticated USING (get_my_role() = 'SupportWorker' AND is_assigned_to_tenant(tenant_id));
CREATE POLICY sessions_worker_insert  ON sessions FOR INSERT  TO authenticated WITH CHECK (get_my_role() = 'SupportWorker' AND is_assigned_to_tenant(tenant_id) AND worker_id = get_my_user_id());
CREATE POLICY sessions_worker_update  ON sessions FOR UPDATE  TO authenticated USING (get_my_role() = 'SupportWorker' AND worker_id = get_my_user_id()) WITH CHECK (get_my_role() = 'SupportWorker' AND worker_id = get_my_user_id());

CREATE POLICY sc_manager_all          ON service_charges FOR ALL    TO authenticated USING (get_my_role() = 'Manager');
CREATE POLICY sc_worker_view          ON service_charges FOR SELECT TO authenticated USING (get_my_role() = 'SupportWorker' AND is_assigned_to_tenant(tenant_id));

CREATE POLICY tv_manager_all          ON tenant_verifications FOR ALL    TO authenticated USING (get_my_role() = 'Manager');
CREATE POLICY tv_worker_select        ON tenant_verifications FOR SELECT TO authenticated USING (get_my_role() = 'SupportWorker' AND is_assigned_to_tenant(tenant_id));
CREATE POLICY tv_worker_insert        ON tenant_verifications FOR INSERT TO authenticated WITH CHECK (get_my_role() IN ('Manager', 'SupportWorker') AND is_assigned_to_tenant(tenant_id));
CREATE POLICY tv_tenant_sign          ON tenant_verifications FOR INSERT TO authenticated WITH CHECK (get_my_role() = 'Tenant' AND tenant_id IN (SELECT id FROM tenants WHERE auth_id = auth.uid()));
CREATE POLICY tv_tenant_view          ON tenant_verifications FOR SELECT TO authenticated USING (get_my_role() = 'Tenant' AND tenant_id IN (SELECT id FROM tenants WHERE auth_id = auth.uid()));

CREATE POLICY wta_manager_all         ON worker_tenant_assignments FOR ALL    TO authenticated USING (get_my_role() = 'Manager');
CREATE POLICY wta_worker_own          ON worker_tenant_assignments FOR SELECT TO authenticated USING (get_my_role() = 'SupportWorker' AND worker_id = get_my_user_id());

-- TRIGGERS
CREATE OR REPLACE FUNCTION set_updated_at() RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END; $$;

DROP TRIGGER IF EXISTS trg_tenants_updated_at        ON tenants;
DROP TRIGGER IF EXISTS trg_sessions_updated_at       ON sessions;
DROP TRIGGER IF EXISTS trg_service_charges_updated_at ON service_charges;
DROP TRIGGER IF EXISTS trg_users_updated_at          ON users;

CREATE TRIGGER trg_tenants_updated_at        BEFORE UPDATE ON tenants        FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_sessions_updated_at       BEFORE UPDATE ON sessions       FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_service_charges_updated_at BEFORE UPDATE ON service_charges FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_users_updated_at          BEFORE UPDATE ON users          FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- BLOCKCHAIN HASH TRIGGER
CREATE OR REPLACE FUNCTION compute_audit_hash() RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE payload TEXT;
BEGIN
  payload := COALESCE(NEW.actor_id::text,'') || '|' || COALESCE(NEW.tenant_id::text,'') || '|' || NEW.action::text || '|' || COALESCE(NEW.new_data::text, COALESCE(NEW.old_data::text,'')) || '|' || NEW.stamped_at::text;
  NEW.payload_hash := encode(digest(payload, 'sha256'), 'hex');
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS trg_audit_hash ON audit_logs;
CREATE TRIGGER trg_audit_hash BEFORE INSERT ON audit_logs FOR EACH ROW EXECUTE FUNCTION compute_audit_hash();

-- AUTO AUDIT TRIGGERS
CREATE OR REPLACE FUNCTION audit_tenant_change() RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE v_user RECORD; v_action audit_action;
BEGIN
  SELECT id, full_name, role INTO v_user FROM users WHERE auth_id = auth.uid() LIMIT 1;
  IF v_user.id IS NULL THEN RETURN NEW; END IF;
  IF TG_OP = 'INSERT' THEN v_action := 'CREATE'; ELSE v_action := 'EDIT'; END IF;
  INSERT INTO audit_logs (actor_id, actor_name, actor_role, tenant_id, table_name, record_id, action, entry_method, old_data, new_data, stamped_at)
  VALUES (v_user.id, v_user.full_name, v_user.role, NEW.id, 'tenants', NEW.id, v_action, 'manual', CASE WHEN TG_OP='UPDATE' THEN to_jsonb(OLD) ELSE NULL END, to_jsonb(NEW), NOW());
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS trg_audit_tenants_insert ON tenants;
DROP TRIGGER IF EXISTS trg_audit_tenants_update ON tenants;
CREATE TRIGGER trg_audit_tenants_insert AFTER INSERT ON tenants FOR EACH ROW EXECUTE FUNCTION audit_tenant_change();
CREATE TRIGGER trg_audit_tenants_update AFTER UPDATE ON tenants FOR EACH ROW EXECUTE FUNCTION audit_tenant_change();

CREATE OR REPLACE FUNCTION audit_session_change() RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE v_user RECORD;
BEGIN
  SELECT id, full_name, role INTO v_user FROM users WHERE auth_id = auth.uid() LIMIT 1;
  IF v_user.id IS NULL THEN RETURN NEW; END IF;
  INSERT INTO audit_logs (actor_id, actor_name, actor_role, tenant_id, table_name, record_id, action, entry_method, new_data, stamped_at)
  VALUES (v_user.id, v_user.full_name, v_user.role, NEW.tenant_id, 'sessions', NEW.id, 'CREATE', NEW.entry_method, to_jsonb(NEW), NOW());
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS trg_audit_sessions_insert ON sessions;
CREATE TRIGGER trg_audit_sessions_insert AFTER INSERT ON sessions FOR EACH ROW EXECUTE FUNCTION audit_session_change();

-- VIEWS
CREATE OR REPLACE VIEW v_unpaid_charges AS
  SELECT t.id AS tenant_id, t.full_name, t.room_number, t.brand, sc.period_start, sc.period_end, sc.amount_due, sc.amount_paid, (sc.amount_due - sc.amount_paid) AS balance
  FROM service_charges sc JOIN tenants t ON t.id = sc.tenant_id WHERE sc.is_paid = FALSE ORDER BY sc.period_start;

CREATE OR REPLACE VIEW v_recent_audit AS
  SELECT al.stamped_at, al.actor_name, al.actor_role, al.action, al.table_name, t.full_name AS tenant_name, al.payload_hash
  FROM audit_logs al LEFT JOIN tenants t ON t.id = al.tenant_id ORDER BY al.stamped_at DESC LIMIT 100;

-- =============================================================================
-- CREATE YOUR MANAGER ACCOUNT
-- This inserts your Manager row so RLS unlocks for your login.
-- =============================================================================
INSERT INTO users (auth_id, full_name, email, role, brand)
SELECT
  id,
  COALESCE(raw_user_meta_data->>'full_name', split_part(email, '@', 1)),
  email,
  'Manager',
  'mattys_place'
FROM auth.users
WHERE email = 'dominicrume@gmail.com'
ON CONFLICT (auth_id) DO NOTHING;
