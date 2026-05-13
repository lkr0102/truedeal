-- Add Solana on-chain fields that are referenced in the application code
-- but were missing from the initial schema.

ALTER TABLE public.deals
  ADD COLUMN IF NOT EXISTS pda_address          text,
  ADD COLUMN IF NOT EXISTS solana_tx_signature  text,
  ADD COLUMN IF NOT EXISTS proof_hash           text,
  ADD COLUMN IF NOT EXISTS final_proof_hash     text,
  ADD COLUMN IF NOT EXISTS audit_logs           jsonb;
