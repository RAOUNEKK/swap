/*
# Harden swap lifecycle + message integrity

## Problems found in audit

1. **Ledger/balance update bypassed by RLS (functional bug).**
   The client (SwapDetailPage.handleConfirmAndLedger) tried to update
   `profiles.hours_balance` for BOTH the requester and the provider directly
   from the browser. `profiles_update_own` only allows `auth.uid() = id`, so
   whichever user clicked "confirm" could only ever update their OWN balance
   — the other participant's balance silently failed to update (RLS blocks
   it, and the client didn't check that particular error). Two clicks (one
   from each participant) could also double-insert ledger entries since
   nothing prevented re-running the transition.

   Fix: a SECURITY DEFINER RPC `confirm_swap_and_settle_ledger(swap_id)`
   that authorizes the caller, atomically flips status completed -> confirmed
   (guarded so it can only run once), inserts both ledger rows, and updates
   both balances server-side. The client now calls this RPC instead of
   writing to hours_ledger/profiles directly.

2. **No state-machine enforcement on swaps.status.**
   `swaps_participant_update` lets either participant UPDATE any column,
   including status, to anything — e.g. a requester could set their own
   pending request straight to 'completed' or 'confirmed', or change who
   the swap belongs to. Fix: a BEFORE UPDATE trigger that (a) makes
   requester_id/provider_id/skill_taught_id/skill_offered_id immutable and
   (b) only allows a fixed set of forward transitions, some of which are
   further restricted to a specific participant (e.g. only the provider can
   accept/decline).

3. **Auto-complete race condition.**
   The client computed "are both sides done?" from a possibly-stale local
   read and set status='completed' itself. Fix: an AFTER UPDATE trigger
   flips status to 'completed' (and stamps completed_at) as soon as both
   requester_completed and provider_completed are true, computed from the
   authoritative row in the database — no client-side race.

4. **Message tampering.** `messages_sender_update` allowed the *other*
   participant to UPDATE a message (intended for marking read) with
   `WITH CHECK (true)`, which meant they could rewrite the message body,
   swap the sender_id, or move it to a different swap. Fix: a BEFORE UPDATE
   trigger forces body/sender_id/swap_id/created_at to stay unchanged, so
   the UPDATE policy can only ever be used to flip read_at.
*/

-- ========================================================
-- 1. Lock down message edits to read-receipt only
-- ========================================================

CREATE OR REPLACE FUNCTION enforce_message_immutable_fields()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.body := OLD.body;
  NEW.sender_id := OLD.sender_id;
  NEW.swap_id := OLD.swap_id;
  NEW.created_at := OLD.created_at;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_message_immutable_fields ON messages;
CREATE TRIGGER trg_enforce_message_immutable_fields
  BEFORE UPDATE ON messages
  FOR EACH ROW EXECUTE FUNCTION enforce_message_immutable_fields();

-- ========================================================
-- 2. Swap state-machine guard
-- ========================================================

CREATE OR REPLACE FUNCTION enforce_swap_transition()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  is_requester boolean := auth.uid() = OLD.requester_id;
  is_provider boolean := auth.uid() = OLD.provider_id;
BEGIN
  -- Core identity/skill columns are immutable after creation.
  IF NEW.requester_id != OLD.requester_id
     OR NEW.provider_id != OLD.provider_id
     OR NEW.skill_taught_id != OLD.skill_taught_id
     OR NEW.skill_offered_id != OLD.skill_offered_id THEN
    RAISE EXCEPTION 'swap participants and skills cannot be changed';
  END IF;

  -- No-op status updates (e.g. only touching completion flags) are always fine
  -- as long as they don't skip the state machine below.
  IF NEW.status = OLD.status THEN
    RETURN NEW;
  END IF;

  IF OLD.status = 'proposed' AND NEW.status = 'accepted' THEN
    IF NOT is_provider THEN
      RAISE EXCEPTION 'only the provider can accept a swap';
    END IF;

  ELSIF OLD.status = 'proposed' AND NEW.status = 'declined' THEN
    IF NOT is_provider THEN
      RAISE EXCEPTION 'only the provider can decline a swap';
    END IF;

  ELSIF OLD.status = 'proposed' AND NEW.status = 'cancelled' THEN
    IF NOT is_requester THEN
      RAISE EXCEPTION 'only the requester can cancel a proposed swap';
    END IF;

  ELSIF OLD.status = 'accepted' AND NEW.status = 'scheduled' THEN
    NULL; -- either participant can propose/confirm a time

  ELSIF OLD.status = 'accepted' AND NEW.status = 'cancelled' THEN
    NULL;

  ELSIF OLD.status = 'scheduled' AND NEW.status = 'scheduled' THEN
    NULL; -- rescheduling

  ELSIF OLD.status = 'scheduled' AND NEW.status = 'cancelled' THEN
    NULL;

  ELSIF OLD.status = 'scheduled' AND NEW.status = 'completed' THEN
    NULL; -- normally set by trg_swap_auto_complete, allowed here defensively

  ELSIF OLD.status = 'completed' AND NEW.status = 'confirmed' THEN
    -- In normal operation this only happens inside the SECURITY DEFINER
    -- confirm_swap_and_settle_ledger() function below, which runs as the
    -- table owner and therefore does not go through auth.uid()-scoped RLS
    -- checks the same way — but the transition itself is still validated
    -- here for defense in depth.
    NULL;

  ELSIF OLD.status = 'confirmed' AND NEW.status = 'reviewed' THEN
    NULL;

  ELSE
    RAISE EXCEPTION 'invalid swap status transition: % -> %', OLD.status, NEW.status;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_swap_transition ON swaps;
CREATE TRIGGER trg_enforce_swap_transition
  BEFORE UPDATE ON swaps
  FOR EACH ROW EXECUTE FUNCTION enforce_swap_transition();

-- ========================================================
-- 3. Auto-complete once both sides mark done (removes client race)
-- ========================================================

CREATE OR REPLACE FUNCTION auto_complete_swap()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.requester_completed AND NEW.provider_completed AND NEW.status = 'scheduled' THEN
    NEW.status := 'completed';
    NEW.completed_at := now();
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_swap_auto_complete ON swaps;
CREATE TRIGGER trg_swap_auto_complete
  BEFORE UPDATE ON swaps
  FOR EACH ROW EXECUTE FUNCTION auto_complete_swap();

-- Trigger order matters: Postgres fires BEFORE triggers on the same table in
-- alphabetical order by trigger name, so trg_enforce_swap_transition (e)
-- runs before trg_swap_auto_complete (s). The transition guard sees the
-- client's original NEW.status ('scheduled', unchanged) and allows it as a
-- no-op; auto_complete_swap then promotes it to 'completed' afterwards.

-- ========================================================
-- 4. Atomic, authorized swap confirmation + ledger settlement
-- ========================================================

CREATE OR REPLACE FUNCTION confirm_swap_and_settle_ledger(p_swap_id uuid)
RETURNS swaps
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_swap swaps;
  v_hours numeric(5,2);
  v_skill_name text;
BEGIN
  -- Lock the row so two concurrent calls can't both pass the status check.
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

  SELECT name INTO v_skill_name FROM skills_catalog WHERE id = v_swap.skill_taught_id;
  v_hours := ROUND(v_swap.duration_minutes / 60.0, 2);

  UPDATE swaps
  SET status = 'confirmed', confirmed_at = now()
  WHERE id = p_swap_id
  RETURNING * INTO v_swap;

  INSERT INTO hours_ledger (user_id, swap_id, amount, reason)
  VALUES
    (v_swap.provider_id, p_swap_id, v_hours, coalesce('Taught ' || v_skill_name, 'swap_completed')),
    (v_swap.requester_id, p_swap_id, -v_hours, coalesce('Learned ' || v_skill_name, 'swap_completed'));

  UPDATE profiles SET hours_balance = hours_balance + v_hours WHERE id = v_swap.provider_id;
  UPDATE profiles SET hours_balance = hours_balance - v_hours WHERE id = v_swap.requester_id;

  RETURN v_swap;
END;
$$;

REVOKE ALL ON FUNCTION confirm_swap_and_settle_ledger(uuid) FROM public;
GRANT EXECUTE ON FUNCTION confirm_swap_and_settle_ledger(uuid) TO authenticated;
