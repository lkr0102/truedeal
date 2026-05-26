-- ── Notifications ─────────────────────────────────────────────────────────────
-- Stores in-app notifications per user with bilingual content (PT + EN).
-- Inserts come exclusively from server-side service-role calls (no INSERT RLS needed).

CREATE TABLE IF NOT EXISTS public.notifications (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  type       TEXT        NOT NULL,
  deal_id    UUID        REFERENCES public.deals(id) ON DELETE SET NULL,
  title_pt   TEXT        NOT NULL,
  title_en   TEXT        NOT NULL,
  body_pt    TEXT        NOT NULL,
  body_en    TEXT        NOT NULL,
  is_read    BOOLEAN     NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Fast lookup: all notifications for a user, newest first
CREATE INDEX IF NOT EXISTS idx_notifications_user_created
  ON public.notifications (user_id, created_at DESC);

-- Fast unread count per user
CREATE INDEX IF NOT EXISTS idx_notifications_user_unread
  ON public.notifications (user_id, is_read)
  WHERE is_read = false;

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "notifications_select_own"
  ON public.notifications FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "notifications_update_own"
  ON public.notifications FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Enable Supabase Realtime so new inserts are broadcast to subscribed clients
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
