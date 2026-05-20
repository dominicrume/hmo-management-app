-- =============================================================================
-- MATTY'S PLACE — Migration v6: AI Infrastructure
-- Run after migration_v5_observability.sql
-- =============================================================================

-- pgvector — enables embedding storage and cosine similarity search
CREATE EXTENSION IF NOT EXISTS vector;

-- ── AI Memory ─────────────────────────────────────────────────────────────────
-- Conversation turns per (tenant, worker, session_key).
-- Gives the AI continuity across multiple questions in one session.

CREATE TABLE ai_memory (
  id          UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id   UUID        NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  worker_id   UUID        NOT NULL REFERENCES users(id)   ON DELETE CASCADE,
  session_key TEXT        NOT NULL,   -- groups turns e.g. "2026-05-20-brain"
  role        TEXT        NOT NULL CHECK (role IN ('user', 'assistant')),
  content     TEXT        NOT NULL,
  tokens      INTEGER,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX ai_memory_lookup ON ai_memory(tenant_id, worker_id, session_key, created_at);

ALTER TABLE ai_memory ENABLE ROW LEVEL SECURITY;
CREATE POLICY "staff_own_ai_memory" ON ai_memory
  FOR ALL USING (
    worker_id = (SELECT id FROM users WHERE auth_id = auth.uid() LIMIT 1)
  );

-- ── Session Embeddings ────────────────────────────────────────────────────────
-- Separate table (not altering sessions) — links embeddings to session notes.
-- Used for RAG: "find sessions semantically similar to this query."

CREATE TABLE session_embeddings (
  id           UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id   UUID        NOT NULL UNIQUE REFERENCES sessions(id) ON DELETE CASCADE,
  tenant_id    UUID        NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  embedding    vector(1536) NOT NULL,  -- text-embedding-3-small dimensions
  content_hash TEXT        NOT NULL,  -- SHA-256 of the embedded text, for freshness checks
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- IVFFlat index — fast approximate nearest-neighbour search
-- lists=100 is appropriate for < 100k rows; tune upward as data grows
CREATE INDEX session_embeddings_vector ON session_embeddings
  USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

ALTER TABLE session_embeddings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "staff_read_session_embeddings" ON session_embeddings
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM users WHERE auth_id = auth.uid() AND role IN ('Manager','SupportWorker'))
  );

-- ── AI Suggestions ────────────────────────────────────────────────────────────
-- Full record of every AI invocation — prompt, response, risk flags, tools used.
-- This is the table that was referenced but missing. Now it exists.

CREATE TABLE ai_suggestions (
  id             UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id      UUID        NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  worker_id      UUID        REFERENCES users(id) ON DELETE SET NULL,
  task_type      TEXT        NOT NULL,   -- brain | questions | extract | ocr
  session_key    TEXT,
  response       TEXT        NOT NULL,
  risk_detected  BOOLEAN     NOT NULL DEFAULT FALSE,
  risk_summary   TEXT,
  tool_calls     JSONB,                  -- array of {tool, input, output} for each tool used
  verified       BOOLEAN     NOT NULL DEFAULT FALSE,
  verification   JSONB,                  -- output of verifier.ts
  tokens_used    INTEGER,
  model          TEXT        NOT NULL,
  latency_ms     INTEGER,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX ai_suggestions_tenant    ON ai_suggestions(tenant_id, created_at DESC);
CREATE INDEX ai_suggestions_risk      ON ai_suggestions(risk_detected) WHERE risk_detected = TRUE;

ALTER TABLE ai_suggestions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "staff_read_ai_suggestions" ON ai_suggestions
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM users WHERE auth_id = auth.uid() AND role IN ('Manager','SupportWorker'))
  );

-- ── RPC: match_sessions ───────────────────────────────────────────────────────
-- Semantic nearest-neighbour search — used by the RAG retriever.
-- Returns sessions whose embeddings are closest to the query embedding.

CREATE OR REPLACE FUNCTION match_sessions(
  query_embedding vector(1536),
  tenant_uuid     UUID,
  match_count     INT DEFAULT 5,
  min_similarity  FLOAT DEFAULT 0.7
)
RETURNS TABLE (
  session_id   UUID,
  session_date DATE,
  notes        TEXT,
  similarity   FLOAT
)
LANGUAGE SQL STABLE SECURITY DEFINER AS $$
  SELECT
    s.id           AS session_id,
    s.session_date,
    s.notes,
    1 - (se.embedding <=> query_embedding) AS similarity
  FROM session_embeddings se
  JOIN sessions s ON s.id = se.session_id
  WHERE se.tenant_id = tenant_uuid
    AND 1 - (se.embedding <=> query_embedding) >= min_similarity
  ORDER BY se.embedding <=> query_embedding
  LIMIT match_count;
$$;
