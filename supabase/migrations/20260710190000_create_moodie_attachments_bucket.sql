-- Private attachment storage for Moodie turns.
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'moodie-attachments',
  'moodie-attachments',
  false,
  10485760,
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'application/pdf', 'text/plain']
)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS "Moodie attachments read own" ON storage.objects;
CREATE POLICY "Moodie attachments read own"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'moodie-attachments'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

DROP POLICY IF EXISTS "Moodie attachments insert own" ON storage.objects;
CREATE POLICY "Moodie attachments insert own"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'moodie-attachments'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

DROP POLICY IF EXISTS "Moodie attachments delete own" ON storage.objects;
CREATE POLICY "Moodie attachments delete own"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'moodie-attachments'
  AND (storage.foldername(name))[1] = auth.uid()::text
);
