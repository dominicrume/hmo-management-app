-- =============================================================================
-- MATTY'S PLACE — SCHEMA UPGRADE V2 (idempotent patch)
-- Run AFTER migration_safe.sql in Supabase SQL Editor
-- Adds: properties, rooms, tenancy_agreements, documents, housing_claims,
--        payment_transactions, notifications, system_settings, user_invitations
-- =============================================================================

-- NEW ENUMS
DO $$ BEGIN CREATE TYPE property_type   AS ENUM ('HMO', 'Supported', 'Semi-Independent', 'Hostel'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE room_status     AS ENUM ('available', 'occupied', 'maintenance', 'reserved'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE agreement_status AS ENUM ('active', 'expired', 'terminated', 'pending'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE doc_category    AS ENUM ('id', 'proof_of_income', 'tenancy', 'medical', 'safeguarding', 'council_report', 'photo', 'other'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE claim_status    AS ENUM ('draft', 'submitted', 'under_review', 'approved', 'rejected', 'paid', 'appealed'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE claim_type      AS ENUM ('housing_benefit', 'universal_credit_housing', 'discretionary_housing', 'service_charge_dispute', 'deposit_return', 'other'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE txn_status      AS ENUM ('pending', 'completed', 'failed', 'refunded', 'cancelled'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE txn_type        AS ENUM ('rent', 'service_charge', 'deposit', 'arrears_repayment', 'refund', 'adjustment'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE notif_type      AS ENUM ('info', 'warning', 'action_required', 'payment', 'claim', 'system'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE invite_status   AS ENUM ('pending', 'accepted', 'expired', 'revoked'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- =============================================================================
-- 1. PROPERTIES — HMO buildings managed by the association
-- =============================================================================
CREATE TABLE IF NOT EXISTS properties (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name            TEXT NOT NULL,
  address_line_1  TEXT NOT NULL,
  address_line_2  TEXT,
  city            TEXT NOT NULL DEFAULT 'Birmingham',
  postcode        TEXT NOT NULL,
  property_type   property_type NOT NULL DEFAULT 'HMO',
  brand           brand NOT NULL DEFAULT 'mattys_place',
  license_number  TEXT,
  license_expiry  DATE,
  max_occupants   INT NOT NULL DEFAULT 6,
  manager_id      UUID REFERENCES users(id) ON DELETE SET NULL,
  is_active       BOOLEAN NOT NULL DEFAULT TRUE,
  notes           TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE properties IS 'HMO properties managed across Matty''s Place, Ash Shahada, and Reliance Housing brands.';

-- =============================================================================
-- 2. ROOMS — individual lettable units within a property
-- =============================================================================
CREATE TABLE IF NOT EXISTS rooms (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  property_id     UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  room_number     TEXT NOT NULL,
  floor           INT DEFAULT 0,
  room_status     room_status NOT NULL DEFAULT 'available',
  weekly_rate     NUMERIC(10,2) NOT NULL DEFAULT 0,
  current_tenant_id UUID REFERENCES tenants(id) ON DELETE SET NULL,
  facilities      TEXT[],
  notes           TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (property_id, room_number)
);

COMMENT ON TABLE rooms IS 'Individual rooms/units within an HMO property. Linked to tenants for occupancy tracking.';

-- =============================================================================
-- 3. TENANCY AGREEMENTS — formal rental contracts
-- =============================================================================
CREATE TABLE IF NOT EXISTS tenancy_agreements (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id       UUID NOT NULL REFERENCES tenants(id) ON DELETE RESTRICT,
  property_id     UUID NOT NULL REFERENCES properties(id) ON DELETE RESTRICT,
  room_id         UUID REFERENCES rooms(id) ON DELETE SET NULL,
  agreement_status agreement_status NOT NULL DEFAULT 'pending',
  start_date      DATE NOT NULL,
  end_date        DATE,
  weekly_rent     NUMERIC(10,2) NOT NULL,
  deposit_amount  NUMERIC(10,2) NOT NULL DEFAULT 0,
  deposit_paid    BOOLEAN NOT NULL DEFAULT FALSE,
  deposit_scheme  TEXT,
  deposit_ref     TEXT,
  special_terms   TEXT,
  signed_by_tenant    BOOLEAN NOT NULL DEFAULT FALSE,
  signed_by_manager   BOOLEAN NOT NULL DEFAULT FALSE,
  signed_at           TIMESTAMPTZ,
  document_url    TEXT,
  created_by      UUID NOT NULL REFERENCES users(id),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE tenancy_agreements IS 'Formal tenancy/license agreements linking tenants to properties and rooms.';

-- =============================================================================
-- 4. DOCUMENTS — uploaded files (ID scans, proof of income, reports, etc.)
-- =============================================================================
CREATE TABLE IF NOT EXISTS documents (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id       UUID REFERENCES tenants(id) ON DELETE SET NULL,
  property_id     UUID REFERENCES properties(id) ON DELETE SET NULL,
  category        doc_category NOT NULL DEFAULT 'other',
  title           TEXT NOT NULL,
  description     TEXT,
  file_url        TEXT NOT NULL,
  file_size_bytes BIGINT,
  mime_type       TEXT,
  uploaded_by     UUID NOT NULL REFERENCES users(id),
  is_verified     BOOLEAN NOT NULL DEFAULT FALSE,
  verified_by     UUID REFERENCES users(id),
  verified_at     TIMESTAMPTZ,
  expires_at      DATE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE documents IS 'Centralised document store for tenant ID scans, proof of income, council reports, and property documents.';

-- =============================================================================
-- 5. HOUSING CLAIMS — benefit claims and dispute tracking
-- =============================================================================
CREATE TABLE IF NOT EXISTS housing_claims (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id       UUID NOT NULL REFERENCES tenants(id) ON DELETE RESTRICT,
  claim_type      claim_type NOT NULL,
  claim_status    claim_status NOT NULL DEFAULT 'draft',
  reference_number TEXT,
  council_name    TEXT,
  submitted_at    TIMESTAMPTZ,
  decided_at      TIMESTAMPTZ,
  amount_claimed  NUMERIC(10,2),
  amount_awarded  NUMERIC(10,2),
  decision_notes  TEXT,
  appeal_deadline DATE,
  supporting_docs UUID[],
  assigned_to     UUID REFERENCES users(id),
  notes           TEXT,
  created_by      UUID NOT NULL REFERENCES users(id),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE housing_claims IS 'Housing benefit claims, UC housing element, discretionary payments, and disputes.';

-- =============================================================================
-- 6. PAYMENT TRANSACTIONS — individual payment events (complements service_charges)
-- =============================================================================
CREATE TABLE IF NOT EXISTS payment_transactions (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id       UUID NOT NULL REFERENCES tenants(id) ON DELETE RESTRICT,
  charge_id       UUID REFERENCES service_charges(id) ON DELETE SET NULL,
  claim_id        UUID REFERENCES housing_claims(id) ON DELETE SET NULL,
  txn_type        txn_type NOT NULL DEFAULT 'rent',
  txn_status      txn_status NOT NULL DEFAULT 'pending',
  amount          NUMERIC(10,2) NOT NULL,
  payment_method  payment_method NOT NULL DEFAULT 'Cash',
  payment_date    DATE NOT NULL DEFAULT CURRENT_DATE,
  reference       TEXT,
  receipt_url     TEXT,
  notes           TEXT,
  recorded_by     UUID NOT NULL REFERENCES users(id),
  approved_by     UUID REFERENCES users(id),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE payment_transactions IS 'Individual payment events linked to service charges or claims. Provides full financial audit trail.';

-- =============================================================================
-- 7. NOTIFICATIONS — in-app notifications for staff
-- =============================================================================
CREATE TABLE IF NOT EXISTS notifications (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  recipient_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  notif_type      notif_type NOT NULL DEFAULT 'info',
  title           TEXT NOT NULL,
  body            TEXT,
  link            TEXT,
  is_read         BOOLEAN NOT NULL DEFAULT FALSE,
  read_at         TIMESTAMPTZ,
  tenant_id       UUID REFERENCES tenants(id) ON DELETE SET NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE notifications IS 'In-app notifications: payment reminders, claim updates, risk alerts, system messages.';

-- =============================================================================
-- 8. SYSTEM SETTINGS — admin configuration (key-value store)
-- =============================================================================
CREATE TABLE IF NOT EXISTS system_settings (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  setting_key     TEXT NOT NULL UNIQUE,
  setting_value   JSONB NOT NULL DEFAULT '{}',
  description     TEXT,
  updated_by      UUID REFERENCES users(id),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE system_settings IS 'Admin-configurable settings: default rent rates, notification preferences, brand config.';

-- Seed default settings
INSERT INTO system_settings (setting_key, setting_value, description) VALUES
  ('default_weekly_rate', '"95.00"', 'Default weekly service charge for new tenants'),
  ('session_timeout_hours', '4', 'Max idle session before forced re-auth'),
  ('notification_retention_days', '90', 'Auto-delete read notifications after N days'),
  ('max_upload_size_mb', '10', 'Maximum document upload size'),
  ('brands', '["mattys_place", "ash_shahada", "reliance"]', 'Active brands in the system')
ON CONFLICT (setting_key) DO NOTHING;

-- =============================================================================
-- 9. USER INVITATIONS — Manager invites new staff
-- =============================================================================
CREATE TABLE IF NOT EXISTS user_invitations (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email           TEXT NOT NULL,
  role            user_role NOT NULL,
  brand           brand NOT NULL DEFAULT 'mattys_place',
  invite_status   invite_status NOT NULL DEFAULT 'pending',
  invite_code     TEXT NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(16), 'hex'),
  invited_by      UUID NOT NULL REFERENCES users(id),
  accepted_at     TIMESTAMPTZ,
  expires_at      TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '7 days'),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE user_invitations IS 'Manager-generated invitations for new staff. Expire after 7 days.';

-- =============================================================================
-- 10. LOGIN HISTORY — complements audit_logs for auth-specific events
-- =============================================================================
CREATE TABLE IF NOT EXISTS login_history (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  login_method    TEXT NOT NULL DEFAULT 'password',
  ip_address      TEXT,
  user_agent      TEXT,
  success         BOOLEAN NOT NULL DEFAULT TRUE,
  failure_reason  TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE login_history IS 'Granular login tracking for security auditing and suspicious activity detection.';

-- =============================================================================
-- NEW INDEXES
-- =============================================================================
CREATE INDEX IF NOT EXISTS idx_properties_brand        ON properties(brand);
CREATE INDEX IF NOT EXISTS idx_rooms_property          ON rooms(property_id);
CREATE INDEX IF NOT EXISTS idx_rooms_tenant            ON rooms(current_tenant_id);
CREATE INDEX IF NOT EXISTS idx_rooms_status            ON rooms(room_status);
CREATE INDEX IF NOT EXISTS idx_agreements_tenant       ON tenancy_agreements(tenant_id);
CREATE INDEX IF NOT EXISTS idx_agreements_property     ON tenancy_agreements(property_id);
CREATE INDEX IF NOT EXISTS idx_agreements_status       ON tenancy_agreements(agreement_status);
CREATE INDEX IF NOT EXISTS idx_documents_tenant        ON documents(tenant_id);
CREATE INDEX IF NOT EXISTS idx_documents_category      ON documents(category);
CREATE INDEX IF NOT EXISTS idx_claims_tenant           ON housing_claims(tenant_id);
CREATE INDEX IF NOT EXISTS idx_claims_status           ON housing_claims(claim_status);
CREATE INDEX IF NOT EXISTS idx_claims_type             ON housing_claims(claim_type);
CREATE INDEX IF NOT EXISTS idx_txn_tenant              ON payment_transactions(tenant_id);
CREATE INDEX IF NOT EXISTS idx_txn_charge              ON payment_transactions(charge_id);
CREATE INDEX IF NOT EXISTS idx_txn_status              ON payment_transactions(txn_status);
CREATE INDEX IF NOT EXISTS idx_txn_date                ON payment_transactions(payment_date DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_recipient ON notifications(recipient_id, is_read);
CREATE INDEX IF NOT EXISTS idx_notifications_created   ON notifications(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_invitations_email       ON user_invitations(email);
CREATE INDEX IF NOT EXISTS idx_invitations_code        ON user_invitations(invite_code);
CREATE INDEX IF NOT EXISTS idx_login_history_user      ON login_history(user_id);
CREATE INDEX IF NOT EXISTS idx_login_history_created   ON login_history(created_at DESC);

-- =============================================================================
-- RLS ON NEW TABLES
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

-- POLICIES (drop-if-exists for idempotency)
-- Properties: Manager full, Worker read
DROP POLICY IF EXISTS prop_manager_all   ON properties;
DROP POLICY IF EXISTS prop_worker_read   ON properties;
CREATE POLICY prop_manager_all   ON properties FOR ALL    TO authenticated USING (get_my_role() = 'Manager');
CREATE POLICY prop_worker_read   ON properties FOR SELECT TO authenticated USING (get_my_role() = 'SupportWorker');

-- Rooms: Manager full, Worker read
DROP POLICY IF EXISTS rooms_manager_all  ON rooms;
DROP POLICY IF EXISTS rooms_worker_read  ON rooms;
CREATE POLICY rooms_manager_all  ON rooms FOR ALL    TO authenticated USING (get_my_role() = 'Manager');
CREATE POLICY rooms_worker_read  ON rooms FOR SELECT TO authenticated USING (get_my_role() = 'SupportWorker');

-- Agreements: Manager full, Worker read assigned
DROP POLICY IF EXISTS agr_manager_all    ON tenancy_agreements;
DROP POLICY IF EXISTS agr_worker_read    ON tenancy_agreements;
CREATE POLICY agr_manager_all    ON tenancy_agreements FOR ALL    TO authenticated USING (get_my_role() = 'Manager');
CREATE POLICY agr_worker_read    ON tenancy_agreements FOR SELECT TO authenticated USING (get_my_role() = 'SupportWorker' AND is_assigned_to_tenant(tenant_id));

-- Documents: Manager full, Worker read+insert for assigned tenants
DROP POLICY IF EXISTS doc_manager_all    ON documents;
DROP POLICY IF EXISTS doc_worker_read    ON documents;
DROP POLICY IF EXISTS doc_worker_insert  ON documents;
CREATE POLICY doc_manager_all    ON documents FOR ALL    TO authenticated USING (get_my_role() = 'Manager');
CREATE POLICY doc_worker_read    ON documents FOR SELECT TO authenticated USING (get_my_role() = 'SupportWorker' AND (tenant_id IS NULL OR is_assigned_to_tenant(tenant_id)));
CREATE POLICY doc_worker_insert  ON documents FOR INSERT TO authenticated WITH CHECK (get_my_role() IN ('Manager', 'SupportWorker'));

-- Claims: Manager full, Worker read+create for assigned tenants
DROP POLICY IF EXISTS claim_manager_all  ON housing_claims;
DROP POLICY IF EXISTS claim_worker_read  ON housing_claims;
DROP POLICY IF EXISTS claim_worker_ins   ON housing_claims;
CREATE POLICY claim_manager_all  ON housing_claims FOR ALL    TO authenticated USING (get_my_role() = 'Manager');
CREATE POLICY claim_worker_read  ON housing_claims FOR SELECT TO authenticated USING (get_my_role() = 'SupportWorker' AND is_assigned_to_tenant(tenant_id));
CREATE POLICY claim_worker_ins   ON housing_claims FOR INSERT TO authenticated WITH CHECK (get_my_role() IN ('Manager', 'SupportWorker') AND is_assigned_to_tenant(tenant_id));

-- Payment transactions: Manager full, Worker read
DROP POLICY IF EXISTS ptx_manager_all    ON payment_transactions;
DROP POLICY IF EXISTS ptx_worker_read    ON payment_transactions;
CREATE POLICY ptx_manager_all    ON payment_transactions FOR ALL    TO authenticated USING (get_my_role() = 'Manager');
CREATE POLICY ptx_worker_read    ON payment_transactions FOR SELECT TO authenticated USING (get_my_role() = 'SupportWorker' AND is_assigned_to_tenant(tenant_id));

-- Notifications: users see only their own
DROP POLICY IF EXISTS notif_own          ON notifications;
CREATE POLICY notif_own          ON notifications FOR ALL TO authenticated USING (recipient_id = get_my_user_id());

-- System settings: Manager full, Worker read
DROP POLICY IF EXISTS settings_manager   ON system_settings;
DROP POLICY IF EXISTS settings_read      ON system_settings;
CREATE POLICY settings_manager   ON system_settings FOR ALL    TO authenticated USING (get_my_role() = 'Manager');
CREATE POLICY settings_read      ON system_settings FOR SELECT TO authenticated USING (get_my_role() IN ('Manager', 'SupportWorker'));

-- Invitations: Manager only
DROP POLICY IF EXISTS inv_manager_all    ON user_invitations;
CREATE POLICY inv_manager_all    ON user_invitations FOR ALL TO authenticated USING (get_my_role() = 'Manager');

-- Login history: Manager reads all, users read own
DROP POLICY IF EXISTS lh_manager_all     ON login_history;
DROP POLICY IF EXISTS lh_own_read        ON login_history;
CREATE POLICY lh_manager_all     ON login_history FOR ALL    TO authenticated USING (get_my_role() = 'Manager');
CREATE POLICY lh_own_read        ON login_history FOR SELECT TO authenticated USING (user_id = get_my_user_id());

-- =============================================================================
-- TRIGGERS — updated_at for new tables
-- =============================================================================
DROP TRIGGER IF EXISTS trg_properties_updated_at       ON properties;
DROP TRIGGER IF EXISTS trg_rooms_updated_at            ON rooms;
DROP TRIGGER IF EXISTS trg_agreements_updated_at       ON tenancy_agreements;
DROP TRIGGER IF EXISTS trg_documents_updated_at        ON documents;
DROP TRIGGER IF EXISTS trg_claims_updated_at           ON housing_claims;
DROP TRIGGER IF EXISTS trg_txn_updated_at              ON payment_transactions;
DROP TRIGGER IF EXISTS trg_settings_updated_at         ON system_settings;

CREATE TRIGGER trg_properties_updated_at  BEFORE UPDATE ON properties           FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_rooms_updated_at       BEFORE UPDATE ON rooms                FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_agreements_updated_at  BEFORE UPDATE ON tenancy_agreements   FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_documents_updated_at   BEFORE UPDATE ON documents            FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_claims_updated_at      BEFORE UPDATE ON housing_claims       FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_txn_updated_at         BEFORE UPDATE ON payment_transactions FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_settings_updated_at    BEFORE UPDATE ON system_settings      FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- =============================================================================
-- AUDIT TRIGGERS — auto-log changes on new financial tables
-- =============================================================================

CREATE OR REPLACE FUNCTION audit_payment_change() RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE v_user RECORD; v_action audit_action;
BEGIN
  SELECT id, full_name, role INTO v_user FROM users WHERE auth_id = auth.uid() LIMIT 1;
  IF v_user.id IS NULL THEN RETURN NEW; END IF;
  IF TG_OP = 'INSERT' THEN v_action := 'CREATE'; ELSE v_action := 'EDIT'; END IF;
  INSERT INTO audit_logs (actor_id, actor_name, actor_role, tenant_id, table_name, record_id, action, entry_method, old_data, new_data, stamped_at)
  VALUES (v_user.id, v_user.full_name, v_user.role, NEW.tenant_id, TG_TABLE_NAME, NEW.id, v_action, 'manual',
    CASE WHEN TG_OP='UPDATE' THEN to_jsonb(OLD) ELSE NULL END, to_jsonb(NEW), NOW());
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS trg_audit_payment_txn_insert ON payment_transactions;
DROP TRIGGER IF EXISTS trg_audit_payment_txn_update ON payment_transactions;
CREATE TRIGGER trg_audit_payment_txn_insert AFTER INSERT ON payment_transactions FOR EACH ROW EXECUTE FUNCTION audit_payment_change();
CREATE TRIGGER trg_audit_payment_txn_update AFTER UPDATE ON payment_transactions FOR EACH ROW EXECUTE FUNCTION audit_payment_change();

DROP TRIGGER IF EXISTS trg_audit_charges_insert ON service_charges;
DROP TRIGGER IF EXISTS trg_audit_charges_update ON service_charges;
CREATE TRIGGER trg_audit_charges_insert AFTER INSERT ON service_charges FOR EACH ROW EXECUTE FUNCTION audit_payment_change();
CREATE TRIGGER trg_audit_charges_update AFTER UPDATE ON service_charges FOR EACH ROW EXECUTE FUNCTION audit_payment_change();

DROP TRIGGER IF EXISTS trg_audit_claims_insert ON housing_claims;
DROP TRIGGER IF EXISTS trg_audit_claims_update ON housing_claims;
CREATE TRIGGER trg_audit_claims_insert AFTER INSERT ON housing_claims FOR EACH ROW EXECUTE FUNCTION audit_payment_change();
CREATE TRIGGER trg_audit_claims_update AFTER UPDATE ON housing_claims FOR EACH ROW EXECUTE FUNCTION audit_payment_change();

-- =============================================================================
-- NEW VIEWS
-- =============================================================================

CREATE OR REPLACE VIEW v_property_occupancy AS
  SELECT p.id, p.name, p.brand, p.max_occupants,
    COUNT(r.id) FILTER (WHERE r.room_status = 'occupied') AS occupied,
    COUNT(r.id) FILTER (WHERE r.room_status = 'available') AS available,
    COUNT(r.id) AS total_rooms
  FROM properties p LEFT JOIN rooms r ON r.property_id = p.id
  WHERE p.is_active = TRUE
  GROUP BY p.id, p.name, p.brand, p.max_occupants;

CREATE OR REPLACE VIEW v_rent_arrears AS
  SELECT t.id AS tenant_id, t.full_name, t.room_number, t.brand, t.status,
    SUM(sc.amount_due - sc.amount_paid) AS total_arrears,
    COUNT(sc.id) AS unpaid_periods,
    MIN(sc.period_start) AS oldest_unpaid_from
  FROM tenants t
  JOIN service_charges sc ON sc.tenant_id = t.id AND sc.is_paid = FALSE
  GROUP BY t.id, t.full_name, t.room_number, t.brand, t.status
  HAVING SUM(sc.amount_due - sc.amount_paid) > 0
  ORDER BY total_arrears DESC;

CREATE OR REPLACE VIEW v_active_claims AS
  SELECT hc.id, hc.claim_type, hc.claim_status, hc.reference_number,
    hc.amount_claimed, hc.amount_awarded, hc.submitted_at, hc.decided_at,
    t.full_name AS tenant_name, t.room_number, t.brand,
    u.full_name AS assigned_to_name
  FROM housing_claims hc
  JOIN tenants t ON t.id = hc.tenant_id
  LEFT JOIN users u ON u.id = hc.assigned_to
  WHERE hc.claim_status NOT IN ('paid', 'rejected')
  ORDER BY hc.created_at DESC;

CREATE OR REPLACE VIEW v_payment_summary AS
  SELECT t.id AS tenant_id, t.full_name, t.brand,
    SUM(pt.amount) FILTER (WHERE pt.txn_status = 'completed') AS total_paid,
    SUM(pt.amount) FILTER (WHERE pt.txn_status = 'pending')   AS total_pending,
    COUNT(pt.id) AS transaction_count,
    MAX(pt.payment_date) AS last_payment_date
  FROM tenants t
  LEFT JOIN payment_transactions pt ON pt.tenant_id = t.id
  GROUP BY t.id, t.full_name, t.brand;
