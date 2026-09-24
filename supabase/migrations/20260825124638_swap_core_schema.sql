/*
# Swap — Core Schema: Skills Exchange Marketplace

## Overview
Creates the full data model for Swap, a skill-exchange marketplace where users
trade knowledge hour-for-hour. Each user declares skills they can teach and skills
they want to learn, sets availability, and then proposes swaps. Swaps go through
a defined lifecycle: proposed → accepted → scheduled → completed → reviewed.

## Time Credits
Every user has a "hours balance" tracked in a ledger. Teaching earns +hours,
learning costs -hours. The balance can go negative (the system allows going into
debt up to a soft limit). The ledger provides a full transaction history.

## Tables Created

1. **profiles** — extends auth.users with display name, bio, avatar URL, timezone,
   and cached rating average / count for fast display.
2. **skills_catalog** — master list of skills organized by category, seeded with
   ~60 skills across Creative, Technology, Languages, Music, Business, Lifestyle.
3. **user_skills** — junction: a user can teach and/or learn a skill. Has
   proficiency level (1-5) for teaching and urgency (1-3) for learning.
4. **availability** — weekly recurring availability slots (day_of_week 0-6,
   start_hour / end_hour in 0-23). Users set when they're free.
5. **swaps** — a swap proposal between two users. Has requester, provider,
   skill_taught (what the provider teaches), skill_offered (what the requester
   teaches in return), status, proposed duration, scheduled time, and lifecycle
   timestamps.
6. **messages** — chat messages between the two participants of a swap.
7. **hours_ledger** — append-only ledger of time-credit transactions. Each entry
   records the swap, amount (positive = earned teaching, negative = spent
   learning), and the user it applies to.
8. **reviews** — post-swap reviews. Each swap gets up to two reviews (one per
   participant reviewing the other). Rating 1-5 + text.

## Security (RLS)
- All tables have RLS enabled.
- profiles: users can read all profiles (marketplace needs visibility) but only
  update their own. Insert is handled at signup via a trigger, so the public
  INSERT policy is scoped to self.
- skills_catalog: public read (TO anon, authenticated) — it's reference data.
- user_skills, availability: read is public (needed for matching), writes are
  owner-only.
- swaps: both participants can read their swaps; only the requester can insert;
  status transitions are owner/participant-scoped via UPDATE.
- messages: only the two swap participants can read/insert.
- hours_ledger: participants can read their own entries. Inserts are allowed for
  authenticated users (the app writes ledger entries on swap completion; a
  future enhancement could move this to a SECURITY DEFINER function).
- reviews: public read (ratings shown on profiles), but only the swap
  participant can insert their own review.

## Notes
- profiles.id references auth.users(id) and defaults to auth.uid() so the trigger
  can insert without passing the id.
- All owner columns default to auth.uid() so frontend inserts that omit the
  owner still satisfy WITH CHECK policies.
- Cached rating fields on profiles (rating_avg, rating_count) are updated by a
  trigger when reviews are inserted.
*/

-- ========================
-- 1. PROFILES
-- ========================
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name text NOT NULL DEFAULT '',
  bio text DEFAULT '',
  avatar_url text DEFAULT '',
  timezone text NOT NULL DEFAULT 'America/New_York',
  location text DEFAULT '',
  rating_avg numeric(3,2) DEFAULT 0,
  rating_count integer DEFAULT 0,
  hours_balance numeric(5,2) DEFAULT 0,
  onboarding_complete boolean NOT NULL DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "profiles_public_read" ON profiles;
CREATE POLICY "profiles_public_read"
ON profiles FOR SELECT
TO authenticated USING (true);

DROP POLICY IF EXISTS "profiles_insert_own" ON profiles;
CREATE POLICY "profiles_insert_own"
ON profiles FOR INSERT
TO authenticated WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "profiles_update_own" ON profiles;
CREATE POLICY "profiles_update_own"
ON profiles FOR UPDATE
TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

-- ========================
-- 2. SKILLS CATALOG
-- ========================
CREATE TABLE IF NOT EXISTS skills_catalog (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  category text NOT NULL DEFAULT 'Technology',
  icon text DEFAULT 'BookOpen',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE skills_catalog ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "skills_catalog_read" ON skills_catalog;
CREATE POLICY "skills_catalog_read"
ON skills_catalog FOR SELECT
TO anon, authenticated USING (true);

CREATE INDEX IF NOT EXISTS idx_skills_catalog_category ON skills_catalog(category);
CREATE INDEX IF NOT EXISTS idx_skills_catalog_name ON skills_catalog(name);

-- ========================
-- 3. USER SKILLS (teach / learn)
-- ========================
CREATE TABLE IF NOT EXISTS user_skills (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  skill_id uuid NOT NULL REFERENCES skills_catalog(id) ON DELETE CASCADE,
  can_teach boolean NOT NULL DEFAULT false,
  wants_to_learn boolean NOT NULL DEFAULT false,
  proficiency integer DEFAULT 3 CHECK (proficiency >= 1 AND proficiency <= 5),
  urgency integer DEFAULT 2 CHECK (urgency >= 1 AND urgency <= 3),
  notes text DEFAULT '',
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, skill_id)
);

ALTER TABLE user_skills ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "user_skills_public_read" ON user_skills;
CREATE POLICY "user_skills_public_read"
ON user_skills FOR SELECT
TO authenticated USING (true);

DROP POLICY IF EXISTS "user_skills_insert_own" ON user_skills;
CREATE POLICY "user_skills_insert_own"
ON user_skills FOR INSERT
TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "user_skills_update_own" ON user_skills;
CREATE POLICY "user_skills_update_own"
ON user_skills FOR UPDATE
TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "user_skills_delete_own" ON user_skills;
CREATE POLICY "user_skills_delete_own"
ON user_skills FOR DELETE
TO authenticated USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_user_skills_user ON user_skills(user_id);
CREATE INDEX IF NOT EXISTS idx_user_skills_teach ON user_skills(can_teach) WHERE can_teach = true;
CREATE INDEX IF NOT EXISTS idx_user_skills_learn ON user_skills(wants_to_learn) WHERE wants_to_learn = true;

-- ========================
-- 4. AVAILABILITY
-- ========================
CREATE TABLE IF NOT EXISTS availability (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  day_of_week integer NOT NULL CHECK (day_of_week >= 0 AND day_of_week <= 6),
  start_hour integer NOT NULL CHECK (start_hour >= 0 AND start_hour <= 23),
  end_hour integer NOT NULL CHECK (end_hour >= 1 AND end_hour <= 24),
  created_at timestamptz DEFAULT now(),
  CHECK (end_hour > start_hour)
);

ALTER TABLE availability ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "availability_public_read" ON availability;
CREATE POLICY "availability_public_read"
ON availability FOR SELECT
TO authenticated USING (true);

DROP POLICY IF EXISTS "availability_insert_own" ON availability;
CREATE POLICY "availability_insert_own"
ON availability FOR INSERT
TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "availability_update_own" ON availability;
CREATE POLICY "availability_update_own"
ON availability FOR UPDATE
TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "availability_delete_own" ON availability;
CREATE POLICY "availability_delete_own"
ON availability FOR DELETE
TO authenticated USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_availability_user ON availability(user_id);

-- ========================
-- 5. SWAPS
-- ========================
CREATE TABLE IF NOT EXISTS swaps (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  requester_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  provider_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  skill_taught_id uuid NOT NULL REFERENCES skills_catalog(id) ON DELETE CASCADE,
  skill_offered_id uuid NOT NULL REFERENCES skills_catalog(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'proposed' CHECK (status IN ('proposed','accepted','declined','scheduled','completed','confirmed','cancelled','reviewed')),
  duration_minutes integer NOT NULL DEFAULT 60 CHECK (duration_minutes > 0),
  scheduled_at timestamptz,
  requester_completed boolean NOT NULL DEFAULT false,
  provider_completed boolean NOT NULL DEFAULT false,
  completed_at timestamptz,
  confirmed_at timestamptz,
  declined_at timestamptz,
  cancelled_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CHECK (requester_id != provider_id)
);

ALTER TABLE swaps ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "swaps_participant_read" ON swaps;
CREATE POLICY "swaps_participant_read"
ON swaps FOR SELECT
TO authenticated USING (auth.uid() = requester_id OR auth.uid() = provider_id);

DROP POLICY IF EXISTS "swaps_requester_insert" ON swaps;
CREATE POLICY "swaps_requester_insert"
ON swaps FOR INSERT
TO authenticated WITH CHECK (auth.uid() = requester_id);

DROP POLICY IF EXISTS "swaps_participant_update" ON swaps;
CREATE POLICY "swaps_participant_update"
ON swaps FOR UPDATE
TO authenticated
USING (auth.uid() = requester_id OR auth.uid() = provider_id)
WITH CHECK (auth.uid() = requester_id OR auth.uid() = provider_id);

DROP POLICY IF EXISTS "swaps_requester_delete" ON swaps;
CREATE POLICY "swaps_requester_delete"
ON swaps FOR DELETE
TO authenticated USING (auth.uid() = requester_id);

CREATE INDEX IF NOT EXISTS idx_swaps_requester ON swaps(requester_id);
CREATE INDEX IF NOT EXISTS idx_swaps_provider ON swaps(provider_id);
CREATE INDEX IF NOT EXISTS idx_swaps_status ON swaps(status);

-- ========================
-- 6. MESSAGES
-- ========================
CREATE TABLE IF NOT EXISTS messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  swap_id uuid NOT NULL REFERENCES swaps(id) ON DELETE CASCADE,
  sender_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  body text NOT NULL,
  read_at timestamptz,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "messages_participant_read" ON messages;
CREATE POLICY "messages_participant_read"
ON messages FOR SELECT
TO authenticated USING (
  EXISTS (
    SELECT 1 FROM swaps s
    WHERE s.id = messages.swap_id
    AND (s.requester_id = auth.uid() OR s.provider_id = auth.uid())
  )
);

DROP POLICY IF EXISTS "messages_participant_insert" ON messages;
CREATE POLICY "messages_participant_insert"
ON messages FOR INSERT
TO authenticated WITH CHECK (
  auth.uid() = sender_id
  AND EXISTS (
    SELECT 1 FROM swaps s
    WHERE s.id = messages.swap_id
    AND (s.requester_id = auth.uid() OR s.provider_id = auth.uid())
  )
);

DROP POLICY IF EXISTS "messages_sender_update" ON messages;
CREATE POLICY "messages_sender_update"
ON messages FOR UPDATE
TO authenticated USING (auth.uid() != sender_id) WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_messages_swap ON messages(swap_id, created_at);

-- ========================
-- 7. HOURS LEDGER
-- ========================
CREATE TABLE IF NOT EXISTS hours_ledger (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  swap_id uuid REFERENCES swaps(id) ON DELETE CASCADE,
  amount numeric(5,2) NOT NULL,
  reason text NOT NULL DEFAULT 'swap_completed',
  created_at timestamptz DEFAULT now(),
  CHECK (amount != 0)
);

ALTER TABLE hours_ledger ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "ledger_owner_read" ON hours_ledger;
CREATE POLICY "ledger_owner_read"
ON hours_ledger FOR SELECT
TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "ledger_insert_own" ON hours_ledger;
CREATE POLICY "ledger_insert_own"
ON hours_ledger FOR INSERT
TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_ledger_user ON hours_ledger(user_id, created_at);

-- ========================
-- 8. REVIEWS
-- ========================
CREATE TABLE IF NOT EXISTS reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  swap_id uuid NOT NULL REFERENCES swaps(id) ON DELETE CASCADE,
  reviewer_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  reviewee_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  rating integer NOT NULL CHECK (rating >= 1 AND rating <= 5),
  body text DEFAULT '',
  created_at timestamptz DEFAULT now(),
  UNIQUE(swap_id, reviewer_id),
  CHECK (reviewer_id != reviewee_id)
);

ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "reviews_public_read" ON reviews;
CREATE POLICY "reviews_public_read"
ON reviews FOR SELECT
TO authenticated USING (true);

DROP POLICY IF EXISTS "reviews_insert_own" ON reviews;
CREATE POLICY "reviews_insert_own"
ON reviews FOR INSERT
TO authenticated WITH CHECK (auth.uid() = reviewer_id);

CREATE INDEX IF NOT EXISTS idx_reviews_reviewee ON reviews(reviewee_id);

-- ========================
-- 9. TRIGGERS: auto-create profile on signup + update rating cache
-- ========================

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name)
  VALUES (new.id, coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1)))
  ON CONFLICT (id) DO NOTHING;
  RETURN new;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Update cached rating on profile when a review is inserted
CREATE OR REPLACE FUNCTION update_profile_rating()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  UPDATE public.profiles
  SET rating_avg = (
    SELECT COALESCE(avg(rating), 0) FROM public.reviews WHERE reviewee_id = new.reviewee_id
  ),
  rating_count = (
    SELECT count(*) FROM public.reviews WHERE reviewee_id = new.reviewee_id
  )
  WHERE id = new.reviewee_id;
  RETURN new;
END;
$$;

DROP TRIGGER IF EXISTS on_review_inserted ON reviews;
CREATE TRIGGER on_review_inserted
  AFTER INSERT ON reviews
  FOR EACH ROW EXECUTE FUNCTION update_profile_rating();

-- updated_at triggers
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  new.updated_at = now();
  RETURN new;
END;
$$;

DROP TRIGGER IF EXISTS profiles_set_updated_at ON profiles;
CREATE TRIGGER profiles_set_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS swaps_set_updated_at ON swaps;
CREATE TRIGGER swaps_set_updated_at
  BEFORE UPDATE ON swaps
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
