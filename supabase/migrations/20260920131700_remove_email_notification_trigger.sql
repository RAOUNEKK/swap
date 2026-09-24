-- Dropping the email-on-confirm trigger — replaced by in-app notifications
-- instead (see 20260920131800_add_swap_notifications.sql). The deployed
-- notify-swap-confirmed Edge Function itself is left in place since no
-- delete-function tool was available at the time; nothing calls it anymore,
-- and it still requires the correct WEBHOOK_SECRET to respond to anything
-- even if someone finds its URL. Remove it entirely with:
--   supabase functions delete notify-swap-confirmed
DROP TRIGGER IF EXISTS trg_notify_swap_confirmed ON swaps;
DROP FUNCTION IF EXISTS notify_swap_confirmed();
