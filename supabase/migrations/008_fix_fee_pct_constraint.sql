-- Update fee_pct check constraint to allow the 3% flat fee
-- (old constraint only allowed 1 or 5)
ALTER TABLE deals DROP CONSTRAINT IF EXISTS deals_fee_pct_check;
ALTER TABLE deals ADD CONSTRAINT deals_fee_pct_check CHECK (fee_pct >= 0 AND fee_pct <= 100);
