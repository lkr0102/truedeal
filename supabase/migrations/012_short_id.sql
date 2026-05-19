-- Add short_id column to deals for human-readable deal identification
ALTER TABLE deals ADD COLUMN IF NOT EXISTS short_id text;

-- Backfill existing rows: prefer last 8 chars of tx sig, else last 8 chars of UUID (no dashes)
UPDATE deals
SET short_id = UPPER(RIGHT(COALESCE(solana_tx_signature, REPLACE(id::text, '-', '')), 8))
WHERE short_id IS NULL;
