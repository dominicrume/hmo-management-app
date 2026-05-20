-- =============================================================================
-- MATTY'S PLACE — Migration v7: Blockchain + Wallet Auth
-- Run after migration_v6_ai.sql
-- =============================================================================

-- ── Wallet Addresses ──────────────────────────────────────────────────────────
-- Links staff users to their Web3 wallet addresses for wallet authentication.
-- One user can have multiple wallets; each wallet belongs to one user.

CREATE TABLE wallet_addresses (
  id          UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  address     TEXT        NOT NULL UNIQUE,   -- lowercase EVM address (0x...)
  chain_id    INTEGER     NOT NULL DEFAULT 80002, -- Polygon Amoy
  label       TEXT,                          -- optional nickname ("work wallet")
  verified    BOOLEAN     NOT NULL DEFAULT FALSE,
  verified_at TIMESTAMPTZ,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX wallet_addresses_user    ON wallet_addresses(user_id);
CREATE INDEX wallet_addresses_address ON wallet_addresses(address);

ALTER TABLE wallet_addresses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own_wallets" ON wallet_addresses
  FOR ALL USING (
    user_id = (SELECT id FROM users WHERE auth_id = auth.uid() LIMIT 1)
  );

-- ── Auth Nonces ───────────────────────────────────────────────────────────────
-- Short-lived challenge nonces for wallet authentication (sign-in with Ethereum).
-- Nonces expire after 5 minutes and are deleted on use.

CREATE TABLE auth_nonces (
  id          UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  address     TEXT        NOT NULL,
  nonce       TEXT        NOT NULL UNIQUE,
  expires_at  TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '5 minutes'),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX auth_nonces_address    ON auth_nonces(address);
CREATE INDEX auth_nonces_expires_at ON auth_nonces(expires_at);

-- No RLS — accessed via service client only

-- ── Blockchain Stamps Ledger ──────────────────────────────────────────────────
-- Mirrors on-chain stamp events back to the DB for fast lookup without RPC calls.
-- Source of truth is always the blockchain; this is a read-optimisation cache.

CREATE TABLE blockchain_stamps (
  id              UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  payload_hash    TEXT        NOT NULL UNIQUE,  -- from audit_logs.payload_hash
  audit_log_id    UUID        REFERENCES audit_logs(id) ON DELETE SET NULL,
  tx_hash         TEXT        NOT NULL,
  block_number    INTEGER,
  stamped_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  stamp_type      TEXT        NOT NULL DEFAULT 'individual', -- individual | merkle_batch
  merkle_root     TEXT,       -- set if stamp_type = merkle_batch
  metadata        TEXT
);

CREATE INDEX blockchain_stamps_payload ON blockchain_stamps(payload_hash);
CREATE INDEX blockchain_stamps_tx      ON blockchain_stamps(tx_hash);

ALTER TABLE blockchain_stamps ENABLE ROW LEVEL SECURITY;
CREATE POLICY "manager_read_stamps" ON blockchain_stamps
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM users WHERE auth_id = auth.uid() AND role = 'Manager')
  );

-- ── Merkle Batch Log ──────────────────────────────────────────────────────────
-- Records each Merkle batch anchoring job — which audit logs were included.

CREATE TABLE merkle_batches (
  id           UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  merkle_root  TEXT        NOT NULL UNIQUE,
  tx_hash      TEXT,
  block_number INTEGER,
  record_count INTEGER     NOT NULL,
  description  TEXT,
  hashes       JSONB       NOT NULL,  -- array of payload_hash strings in this batch
  anchored_at  TIMESTAMPTZ,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE merkle_batches ENABLE ROW LEVEL SECURITY;
CREATE POLICY "manager_read_merkle" ON merkle_batches
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM users WHERE auth_id = auth.uid() AND role = 'Manager')
  );

-- ── Cleanup: expire old nonces ────────────────────────────────────────────────
-- In production, run this as a cron job or Supabase scheduled function.
-- CREATE OR REPLACE FUNCTION cleanup_expired_nonces() ...
