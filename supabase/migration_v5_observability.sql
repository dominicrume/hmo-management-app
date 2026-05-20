-- =============================================================================
-- MATTY'S PLACE — Migration v5: Observability
-- Run after migration_v4_notifications.sql
-- =============================================================================

-- ── System Logs ───────────────────────────────────────────────────────────────
-- Structured log for errors, warnings, and notable events.
-- Separate from audit_logs (which is for business data mutations).

CREATE TYPE log_level AS ENUM ('debug', 'info', 'warn', 'error');

CREATE TABLE system_logs (
  id          UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  level       log_level   NOT NULL DEFAULT 'info',
  route       TEXT,                         -- e.g. /api/charges
  method      TEXT,                         -- GET / POST / PATCH
  actor_id    UUID        REFERENCES users(id) ON DELETE SET NULL,
  message     TEXT        NOT NULL,
  meta        JSONB,                        -- arbitrary context (error stack, params)
  status_code INTEGER,
  duration_ms INTEGER,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX system_logs_level      ON system_logs(level);
CREATE INDEX system_logs_created_at ON system_logs(created_at DESC);
CREATE INDEX system_logs_route      ON system_logs(route);

-- Only Managers can read system logs; service role writes them.
ALTER TABLE system_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "manager_read_system_logs" ON system_logs
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM users WHERE auth_id = auth.uid() AND role = 'Manager'
    )
  );

-- ── API Metrics ───────────────────────────────────────────────────────────────
-- Per-request performance record — route, latency, status code.
-- Retained for 90 days; older rows should be pruned by a scheduled job.

CREATE TABLE api_metrics (
  id          UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  route       TEXT        NOT NULL,
  method      TEXT        NOT NULL,
  actor_id    UUID        REFERENCES users(id) ON DELETE SET NULL,
  status_code INTEGER     NOT NULL,
  duration_ms INTEGER     NOT NULL,
  ip          TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX api_metrics_route      ON api_metrics(route, method);
CREATE INDEX api_metrics_created_at ON api_metrics(created_at DESC);
CREATE INDEX api_metrics_actor      ON api_metrics(actor_id);
-- Partial index — fast lookup for slow requests (>1s)
CREATE INDEX api_metrics_slow ON api_metrics(duration_ms)
  WHERE duration_ms > 1000;

-- Managers only
ALTER TABLE api_metrics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "manager_read_api_metrics" ON api_metrics
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM users WHERE auth_id = auth.uid() AND role = 'Manager'
    )
  );

-- ── Convenience view: error rate by route (last 24h) ─────────────────────────
CREATE OR REPLACE VIEW api_error_rate AS
SELECT
  route,
  method,
  COUNT(*)                                                      AS total_requests,
  COUNT(*) FILTER (WHERE status_code >= 500)                    AS error_count,
  ROUND(
    COUNT(*) FILTER (WHERE status_code >= 500)::NUMERIC
    / NULLIF(COUNT(*), 0) * 100, 2
  )                                                             AS error_pct,
  ROUND(AVG(duration_ms)::NUMERIC, 0)                          AS avg_ms,
  MAX(duration_ms)                                             AS max_ms,
  MAX(created_at)                                              AS last_seen
FROM api_metrics
WHERE created_at >= NOW() - INTERVAL '24 hours'
GROUP BY route, method
ORDER BY error_count DESC;

-- ── RPC: api_metrics_by_route ─────────────────────────────────────────────────
-- Called by /api/admin/metrics — returns per-route aggregates for a time window.

CREATE OR REPLACE FUNCTION api_metrics_by_route(since_ts TIMESTAMPTZ)
RETURNS TABLE (
  route          TEXT,
  method         TEXT,
  total_requests BIGINT,
  error_count    BIGINT,
  avg_ms         NUMERIC,
  p95_ms         NUMERIC,
  max_ms         INTEGER
)
LANGUAGE SQL STABLE SECURITY DEFINER AS $$
  SELECT
    route,
    method,
    COUNT(*)                                               AS total_requests,
    COUNT(*) FILTER (WHERE status_code >= 500)             AS error_count,
    ROUND(AVG(duration_ms)::NUMERIC, 0)                   AS avg_ms,
    ROUND(PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY duration_ms)::NUMERIC, 0) AS p95_ms,
    MAX(duration_ms)                                      AS max_ms
  FROM api_metrics
  WHERE created_at >= since_ts
  GROUP BY route, method
  ORDER BY total_requests DESC;
$$;
