/*
# Enable Realtime for chat and swap status updates

The `supabase_realtime` publication had zero tables registered on this
project. `SwapDetailPage.tsx` correctly subscribes to `postgres_changes` on
`messages` (new chat messages) and `swaps` (status updates like accept/
decline/complete), but Postgres never broadcasts anything for a table unless
it's explicitly added to this publication — so those subscriptions silently
received nothing, and the UI only ever caught up on a manual refetch (e.g.
reloading the page). This is normally configured automatically when
Supabase provisions a project; its absence here matches the same pattern as
the earlier missing base table grants.

Realtime respects each table's existing RLS policies, so this doesn't
change who can see what — messages_participant_read and swaps_participant_read
already correctly scope every change event to the two swap participants.
*/

ALTER PUBLICATION supabase_realtime ADD TABLE messages;
ALTER PUBLICATION supabase_realtime ADD TABLE swaps;
