/*
# Enforce review integrity server-side

reviews_insert_own only checked auth.uid() = reviewer_id — nothing stopped
an authenticated user from inserting a review for a swap they were never
part of, rating someone they never actually swapped with, or attaching a
skill_id that doesn't match what they actually learned in that swap. Since
per-skill ratings are now shown publicly on profiles, this needs to be
airtight server-side, not just relied on from the UI.
*/

CREATE OR REPLACE FUNCTION enforce_review_integrity()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  v_swap swaps;
  v_expected_skill_id uuid;
BEGIN
  SELECT * INTO v_swap FROM swaps WHERE id = NEW.swap_id;

  IF v_swap.id IS NULL THEN
    RAISE EXCEPTION 'swap not found';
  END IF;

  IF v_swap.status NOT IN ('confirmed', 'reviewed') THEN
    RAISE EXCEPTION 'can only review a confirmed swap';
  END IF;

  IF NEW.reviewer_id != v_swap.requester_id AND NEW.reviewer_id != v_swap.provider_id THEN
    RAISE EXCEPTION 'reviewer was not a participant in this swap';
  END IF;

  -- reviewee must be the OTHER participant, never the reviewer themselves
  -- (defense in depth alongside the reviews_no_self_review check constraint).
  IF NEW.reviewer_id = v_swap.requester_id THEN
    IF NEW.reviewee_id != v_swap.provider_id THEN
      RAISE EXCEPTION 'reviewee must be the other participant in this swap';
    END IF;
    v_expected_skill_id := v_swap.skill_taught_id; -- requester learned skill_taught from provider
  ELSE
    IF NEW.reviewee_id != v_swap.requester_id THEN
      RAISE EXCEPTION 'reviewee must be the other participant in this swap';
    END IF;
    v_expected_skill_id := v_swap.skill_offered_id; -- provider learned skill_offered from requester
  END IF;

  -- Force skill_id to the correct value server-side rather than trusting the
  -- client — this is what makes "rated 4.0 on teaching Graphic Design"
  -- trustworthy: the rating can only ever be attached to the skill the
  -- reviewer actually learned from the reviewee in this specific swap.
  NEW.skill_id := v_expected_skill_id;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_review_integrity ON reviews;
CREATE TRIGGER trg_enforce_review_integrity
  BEFORE INSERT ON reviews
  FOR EACH ROW EXECUTE FUNCTION enforce_review_integrity();

ALTER FUNCTION enforce_review_integrity() SET search_path = public;
