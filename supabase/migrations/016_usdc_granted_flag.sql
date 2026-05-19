-- Track whether devnet USDC has been successfully granted to each managed wallet.
-- Allows retry logic to check a DB flag instead of making an RPC balance call.

ALTER TABLE user_wallets
  ADD COLUMN IF NOT EXISTS usdc_granted BOOLEAN NOT NULL DEFAULT FALSE;

-- Backfill: any wallet that already exists was either granted or will be retried on next visit.
-- We leave them as FALSE so the retry fires once on next wallet page load.

-- Allow users to update their own wallet row (needed to set usdc_granted after a successful grant)
DO $$ BEGIN
  CREATE POLICY "wallet_own_update" ON user_wallets
    FOR UPDATE USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
