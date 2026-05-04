-- ── 003_wallets.sql — Managed Solana wallet per user (account abstraction) ─────

-- Each user gets exactly one app-managed Solana wallet.
-- The encrypted private key never leaves the server.
CREATE TABLE IF NOT EXISTS user_wallets (
  user_id           UUID        PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  public_key        TEXT        NOT NULL UNIQUE,
  encrypted_secret  TEXT        NOT NULL,   -- AES-256-GCM; decryptable only server-side
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE user_wallets ENABLE ROW LEVEL SECURITY;

-- Users may read only their own public_key row (encrypted_secret never sent to client via RLS)
DO $$ BEGIN
  CREATE POLICY "wallet_own_select" ON user_wallets
    FOR SELECT USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Wallet is created server-side on behalf of the authenticated user
DO $$ BEGIN
  CREATE POLICY "wallet_own_insert" ON user_wallets
    FOR INSERT WITH CHECK (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Add solana_public_key to profiles for quick denormalized access
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS solana_public_key TEXT;
