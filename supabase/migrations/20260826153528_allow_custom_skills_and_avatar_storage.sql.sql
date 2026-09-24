/*
# Allow custom skill creation and avatar storage

## Overview
1. Allows authenticated users to insert new skills into skills_catalog so they
   can type their own custom skills (e.g. "Pottery", "Kubernetes") that aren't
   in the pre-seeded catalog. Existing catalog skills remain; the new policy
   only adds INSERT for authenticated users.
2. Creates a Supabase Storage bucket "avatars" for user profile photos. Each
   user can upload/read/delete only their own avatar file under a path scoped
   to their user id. The bucket is public-read so avatars display in the app
   without signed URLs.

## Security changes
- skills_catalog: adds INSERT policy for authenticated users (they can create
  new skills). SELECT remains public. No UPDATE/DELETE — catalog entries are
  immutable once created.
- Storage bucket "avatars": public read, owner-only insert/update/delete scoped
  to the user's folder path (`{user_id}/`).
*/



-- ========================
-- 1. Allow authenticated users to insert custom skills
-- ========================

DROP POLICY IF EXISTS "skills_catalog_insert_auth" ON skills_catalog;
CREATE POLICY "skills_catalog_insert_auth"
ON skills_catalog FOR INSERT
TO authenticated WITH CHECK (true);




-- ========================
-- 2. Avatar storage bucket
-- ========================

INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;




-- Storage policies: owner-only write, public read
DROP POLICY IF EXISTS "avatars_public_read" ON storage.objects;
CREATE POLICY "avatars_public_read"
ON storage.objects FOR SELECT
TO anon, authenticated
USING (bucket_id = 'avatars');

DROP POLICY IF EXISTS "avatars_owner_insert" ON storage.objects;
CREATE POLICY "avatars_owner_insert"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'avatars'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

DROP POLICY IF EXISTS "avatars_owner_update" ON storage.objects;
CREATE POLICY "avatars_owner_update"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'avatars'
  AND (storage.foldername(name))[1] = auth.uid()::text
)
WITH CHECK (
  bucket_id = 'avatars'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

DROP POLICY IF EXISTS "avatars_owner_delete" ON storage.objects;
CREATE POLICY "avatars_owner_delete"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'avatars'
  AND (storage.foldername(name))[1] = auth.uid()::text
);
