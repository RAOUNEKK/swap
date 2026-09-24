/*
# Fix: swap confirmation only settled one direction of a mutual trade

## The bug
A `swaps` row represents a MUTUAL exchange: the provider teaches
`skill_taught_id` to the requester, AND the requester teaches
`skill_offered_id` back to the provider, in the same session. The original
`confirm_swap_and_settle_ledger` only ever settled the first direction —
crediting the provider and debiting the requester for `skill_taught` — and
never accounted for the requester teaching `skill_offered` back. An
perfectly even trade therefore left the provider permanently +Nh and the
requester permanently -Nh, instead of netting to zero as an even swap
should.

## The fix
Settle BOTH directions using the same session duration (the only duration
tracked per swap): each user gets a "Taught X" and "Learned Y" ledger entry
for full history/transparency in the Time Ledger UI, but the two directions
cancel out for both users' net hours_balance. hours_balance now only drifts
when someone teaches without an equal return across their swaps overall —
which is the correct meaning of a time-bank balance.

This migration also carries a one-time data correction for the single swap
that was already confirmed under the old logic before this fix shipped.
*/

CREATE OR REPLACE FUNCTION confirm_swap_and_settle_ledger(p_swap_id uuid)
RETURNS swaps
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_swap swaps;
  v_hours numeric(5,2);
  v_skill_taught_name text;
  v_skill_offered_name text;
BEGIN
  SELECT * INTO v_swap FROM swaps WHERE id = p_swap_id FOR UPDATE;

  IF v_swap.id IS NULL THEN
    RAISE EXCEPTION 'swap not found';
  END IF;

  IF auth.uid() != v_swap.requester_id AND auth.uid() != v_swap.provider_id THEN
    RAISE EXCEPTION 'not authorized to confirm this swap';
  END IF;

  IF v_swap.status != 'completed' THEN
    RAISE EXCEPTION 'swap must be completed before it can be confirmed (current status: %)', v_swap.status;
  END IF;

  SELECT name INTO v_skill_taught_name FROM skills_catalog WHERE id = v_swap.skill_taught_id;
  SELECT name INTO v_skill_offered_name FROM skills_catalog WHERE id = v_swap.skill_offered_id;
  v_hours := ROUND(v_swap.duration_minutes / 60.0, 2);

  UPDATE swaps
  SET status = 'confirmed', confirmed_at = now()
  WHERE id = p_swap_id
  RETURNING * INTO v_swap;

  -- Direction 1: provider teaches skill_taught to requester.
  INSERT INTO hours_ledger (user_id, swap_id, amount, reason)
  VALUES
    (v_swap.provider_id, p_swap_id, v_hours, coalesce('Taught ' || v_skill_taught_name, 'swap_completed')),
    (v_swap.requester_id, p_swap_id, -v_hours, coalesce('Learned ' || v_skill_taught_name, 'swap_completed'));

  -- Direction 2: requester teaches skill_offered back to provider. This is
  -- what makes it an actual swap rather than one-way tutoring — it offsets
  -- direction 1 so an even trade nets to zero for both people.
  INSERT INTO hours_ledger (user_id, swap_id, amount, reason)
  VALUES
    (v_swap.requester_id, p_swap_id, v_hours, coalesce('Taught ' || v_skill_offered_name, 'swap_completed')),
    (v_swap.provider_id, p_swap_id, -v_hours, coalesce('Learned ' || v_skill_offered_name, 'swap_completed'));

  UPDATE profiles SET hours_balance = hours_balance + v_hours - v_hours WHERE id = v_swap.provider_id;
  UPDATE profiles SET hours_balance = hours_balance + v_hours - v_hours WHERE id = v_swap.requester_id;

  RETURN v_swap;
END;
$$;

REVOKE ALL ON FUNCTION confirm_swap_and_settle_ledger(uuid) FROM public;
GRANT EXECUTE ON FUNCTION confirm_swap_and_settle_ledger(uuid) TO authenticated;

-- One-time correction for the swap already confirmed under the old logic.
-- Safe to re-run: only applies if the reciprocal entries don't exist yet.
DO $$
DECLARE
  v_swap swaps;
  v_hours numeric(5,2);
  v_skill_offered_name text;
BEGIN
  FOR v_swap IN
    SELECT s.* FROM swaps s
    WHERE s.status = 'confirmed'
    AND NOT EXISTS (
      SELECT 1 FROM hours_ledger hl
      WHERE hl.swap_id = s.id AND hl.user_id = s.requester_id AND hl.amount > 0
    )
  LOOP
    v_hours := ROUND(v_swap.duration_minutes / 60.0, 2);
    SELECT name INTO v_skill_offered_name FROM skills_catalog WHERE id = v_swap.skill_offered_id;

    INSERT INTO hours_ledger (user_id, swap_id, amount, reason)
    VALUES
      (v_swap.requester_id, v_swap.id, v_hours, coalesce('Taught ' || v_skill_offered_name, 'swap_completed')),
      (v_swap.provider_id, v_swap.id, -v_hours, coalesce('Learned ' || v_skill_offered_name, 'swap_completed'));

    UPDATE profiles SET hours_balance = hours_balance - v_hours WHERE id = v_swap.provider_id;
    UPDATE profiles SET hours_balance = hours_balance + v_hours WHERE id = v_swap.requester_id;
  END LOOP;
END $$;
