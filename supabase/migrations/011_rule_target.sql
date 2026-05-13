-- Add rule configuration columns so each deal stores the goal quantity
-- (e.g. 10 km, 5 posts) and the evaluation frequency (daily/weekly/monthly/yearly).
-- These values are captured in the create form and must be persisted to allow
-- the audit engine to validate participants against the actual configured targets.

ALTER TABLE public.deals
  ADD COLUMN IF NOT EXISTS rule_target    integer,      -- numeric goal (e.g. 10 for "10 km")
  ADD COLUMN IF NOT EXISTS rule_frequency text;         -- 'daily' | 'weekly' | 'monthly' | 'yearly'
