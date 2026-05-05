-- Stores OAuth tokens and membership verifications for social platforms
CREATE TABLE IF NOT EXISTS social_connections (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  platform         TEXT        NOT NULL, -- 'strava' | 'wellhub' | 'totalpass' | 'x'
  status           TEXT        NOT NULL DEFAULT 'connected', -- 'connected' | 'pending'
  external_id      TEXT,
  username         TEXT,
  member_email     TEXT,        -- for Wellhub/TotalPass membership verification
  access_token     TEXT,
  refresh_token    TEXT,
  token_expires_at TIMESTAMPTZ,
  metadata         JSONB       NOT NULL DEFAULT '{}',
  connected_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, platform)
);

ALTER TABLE social_connections ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "social_own_select" ON social_connections
    FOR SELECT USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "social_own_insert" ON social_connections
    FOR INSERT WITH CHECK (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "social_own_update" ON social_connections
    FOR UPDATE USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "social_own_delete" ON social_connections
    FOR DELETE USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
