-- =============================================================================
-- MATTY'S PLACE — Migration v4: Notifications + Claims + Payments
-- Run after migration_v3_phase3.sql
-- =============================================================================

-- ── Notifications ─────────────────────────────────────────────────────────────
-- In-app alerts for staff. Tenant-scoped or system-wide (tenant_id = NULL).

CREATE TYPE notification_type AS ENUM (
  'rent_overdue',
  'session_due',
  'risk_flag',
  'form_submitted',
  'tenant_added',
  'system'
);

CREATE TABLE notifications (
  id           UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  recipient_id UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  tenant_id    UUID        REFERENCES tenants(id) ON DELETE SET NULL,
  type         notification_type NOT NULL DEFAULT 'system',
  title        TEXT        NOT NULL,
  body         TEXT        NOT NULL,
  is_read      BOOLEAN     NOT NULL DEFAULT FALSE,
  read_at      TIMESTAMPTZ,
  link         TEXT,        -- optional deep-link path e.g. /dashboard?tenant=<id>
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX notifications_recipient_unread
  ON notifications(recipient_id, is_read)
  WHERE is_read = FALSE;

CREATE INDEX notifications_created_at ON notifications(created_at DESC);

-- RLS — staff can only see their own notifications
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "staff_own_notifications" ON notifications
  FOR ALL USING (
    recipient_id = (
      SELECT id FROM users WHERE auth_id = auth.uid() LIMIT 1
    )
  );

-- ── Claims ────────────────────────────────────────────────────────────────────
-- Formal support claims raised by staff on behalf of tenants.
-- Links a tenant, a claim type, and optionally a session or form record.

CREATE TYPE claim_type AS ENUM (
  'housing_benefit',
  'universal_credit',
  'pip',
  'support_plan',
  'missing_person',
  'risk_review',
  'other'
);

CREATE TYPE claim_status AS ENUM (
  'open',
  'in_progress',
  'resolved',
  'closed'
);

CREATE TABLE claims (
  id           UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id    UUID         NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  raised_by    UUID         NOT NULL REFERENCES users(id),
  type         claim_type   NOT NULL,
  status       claim_status NOT NULL DEFAULT 'open',
  title        TEXT         NOT NULL,
  description  TEXT,
  reference    TEXT,        -- external ref (DWP case number, council ref, etc.)
  session_id   UUID         REFERENCES sessions(id) ON DELETE SET NULL,
  resolved_at  TIMESTAMPTZ,
  resolved_by  UUID         REFERENCES users(id),
  created_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX claims_tenant_id ON claims(tenant_id);
CREATE INDEX claims_status    ON claims(status);

ALTER TABLE claims ENABLE ROW LEVEL SECURITY;

-- Managers and SupportWorkers can read; only Managers can delete
CREATE POLICY "staff_read_claims" ON claims
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM users WHERE auth_id = auth.uid() AND role IN ('Manager','SupportWorker')
    )
  );

CREATE POLICY "staff_insert_claims" ON claims
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM users WHERE auth_id = auth.uid() AND role IN ('Manager','SupportWorker')
    )
  );

CREATE POLICY "staff_update_claims" ON claims
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM users WHERE auth_id = auth.uid() AND role IN ('Manager','SupportWorker')
    )
  );

-- ── Payments ──────────────────────────────────────────────────────────────────
-- Full payment records linked to service_charges.
-- service_charges tracks what is owed; payments tracks what was received.

CREATE TYPE payment_status AS ENUM ('pending', 'completed', 'failed', 'refunded');

CREATE TABLE payments (
  id               UUID           PRIMARY KEY DEFAULT uuid_generate_v4(),
  charge_id        UUID           NOT NULL REFERENCES service_charges(id) ON DELETE CASCADE,
  tenant_id        UUID           NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  recorded_by      UUID           NOT NULL REFERENCES users(id),
  amount_pence     INTEGER        NOT NULL CHECK (amount_pence > 0),
  method           payment_method NOT NULL,
  status           payment_status NOT NULL DEFAULT 'pending',
  reference        TEXT,           -- cheque number, bank ref, etc.
  notes            TEXT,
  payment_date     DATE           NOT NULL DEFAULT CURRENT_DATE,
  completed_at     TIMESTAMPTZ,
  created_at       TIMESTAMPTZ    NOT NULL DEFAULT NOW()
);

CREATE INDEX payments_tenant_id  ON payments(tenant_id);
CREATE INDEX payments_charge_id  ON payments(charge_id);
CREATE INDEX payments_status     ON payments(status);

ALTER TABLE payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "staff_read_payments" ON payments
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM users WHERE auth_id = auth.uid() AND role IN ('Manager','SupportWorker')
    )
  );

CREATE POLICY "manager_write_payments" ON payments
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM users WHERE auth_id = auth.uid() AND role = 'Manager'
    )
  );

CREATE POLICY "manager_update_payments" ON payments
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM users WHERE auth_id = auth.uid() AND role = 'Manager'
    )
  );
