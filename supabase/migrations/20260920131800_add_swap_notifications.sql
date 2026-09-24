/*
# In-app notifications for swap lifecycle events

Notifies a user when: someone proposes a swap to them, their own proposal
gets accepted, or a swap they're part of gets scheduled.

Security model: there is deliberately NO insert policy for authenticated/
anon on this table, so a client can never create a notification for
themselves or anyone else — RLS defaults to deny when no policy matches an
operation. The only way rows get created is through the SECURITY DEFINER
trigger function below, which runs with owner privileges and is only ever
invoked by the database itself in response to a real swap event.

`data` stores just the dynamic bits (names, skill names) rather than a
pre-rendered sentence, so the client can render the message in whichever
language (English/Arabic) the viewer currently has selected.
*/

CREATE TABLE IF NOT EXISTS notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  type text NOT NULL CHECK (type IN ('swap_proposed', 'swap_accepted', 'swap_scheduled')),
  reference_id uuid REFERENCES swaps(id) ON DELETE CASCADE,
  data jsonb NOT NULL DEFAULT '{}'::jsonb,
  read boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_user_unread ON notifications(user_id) WHERE read = false;

DROP POLICY IF EXISTS "notifications_owner_read" ON notifications;
CREATE POLICY "notifications_owner_read"
ON notifications FOR SELECT
TO authenticated USING ((select auth.uid()) = user_id);

-- Only the `read` flag is ever meant to change from the client; enforced by
-- trigger below rather than trusting the client to only send that field.
DROP POLICY IF EXISTS "notifications_owner_update" ON notifications;
CREATE POLICY "notifications_owner_update"
ON notifications FOR UPDATE
TO authenticated
USING ((select auth.uid()) = user_id)
WITH CHECK ((select auth.uid()) = user_id);

-- No INSERT or DELETE policy for authenticated/anon: intentional.

CREATE OR REPLACE FUNCTION enforce_notification_immutable_fields()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.user_id := OLD.user_id;
  NEW.type := OLD.type;
  NEW.reference_id := OLD.reference_id;
  NEW.data := OLD.data;
  NEW.created_at := OLD.created_at;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_notification_immutable_fields ON notifications;
CREATE TRIGGER trg_enforce_notification_immutable_fields
  BEFORE UPDATE ON notifications
  FOR EACH ROW EXECUTE FUNCTION enforce_notification_immutable_fields();

-- ========================================================
-- Trigger: create notifications for proposed / accepted / scheduled
-- ========================================================

CREATE OR REPLACE FUNCTION create_swap_notifications()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_requester_name text;
  v_provider_name text;
  v_skill_taught_name text;
  v_skill_offered_name text;
  v_actor uuid := auth.uid();
BEGIN
  SELECT display_name INTO v_requester_name FROM profiles WHERE id = NEW.requester_id;
  SELECT display_name INTO v_provider_name FROM profiles WHERE id = NEW.provider_id;
  SELECT name INTO v_skill_taught_name FROM skills_catalog WHERE id = NEW.skill_taught_id;
  SELECT name INTO v_skill_offered_name FROM skills_catalog WHERE id = NEW.skill_offered_id;

  IF TG_OP = 'INSERT' THEN
    -- A new proposal always starts as 'proposed' — notify the provider,
    -- who hasn't acted yet and doesn't know about it.
    INSERT INTO notifications (user_id, type, reference_id, data)
    VALUES (
      NEW.provider_id, 'swap_proposed', NEW.id,
      jsonb_build_object(
        'partner_name', v_requester_name,
        'skill_taught', v_skill_taught_name,
        'skill_offered', v_skill_offered_name
      )
    );

  ELSIF TG_OP = 'UPDATE' THEN
    IF NEW.status = 'accepted' AND OLD.status IS DISTINCT FROM 'accepted' THEN
      -- The provider just accepted; notify the requester, who's been
      -- waiting and doesn't know yet.
      INSERT INTO notifications (user_id, type, reference_id, data)
      VALUES (
        NEW.requester_id, 'swap_accepted', NEW.id,
        jsonb_build_object('partner_name', v_provider_name, 'skill_taught', v_skill_taught_name)
      );

    ELSIF NEW.status = 'scheduled' AND (
      OLD.status IS DISTINCT FROM 'scheduled' OR OLD.scheduled_at IS DISTINCT FROM NEW.scheduled_at
    ) THEN
      -- Notify whichever participant did NOT just set/change the time —
      -- the one who did already knows, since they just did it.
      INSERT INTO notifications (user_id, type, reference_id, data)
      SELECT
        other_id,
        'swap_scheduled',
        NEW.id,
        jsonb_build_object(
          'partner_name', CASE WHEN other_id = NEW.requester_id THEN v_provider_name ELSE v_requester_name END,
          'scheduled_at', NEW.scheduled_at
        )
      FROM (SELECT CASE WHEN v_actor = NEW.requester_id THEN NEW.provider_id ELSE NEW.requester_id END AS other_id) x;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_swap_notifications_insert ON swaps;
CREATE TRIGGER trg_swap_notifications_insert
  AFTER INSERT ON swaps
  FOR EACH ROW EXECUTE FUNCTION create_swap_notifications();

DROP TRIGGER IF EXISTS trg_swap_notifications_update ON swaps;
CREATE TRIGGER trg_swap_notifications_update
  AFTER UPDATE ON swaps
  FOR EACH ROW EXECUTE FUNCTION create_swap_notifications();

REVOKE ALL ON FUNCTION create_swap_notifications() FROM PUBLIC, anon, authenticated;

-- Live updates for the notification bell, same as messages/swaps.
ALTER PUBLICATION supabase_realtime ADD TABLE notifications;
