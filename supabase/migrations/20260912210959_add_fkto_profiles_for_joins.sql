-- Add foreign keys from swaps and user_skills to profiles
-- so PostgREST can resolve join queries (e.g. swaps → profiles).
-- profiles.id already references auth.users(id), and these columns
-- already reference auth.users(id); the additional FK to profiles
-- is valid because profiles.id == auth.users.id.

-- swaps → profiles (requester)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'swaps_requester_id_profiles_fkey'
  ) THEN
    ALTER TABLE swaps
      ADD CONSTRAINT swaps_requester_id_profiles_fkey
      FOREIGN KEY (requester_id) REFERENCES profiles(id) ON DELETE CASCADE;
  END IF;
END $$;

-- swaps → profiles (provider)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'swaps_provider_id_profiles_fkey'
  ) THEN
    ALTER TABLE swaps
      ADD CONSTRAINT swaps_provider_id_profiles_fkey
      FOREIGN KEY (provider_id) REFERENCES profiles(id) ON DELETE CASCADE;
  END IF;
END $$;

-- user_skills → profiles
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'user_skills_user_id_profiles_fkey'
  ) THEN
    ALTER TABLE user_skills
      ADD CONSTRAINT user_skills_user_id_profiles_fkey
      FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE;
  END IF;
END $$;

-- reviews → profiles (reviewer, reviewee)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'reviews_reviewer_id_profiles_fkey'
  ) THEN
    ALTER TABLE reviews
      ADD CONSTRAINT reviews_reviewer_id_profiles_fkey
      FOREIGN KEY (reviewer_id) REFERENCES profiles(id) ON DELETE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'reviews_reviewee_id_profiles_fkey'
  ) THEN
    ALTER TABLE reviews
      ADD CONSTRAINT reviews_reviewee_id_profiles_fkey
      FOREIGN KEY (reviewee_id) REFERENCES profiles(id) ON DELETE CASCADE;
  END IF;
END $$;

-- availability → profiles
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'availability_user_id_profiles_fkey'
  ) THEN
    ALTER TABLE availability
      ADD CONSTRAINT availability_user_id_profiles_fkey
      FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE;
  END IF;
END $$;

-- hours_ledger → profiles
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'hours_ledger_user_id_profiles_fkey'
  ) THEN
    ALTER TABLE hours_ledger
      ADD CONSTRAINT hours_ledger_user_id_profiles_fkey
      FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE;
  END IF;
END $$;

-- messages → profiles (sender)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'messages_sender_id_profiles_fkey'
  ) THEN
    ALTER TABLE messages
      ADD CONSTRAINT messages_sender_id_profiles_fkey
      FOREIGN KEY (sender_id) REFERENCES profiles(id) ON DELETE CASCADE;
  END IF;
END $$;