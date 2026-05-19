-- Fix infinite recursion in deal_participants RLS policies.
-- Root cause: deals_select_participant queries deal_participants, which triggers
-- participants_select_deal_members, which queries deal_participants again → recursion.
-- Solution: a SECURITY DEFINER function that bypasses RLS for the membership check.

CREATE OR REPLACE FUNCTION public.is_deal_participant(p_deal_id uuid, p_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM deal_participants
    WHERE deal_id = p_deal_id AND user_id = p_user_id
  );
$$;

-- Drop the self-referential policy on deal_participants
DROP POLICY IF EXISTS participants_select_deal_members ON public.deal_participants;

-- Recreate it using the security definer function (no recursion)
CREATE POLICY participants_select_deal_members ON public.deal_participants
  FOR SELECT
  USING (public.is_deal_participant(deal_id, auth.uid()));

-- Fix deals_select_participant to also use the function
DROP POLICY IF EXISTS deals_select_participant ON public.deals;

CREATE POLICY deals_select_participant ON public.deals
  FOR SELECT
  USING (public.is_deal_participant(id, auth.uid()));

-- Fix deals_update_participant to use the function too (same pattern)
DROP POLICY IF EXISTS deals_update_participant ON public.deals;

CREATE POLICY deals_update_participant ON public.deals
  FOR UPDATE
  USING (public.is_deal_participant(id, auth.uid()));
