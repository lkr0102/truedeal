-- Fix infinite recursion in deal_participants RLS policy.
-- The old participants_select used EXISTS (SELECT 1 FROM deal_participants ...)
-- inside a policy on deal_participants itself, causing a recursive loop.
-- Solution: check only auth.uid() = user_id for own rows.
-- Co-participant visibility is handled at the deals level (deals_select_participant).

drop policy if exists "participants_select" on public.deal_participants;

create policy "participants_select" on public.deal_participants for select
  using (user_id = auth.uid());
