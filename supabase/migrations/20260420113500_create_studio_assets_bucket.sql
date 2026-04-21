INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'studio-assets',
    'studio-assets',
    TRUE,
    2097152,
    ARRAY['image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO UPDATE
SET
    public = EXCLUDED.public,
    file_size_limit = EXCLUDED.file_size_limit,
    allowed_mime_types = EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS "Public read studio assets" ON storage.objects;
CREATE POLICY "Public read studio assets" ON storage.objects
    FOR SELECT
    USING (bucket_id = 'studio-assets');

DROP POLICY IF EXISTS "Managers manage studio assets" ON storage.objects;
CREATE POLICY "Managers manage studio assets" ON storage.objects
    FOR ALL
    USING (
        bucket_id = 'studio-assets'
        AND EXISTS (
            SELECT 1
            FROM public.employees
            WHERE employees.auth_user_id = auth.uid()
              AND LOWER(COALESCE(employees.role::text, '')) IN ('admin', 'manager')
        )
    )
    WITH CHECK (
        bucket_id = 'studio-assets'
        AND EXISTS (
            SELECT 1
            FROM public.employees
            WHERE employees.auth_user_id = auth.uid()
              AND LOWER(COALESCE(employees.role::text, '')) IN ('admin', 'manager')
        )
    );
