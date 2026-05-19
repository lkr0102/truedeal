-- Add transaction_hash column to deal_participants to store the Solana TX
-- signature from the USDC stake transfer executed at join/create time.

ALTER TABLE public.deal_participants
  ADD COLUMN IF NOT EXISTS transaction_hash text;
