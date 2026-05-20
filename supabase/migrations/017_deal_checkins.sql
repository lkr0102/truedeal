-- deal_checkins: tracks self-reported gym check-ins for Wellhub/TotalPass deals.
-- Max 1 check-in per user per deal per calendar day (UTC) enforced by UNIQUE constraint.

CREATE TABLE IF NOT EXISTS deal_checkins (
  id          UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  deal_id     UUID         NOT NULL REFERENCES deals(id) ON DELETE CASCADE,
  user_id     UUID         NOT NULL REFERENCES profiles(user_id) ON DELETE CASCADE,
  source      TEXT         NOT NULL CHECK (source IN ('wellhub', 'totalpass', 'manual')),
  activity_at TIMESTAMPTZ  NOT NULL DEFAULT now(),
  date        DATE         NOT NULL DEFAULT CURRENT_DATE,
  UNIQUE (deal_id, user_id, date)
);

ALTER TABLE deal_checkins ENABLE ROW LEVEL SECURITY;

CREATE POLICY "checkins_insert_own" ON deal_checkins
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "checkins_select_all" ON deal_checkins
  FOR SELECT USING (true);

CREATE INDEX idx_deal_checkins_deal_user ON deal_checkins (deal_id, user_id);
CREATE INDEX idx_deal_checkins_date     ON deal_checkins (date);
