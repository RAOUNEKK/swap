/*
# Critical fix: missing base table grants (caused blanket 403s on every request)

## What was wrong
This project's `anon` and `authenticated` roles only had TRUNCATE, TRIGGER,
and REFERENCES privileges on every public table — never the standard
SELECT/INSERT/UPDATE/DELETE that PostgREST's roles need to attempt an
operation in the first place. RLS policies only restrict *which rows* a role
can see or touch; the role still needs this base GRANT before RLS is even
evaluated. Without it, literally every REST request — even a plain
`select id from profiles` — fails with 403, regardless of how correct the
RLS policies are.

This is normally set up automatically by Supabase when a project is
provisioned. It's unclear why it was missing here, but this migration makes
it explicit and reproducible so it can never silently regress, and sets
default privileges so any future table gets it automatically too.
*/

GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;

GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated, service_role;

ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO anon, authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT ALL ON TABLES TO service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT USAGE, SELECT ON SEQUENCES TO anon, authenticated, service_role;
