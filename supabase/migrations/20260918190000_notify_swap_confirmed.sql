/*
# Notify participants by email when a swap is confirmed

Fires the notify-swap-confirmed Edge Function whenever a swap's status
transitions to 'confirmed'. Uses pg_net (asynchronous, fire-and-forget HTTP
from Postgres) so a slow or failing email provider can NEVER block or fail
the swap confirmation transaction itself — the trigger just queues the
request and returns immediately.

Authentication: this is a server-to-server call from the database, not a
user request, so it can't carry a user JWT. Instead it presents a shared
secret header that only this trigger and the Edge Function know (the
function was deployed with verify_jwt=false specifically to support this).
Rotate the secret by updating both this trigger (via a new migration) and
the function's WEBHOOK_SECRET secret together.

IMPORTANT: replace both occurrences below (the project URL and the secret
value) if you deploy this to a different Supabase project, and set the same
secret value as this project's Edge Function secret:
  supabase secrets set WEBHOOK_SECRET=<same value as below> --project-ref <your-ref>
See supabase/functions/notify-swap-confirmed/index.ts for the function code
and the full list of secrets it needs.
*/

CREATE EXTENSION IF NOT EXISTS pg_net SCHEMA extensions;

CREATE OR REPLACE FUNCTION notify_swap_confirmed()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public, net
AS $$
BEGIN
  IF NEW.status = 'confirmed' AND OLD.status IS DISTINCT FROM 'confirmed' THEN
    PERFORM net.http_post(
      url := 'https://byvyntzpwtowgqkrugrf.supabase.co/functions/v1/notify-swap-confirmed',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'x-webhook-secret', '6d22f90eec15137ee46d0edb5591694dc15d7d16f7b7df6416f6b63515528d30'
      ),
      body := jsonb_build_object('swap_id', NEW.id)
    );
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_swap_confirmed ON swaps;
CREATE TRIGGER trg_notify_swap_confirmed
  AFTER UPDATE ON swaps
  FOR EACH ROW EXECUTE FUNCTION notify_swap_confirmed();
