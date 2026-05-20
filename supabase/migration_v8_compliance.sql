-- =============================================================================
-- MATTY'S PLACE — Migration v8: Compliance + Responsible AI
-- Run after migration_v7_blockchain.sql
-- =============================================================================

-- ── Data Subject Requests (GDPR Art. 15, 17, 20) ─────────────────────────────
-- Tracks Subject Access Requests (SAR) and erasure requests.
-- Every request, its resolution, and the staff member who handled it are recorded.

CREATE TYPE dsr_type AS ENUM (
  'access',       -- Art. 15: right of access (SAR)
  'erasure',      -- Art. 17: right to be forgotten
  'rectification',-- Art. 16: right to correction
  'portability',  -- Art. 20: right to data portability
  'restriction',  -- Art. 18: right to restrict processing
  'objection'     -- Art. 21: right to object
);

CREATE TYPE dsr_status AS ENUM ('pending', 'in_review', 'completed', 'rejected');

CREATE TABLE data_subject_requests (
  id              UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id       UUID        NOT NULL REFERENCES tenants(id) ON DELETE RESTRICT,
  type            dsr_type    NOT NULL,
  status          dsr_status  NOT NULL DEFAULT 'pending',
  requested_by    UUID        REFERENCES users(id) ON DELETE SET NULL, -- staff who raised it
  request_notes   TEXT,       -- reason or details from the data subject
  handled_by      UUID        REFERENCES users(id) ON DELETE SET NULL,
  handler_notes   TEXT,
  completed_at    TIMESTAMPTZ,
  deadline_at     TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '30 days'), -- GDPR: 1 month
  export_path     TEXT,       -- S3/storage path of the SAR export package
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX dsr_tenant   ON data_subject_requests(tenant_id);
CREATE INDEX dsr_status   ON data_subject_requests(status);
CREATE INDEX dsr_deadline ON data_subject_requests(deadline_at) WHERE status != 'completed';

ALTER TABLE data_subject_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "manager_dsr" ON data_subject_requests
  FOR ALL USING (
    EXISTS (SELECT 1 FROM users WHERE auth_id = auth.uid() AND role = 'Manager')
  );

-- ── Consent Log (GDPR Art. 7) ─────────────────────────────────────────────────
-- Every consent grant and withdrawal is an immutable append-only record.
-- Consent is versioned — each policy update creates a new version.

CREATE TABLE consent_log (
  id              UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id       UUID        NOT NULL REFERENCES tenants(id) ON DELETE RESTRICT,
  consent_type    TEXT        NOT NULL,  -- e.g. 'data_processing', 'ai_profiling', 'sharing_council'
  policy_version  TEXT        NOT NULL,  -- e.g. 'v1.2'
  granted         BOOLEAN     NOT NULL,  -- true = grant, false = withdrawal
  method          TEXT        NOT NULL DEFAULT 'digital_signature', -- how consent was given
  ip_hash         TEXT,                  -- hashed IP at time of consent (GDPR-safe)
  staff_witness   UUID        REFERENCES users(id) ON DELETE SET NULL,
  notes           TEXT,
  stamped_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX consent_tenant ON consent_log(tenant_id, consent_type, stamped_at DESC);

-- Append-only: no updates or deletes
ALTER TABLE consent_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "staff_read_consent" ON consent_log
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM users WHERE auth_id = auth.uid() AND role IN ('Manager','SupportWorker'))
  );

-- ── AI Approvals (EU AI Act Art. 14 — Human Oversight) ───────────────────────
-- High and Critical AI risk flags require human manager sign-off before action.
-- No automated consequence (eviction notice, benefit referral) without approval.

CREATE TYPE approval_status AS ENUM ('pending', 'approved', 'rejected', 'escalated');

CREATE TABLE ai_approvals (
  id              UUID            PRIMARY KEY DEFAULT uuid_generate_v4(),
  suggestion_id   UUID            REFERENCES ai_suggestions(id) ON DELETE CASCADE,
  tenant_id       UUID            NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  risk_summary    TEXT            NOT NULL,
  risk_severity   TEXT            NOT NULL, -- low | medium | high | critical
  ai_model        TEXT            NOT NULL,
  ai_confidence   NUMERIC(5,2),            -- 0.00–100.00
  status          approval_status NOT NULL DEFAULT 'pending',
  reviewed_by     UUID            REFERENCES users(id) ON DELETE SET NULL,
  review_notes    TEXT,
  approved_at     TIMESTAMPTZ,
  expires_at      TIMESTAMPTZ     NOT NULL DEFAULT (NOW() + INTERVAL '72 hours'), -- auto-escalate if not reviewed
  created_at      TIMESTAMPTZ     NOT NULL DEFAULT NOW()
);

CREATE INDEX ai_approvals_tenant  ON ai_approvals(tenant_id);
CREATE INDEX ai_approvals_pending ON ai_approvals(status, expires_at) WHERE status = 'pending';

ALTER TABLE ai_approvals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "manager_ai_approvals" ON ai_approvals
  FOR ALL USING (
    EXISTS (SELECT 1 FROM users WHERE auth_id = auth.uid() AND role = 'Manager')
  );
CREATE POLICY "staff_read_approvals" ON ai_approvals
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM users WHERE auth_id = auth.uid() AND role IN ('Manager','SupportWorker'))
  );

-- ── Data Retention Log ────────────────────────────────────────────────────────
-- Records every automated or manual data purge. Satisfies Art. 5(1)(e).

CREATE TABLE data_retention_log (
  id              UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  table_name      TEXT        NOT NULL,
  record_count    INTEGER     NOT NULL,
  policy_name     TEXT        NOT NULL,   -- e.g. 'api_metrics_90d', 'session_notes_7yr'
  purged_by       UUID        REFERENCES users(id) ON DELETE SET NULL,
  auto_purge      BOOLEAN     NOT NULL DEFAULT TRUE,
  notes           TEXT,
  purged_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE data_retention_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "manager_retention_log" ON data_retention_log
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM users WHERE auth_id = auth.uid() AND role = 'Manager')
  );

-- ── AI Explainability Log (EU AI Act Art. 13) ─────────────────────────────────
-- Full decision record for every AI output — model, inputs, reasoning, output, verification.
-- Separate from ai_suggestions (which holds the response text).

CREATE TABLE ai_decision_log (
  id              UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  suggestion_id   UUID        REFERENCES ai_suggestions(id) ON DELETE CASCADE,
  tenant_id       UUID        NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  model           TEXT        NOT NULL,
  task_type       TEXT        NOT NULL,
  input_hash      TEXT,                   -- SHA-256 of the prompt (not the prompt itself)
  context_summary TEXT,                   -- human-readable summary of what data was used
  tools_invoked   JSONB,                  -- list of tool names that were called
  verification    JSONB,                  -- verifier.ts result
  risk_class      TEXT,                   -- EU AI Act risk classification
  guardrail_flags JSONB,                  -- any guardrail warnings triggered
  output_hash     TEXT,                   -- SHA-256 of AI response
  latency_ms      INTEGER,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX ai_decision_tenant ON ai_decision_log(tenant_id, created_at DESC);
CREATE INDEX ai_decision_type   ON ai_decision_log(task_type);

ALTER TABLE ai_decision_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "manager_ai_decisions" ON ai_decision_log
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM users WHERE auth_id = auth.uid() AND role = 'Manager')
  );
