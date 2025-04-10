-- Storage policies for the avatars bucket
BEGIN;

-- Policy for users to read any file in the avatars bucket
DROP POLICY IF EXISTS "Users can view all avatar files" ON storage.objects;
CREATE POLICY "Users can view all avatar files"
ON storage.objects FOR SELECT
USING (bucket_id = 'avatars');

-- Policy for users to upload their own profile photo
DROP POLICY IF EXISTS "Users can upload their own profile photo" ON storage.objects;
CREATE POLICY "Users can upload their own profile photo"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'avatars' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Policy for users to update their own profile photo
DROP POLICY IF EXISTS "Users can update their own profile photo" ON storage.objects;
CREATE POLICY "Users can update their own profile photo"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'avatars' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

-- Policy for users to delete their own profile photo
DROP POLICY IF EXISTS "Users can delete their own profile photo" ON storage.objects;
CREATE POLICY "Users can delete their own profile photo"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'avatars' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

COMMIT;
