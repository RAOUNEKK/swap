# Swap — Skill Exchange Marketplace

> **Status:** connected to a live Supabase project (`swap`, ref
> `byvyntzpwtowgqkrugrf`). All six migrations below have already been applied
> to it via the Supabase MCP connector, `.env` is already pointed at it, and
> the security/performance advisors are clean. You do not need to redo the
> "create a project / run migrations" steps unless you're setting up a
> *different* environment (e.g. staging, or your own fork).

Swap is a Vite + React + TypeScript app where people trade skills hour-for-hour:
declare what you can teach and what you want to learn, get matched, propose a
swap, chat, schedule, complete the session, and the app settles an hour-credit
ledger between both people.

This README documents the Supabase backend and how to run the project from
scratch. **The backend already existed when this audit started** — it was not
built from zero. What follows is an accurate description of what's there,
plus the fixes made during this pass (see "Audit findings & fixes" below).

## Stack

- Vite + React 18 + TypeScript
- Tailwind CSS
- Supabase: Postgres, Auth, Row Level Security, Storage, Realtime
- `@supabase/supabase-js` v2

## 1. Create a Supabase project

1. Go to [supabase.com](https://supabase.com) → New Project.
2. Once it's provisioned, open **Project Settings → API**.
3. Copy the **Project URL** and the **`anon` `public`** key. You will not need
   the `service_role` key for anything in this repo — it must never be placed
   in frontend code.

## 2. Configure environment variables

```bash
cp .env.example .env
```

Fill in:

```
VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

`.env` is gitignored. Never commit it.

## 3. Run the migrations

Migrations live in `supabase/migrations/` and are ordered by timestamp. Apply
them with the Supabase CLI:

```bash
npm install -g supabase
supabase login
supabase link --project-ref your-project-ref
supabase db push
```

Or, if you don't want the CLI: open **SQL Editor** in the Supabase dashboard
and run each file in `supabase/migrations/` in filename order, oldest first:

1. `20260825124638_swap_core_schema.sql` — all tables, RLS policies, indexes,
   the profile-creation trigger, and the rating-cache trigger.
2. `20260826153528_allow_custom_skills_and_avatar_storage.sql.sql` — lets
   users add their own skills to the catalog; creates the `avatars` Storage
   bucket with owner-scoped write policies.
3. `20260912210959_add_fkto_profiles_for_joins.sql` — extra foreign keys to
   `profiles` so PostgREST can resolve nested `select()` joins used by the
   frontend (e.g. `swaps.requester:profiles(...)`).
4. `20260913220000_separate_custom_skills.sql` — adds `is_custom` /
   `created_by` to `skills_catalog` so user-typed skills don't pollute the
   curated catalog everyone else browses.
5. `20260914120000_secure_swap_confirmation_and_guards.sql` — **new in this
   pass.** Adds a state-machine guard on `swaps.status`, an auto-complete
   trigger, message-tamper protection, and a `confirm_swap_and_settle_ledger`
   RPC. See "Audit findings & fixes" below for why.
6. `20260914120100_seed_skills_catalog.sql` — **new in this pass.** Seeds
   ~60 curated skills across all 6 categories so a fresh project's Discover
   page isn't empty. Idempotent (`ON CONFLICT (name) DO NOTHING`).
7. `20260915223000_grant_base_table_privileges.sql` — **critical fix.** This
   project's `anon`/`authenticated` roles were missing the base
   SELECT/INSERT/UPDATE/DELETE grants that PostgREST needs before RLS is
   even evaluated, causing every single API request to fail with 403
   regardless of how correct the RLS policies were. See "Audit findings &
   fixes" below.
8. `20260915224500_fix_reciprocal_swap_ledger_settlement.sql` — fixes swap
   confirmation only settling one direction of a two-way trade (see below).
9. `20260916221000_add_skill_ratings.sql` — adds `skill_id` to `reviews` and
   a `skill_rating_summary` view (average + count per reviewee/skill,
   deliberately excluding reviewer identity) powering the new per-skill
   star-rating feature.
10. `20260916221500_enforce_review_integrity.sql` — a trigger that verifies
    a review's reviewer/reviewee were actually the two participants in that
    swap, that the swap is confirmed, and forces `skill_id` to the correct
    value server-side — the client can no longer fabricate ratings for
    swaps it wasn't part of or attach a rating to the wrong skill.
11. `20260917210000_enable_realtime_for_chat.sql` — **critical fix.** The
    `supabase_realtime` publication had zero tables registered, so live chat
    messages and swap status updates never pushed to the browser — the UI
    only caught up on a manual refresh. See "Audit findings & fixes" below.

The project is fully reproducible from an empty Supabase project by running
these six files in order.

## 4. Install and run

```bash
npm install
npm run dev
```

`npm run typecheck` and `npm run build` both pass cleanly.

## 5. How authentication works

- Email/password signup and login via `supabase.auth.signUp` /
  `signInWithPassword` (`src/context/AuthContext.tsx`).
- On signup, a Postgres trigger (`handle_new_user`, in migration 1) inserts a
  matching row into `profiles` automatically — the client never creates its
  own profile row.
- Sessions persist via `@supabase/supabase-js`'s built-in storage; auth state
  changes are subscribed to and update the whole app.
- New users are routed to `OnboardingPage` until `profiles.onboarding_complete`
  is true.
- Password reset / email verification use Supabase Auth's standard flows —
  enable/configure email templates and redirect URLs under **Authentication →
  Email Templates** and **URL Configuration** in the dashboard.

## 6. How RLS works here

Every table has RLS enabled. The short version:

| Table | Read | Write |
|---|---|---|
| `profiles` | any authenticated user | only your own row |
| `skills_catalog` | anyone (incl. anon) | authenticated users can add custom skills, which are auto-flagged `is_custom=true` and cannot be inserted as official entries from the client (see migration 4) |
| `user_skills` | any authenticated user (needed for matching) | only rows where `user_id = auth.uid()` |
| `availability` | any authenticated user | only your own rows |
| `swaps` | only the two participants | insert only as `requester_id = auth.uid()`; updates restricted to participants **and** gated by a Postgres state-machine trigger (migration 5) so, e.g., a requester can't unilaterally jump their own request to `completed` |
| `messages` | only the two swap participants | insert only as yourself, into a swap you're in; updates are locked to flipping `read_at` only (migration 5 forces `body`/`sender_id`/`swap_id` back to their old values on any UPDATE) |
| `hours_ledger` | only your own entries | settled exclusively through the `confirm_swap_and_settle_ledger` RPC (migration 5), not direct inserts from the client |
| `reviews` | anyone (ratings are public) | only as `reviewer_id = auth.uid()`, one per swap (`UNIQUE(swap_id, reviewer_id)`), can't review yourself (`CHECK`) |
| `storage.objects` (avatars bucket) | public read | owner-only write, scoped by folder path (`{user_id}/...`) |

`auth.uid()` is used everywhere instead of trusting any client-supplied user
id — insert policies use `WITH CHECK (auth.uid() = owner_column)`, and columns
like `user_id`/`requester_id`/`sender_id`/`reviewer_id` default to
`auth.uid()` in the schema so the client doesn't even need to pass them.

## 7. Realtime messaging

`SwapDetailPage` subscribes to a per-swap Postgres Changes channel
(`messages:{swapId}`) for `INSERT` on `messages` and `UPDATE` on `swaps`, and
unsubscribes on unmount. Because RLS also applies to realtime payloads, a user
can only ever receive change events for swaps/messages they're a participant
in.

## 8. Deploying

- Frontend: any static host that supports Vite output (Vercel, Netlify,
  Cloudflare Pages, etc.). Set `VITE_SUPABASE_URL` and
  `VITE_SUPABASE_ANON_KEY` as build-time environment variables in the host's
  dashboard — do not bake real values into source control.
- Backend: your Supabase project is already "deployed" — there's nothing to
  build server-side. Just make sure `supabase db push` has been run against
  production before shipping the frontend, and that Auth's **Site URL** /
  **Redirect URLs** in the dashboard match your production domain (needed for
  email confirmation / password-reset links to work).

---

## Audit findings & fixes (this pass)

The backend was already substantially built (schema, RLS, auth, storage,
realtime chat all present and working) before this session started. Auditing
it turned up a few real bugs, fixed in
`20260914120000_secure_swap_confirmation_and_guards.sql`:

1. **Hour-ledger settlement silently failed for one side.** When confirming a
   completed swap, the client tried to update `profiles.hours_balance` for
   *both* participants directly. RLS only allows updating your own profile,
   so whichever user clicked "confirm" got their own balance updated and the
   other participant's update was rejected by RLS without the UI surfacing
   it. Fixed with a `SECURITY DEFINER` RPC, `confirm_swap_and_settle_ledger`,
   that authorizes the caller, then atomically transitions the swap and
   settles both balances server-side. The frontend (`SwapDetailPage.tsx`) now
   calls this RPC instead of writing to `hours_ledger`/`profiles` directly.
2. **No server-side state machine on `swaps.status`.** Any participant could
   `UPDATE` a swap's status to anything via the existing RLS policy — e.g. a
   requester could set their own pending request straight to `completed`.
   Added a trigger that only allows a defined set of forward transitions,
   some restricted to a specific participant (only the provider can
   accept/decline a proposal, only the requester can cancel a pending one),
   and makes `requester_id`/`provider_id`/skill columns immutable after
   creation.
3. **Race condition on "mark complete."** The client computed "are both sides
   done?" from a local read that could be stale, and set `status='completed'`
   itself. Moved that check into a database trigger that fires off the
   authoritative row, so the client now only ever sets its own completion
   flag.
4. **Message tampering via the read-receipt UPDATE policy.** The policy that
   lets the *other* participant mark a message read (`UPDATE ... WHERE
   auth.uid() != sender_id`) had `WITH CHECK (true)`, so that same policy
   could be used to rewrite a message's body, sender, or swap. Added a
   trigger that forces `body`/`sender_id`/`swap_id`/`created_at` back to
   their prior values on every UPDATE, so the policy can only ever flip
   `read_at`.
5. **No seed data.** The original schema migration's comments described a
   catalog pre-seeded with ~60 skills, but no migration actually inserted
   them (the live project was seeded by hand at some point). Added
   `20260914120100_seed_skills_catalog.sql` so the project is reproducible
   from an empty Supabase instance.
6. **Missing base table grants (critical, found after this project was
   connected).** `anon` and `authenticated` only had TRUNCATE/TRIGGER/
   REFERENCES on every table — never SELECT/INSERT/UPDATE/DELETE. RLS
   policies only restrict *which rows* a role can touch; the role still
   needs this base grant to attempt the operation at all. Without it, every
   single REST request failed with 403 no matter how correct the RLS setup
   was — this is normally configured automatically when Supabase provisions
   a project, so its absence here was a project-level anomaly, not
   something caused by any of the SQL in this repo. Fixed in
   `20260915223000_grant_base_table_privileges.sql`.
7. **Swap confirmation only settled one direction of a two-way trade.** A
   `swaps` row is a mutual exchange — the provider teaches `skill_taught` to
   the requester AND the requester teaches `skill_offered` back, in the same
   session. `confirm_swap_and_settle_ledger` only ever settled the first
   direction, so an even trade left the provider permanently +Nh and the
   requester permanently -Nh instead of netting to zero. Fixed in
   `20260915224500_fix_reciprocal_swap_ledger_settlement.sql`, which also
   carries a one-time data correction for the swap already confirmed under
   the old logic.
8. **Realtime chat never pushed live updates (critical, found after this
   project was connected).** The `supabase_realtime` publication had zero
   tables registered. `SwapDetailPage.tsx`'s `postgres_changes`
   subscriptions on `messages` and `swaps` were correctly written, but
   Postgres never broadcasts anything for a table that isn't explicitly
   added to this publication — same underlying pattern as the missing base
   grants (something that should be configured automatically on a healthy
   Supabase project and wasn't here). Fixed in
   `20260917210000_enable_realtime_for_chat.sql`.

## Dark mode: text and panel contrast fixed

The app's dark theme was shipped with CSS overrides pointed at the wrong
class names — the codebase uses `text-charcoal-*` throughout (144
occurrences), but the dark-mode rules only ever targeted `text-ink-*` (3
occurrences), leaving nearly all heading/body text rendering near-black on a
dark background. The same class-name mismatch affected `bg-ivory-*` panel
backgrounds (review boxes, skill rows) and the pastel `bg-teal-50` /
`bg-coral-50` / `bg-sage-50` / `bg-terracotta-50` info-box surfaces used
throughout Discover and the swap detail page — all rendered as bright,
washed-out rectangles floating on dark cards. Fixed directly in
`src/index.css`'s `@layer utilities` block: each text shade keeps its
relative prominence (subtle stays dim, headings go bright) and each pastel
surface gets a dark, desaturated tint of its own hue rather than a blanket
white-out, so panels still read as "this hue's box" rather than losing their
color coding.

## Feature: hours-balance UI removed, per-skill star ratings added

Per a later request, the hours-balance concept was removed from the UI
(header chip, Dashboard's balance/taught/learned cards, Time Ledger) while
the underlying `hours_ledger` table and `confirm_swap_and_settle_ledger` RPC
were kept in the database, so the data model isn't lost if it's wanted again.

In its place: profiles can now be rated per skill, not just overall.
- **Clicking anyone's name/avatar** (in Discover match cards, a swap's
  partner header, or Dashboard's recent activity) opens their public,
  read-only profile at `PublicProfilePage`.
- After a swap is confirmed, either participant can rate the other from
  that profile page. The rating is automatically tied to the specific skill
  they learned in that swap (enforced server-side — see below), so a
  profile can show "rated 4.0 on teaching Graphic Design by 3 swappers."
- **Ratings are anonymous.** `skill_rating_summary` is a public view over
  `reviews` that returns only the average and count per (person, skill) —
  it never exposes `reviewer_id`. Written review comments also no longer
  display the reviewer's name/avatar anywhere (Dashboard, own profile, and
  public profile all show "A swapper" instead).
- **Integrity is enforced server-side, not just in the UI.** A trigger
  (`enforce_review_integrity`) checks that the reviewer/reviewee were
  actually the two participants in that specific swap and that it's
  confirmed, and force-sets `skill_id` to the skill the reviewer actually
  learned in that swap — the client can't fabricate a rating for a swap it
  wasn't part of, or attach it to the wrong skill.

Both `npm run typecheck` and `npm run build` pass with no errors after these
changes.

### Not implemented (out of scope for this pass)

The original brief mentioned notifications, user reporting, and blocking.
The current frontend has no UI for any of the three — no notification bell,
no report/block buttons anywhere — so nothing was added for them, per the
instruction not to change the existing visual design. If you want these,
they're additive (new tables + RLS are straightforward; they'd need actual UI
surfaces designed to match Swap's existing visual language, which is a
design task, not just a backend one). Happy to build them once you've decided
where they should live in the UI.

## Feature: in-app notifications (replaced the email approach below)

A later request replaced email notifications with real in-app ones instead.
A bell in the header shows unread count and a dropdown list, live via
Realtime, for three events: a swap is proposed to you, your proposal gets
accepted, or a swap gets scheduled. Clicking one marks it read and opens
that swap.

**Security model, same principle as messages:** the `notifications` table
has no INSERT policy for `authenticated`/`anon` at all — a client can
never create a notification for themselves or anyone else, since RLS
defaults to deny when no policy matches. Rows are only ever created by a
`SECURITY DEFINER` trigger (`create_swap_notifications`) reacting to real
`swaps` table changes, and a second trigger forces every column except
`read` to stay immutable on UPDATE, so the client can only ever mark a
notification read, never rewrite its content.

**Why the message text isn't stored directly:** the `data` column holds
just the raw facts (partner's name, skill name, scheduled time) rather than
a pre-written sentence, so the client renders the message in whichever
language the viewer currently has selected — a hardcoded English sentence
in the database wouldn't localize for Arabic users.

The email-on-confirm Edge Function further below was built first, then
superseded by this — its trigger has been dropped so it's no longer called,
though the function itself is still deployed and harmless (still gated by
its shared secret) since removing it entirely required a CLI command:
```bash
supabase functions delete notify-swap-confirmed
```

## Feature: Edge Function — email notification on swap confirmation

**Note:** this was the original approach before switching to in-app
notifications above. Left documented here since the function is still
deployed (see the note above for removing it), and the underlying pattern
(Edge Function + pg_net trigger + shared-secret auth) may be useful again
for a different event later.

Everything else in this backend is expressed as Postgres (RLS, triggers,
RPC functions) because Postgres could do all of it — there was never a need
for a separate server. Sending a real email is the one thing Postgres can't
do on its own, so this is implemented as an actual deployed **Supabase Edge
Function** (`supabase/functions/notify-swap-confirmed/index.ts`), a real
serverless TypeScript function running on Deno — genuine custom backend
compute, not a database function.

**How it's wired:**
1. A Postgres trigger (`20260918190000_notify_swap_confirmed.sql`) fires
   whenever a swap's `status` transitions to `confirmed`.
2. It calls the deployed Edge Function via `pg_net` — an **asynchronous**
   HTTP call, so a slow or broken email provider can never block or fail
   the swap confirmation transaction itself; the trigger just queues the
   request and returns immediately.
3. The function looks up both participants and what they taught each
   other, then emails each of them via [Resend](https://resend.com).

**Authentication:** this call comes from the database, not a browser, so it
can't carry a user's login token. The function is deployed with
`verify_jwt: false` and instead checks a shared secret header
(`x-webhook-secret`) that only the trigger and the function know — anyone
without that secret gets a `401`, verified directly against the live
function before this was considered done.

**Required setup (one manual step, since I can't set your project's
secrets for you through the tools available to me):**
```bash
supabase login
supabase link --project-ref byvyntzpwtowgqkrugrf
supabase secrets set WEBHOOK_SECRET=6d22f90eec15137ee46d0edb5591694dc15d7d16f7b7df6416f6b63515528d30
```
That alone makes the pipeline fully functional end-to-end (verified live:
the trigger reaches the function correctly). Without it, the function
safely returns `401` and no email is attempted — it can never crash a swap
confirmation.

To actually send emails, also set:
```bash
supabase secrets set RESEND_API_KEY=your-resend-api-key
```
Get a free key at [resend.com](https://resend.com) — no card required, no
domain verification needed to start (the function defaults to Resend's
shared sandbox sender, `onboarding@resend.dev`). Once you verify your own
domain there, also set `RESEND_FROM_EMAIL="Swap <hello@yourdomain.com>"` to
send from your own address instead.

If you ever redeploy this function or trigger to a different Supabase
project, generate a new secret (`openssl rand -hex 32`) and use the same
value in both places — the migration file and the `supabase secrets set`
command — or the two will never match.
