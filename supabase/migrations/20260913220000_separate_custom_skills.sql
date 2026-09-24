/*
# Separate custom (user-typed) skills from the curated catalog

## Problem
skills_catalog is shared by every user. When someone types a skill that
isn't in the ~60 seeded skills (e.g. "play uno"), it was being inserted
straight into skills_catalog with no distinction from the app's curated
list — so it showed up in the browsable skill grid for every other user,
mixed in with "Accounting", "Photography", etc.

## Fix
- Add is_custom (default false) and created_by to skills_catalog.
- A BEFORE INSERT trigger forces is_custom = true and created_by =
  auth.uid() whenever a row is inserted through an authenticated client
  session, regardless of what the client sends. That way only rows
  inserted by the project owner directly in the SQL editor (where
  auth.uid() is null) can ever be is_custom = false ("official").
- The app's browsable catalog query should filter to is_custom = false,
  and separately fetch the current user's own is_custom = true rows so
  they still see (and can reuse) skills they typed themselves.
*/

ALTER TABLE skills_catalog ADD COLUMN IF NOT EXISTS is_custom boolean NOT NULL DEFAULT false;
ALTER TABLE skills_catalog ADD COLUMN IF NOT EXISTS created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_skills_catalog_is_custom ON skills_catalog(is_custom);
CREATE INDEX IF NOT EXISTS idx_skills_catalog_created_by ON skills_catalog(created_by);

CREATE OR REPLACE FUNCTION enforce_custom_skill_flag()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NOT NULL THEN
    NEW.is_custom := true;
    NEW.created_by := auth.uid();
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_custom_skill_flag ON skills_catalog;
CREATE TRIGGER trg_enforce_custom_skill_flag
  BEFORE INSERT ON skills_catalog
  FOR EACH ROW EXECUTE FUNCTION enforce_custom_skill_flag();
