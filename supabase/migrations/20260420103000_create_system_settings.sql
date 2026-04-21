CREATE TABLE IF NOT EXISTS public.system_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    key TEXT NOT NULL UNIQUE,
    value TEXT,
    description TEXT,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.system_settings IS
    'Admin-managed server settings for integrations and AI runtime.';

INSERT INTO public.system_settings (key, value, description)
VALUES
    ('moodie_gemini_api_key', NULL, 'Gemini API key for Moodie runtime'),
    ('moodie_gemini_model', 'auto', 'Gemini model for Moodie runtime')
ON CONFLICT (key) DO NOTHING;

ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Managers manage system_settings" ON public.system_settings;
CREATE POLICY "Managers manage system_settings" ON public.system_settings
    FOR ALL
    USING (
        EXISTS (
            SELECT 1
            FROM public.employees
            WHERE employees.auth_user_id = auth.uid()
              AND LOWER(COALESCE(employees.role::text, '')) IN ('admin', 'manager')
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1
            FROM public.employees
            WHERE employees.auth_user_id = auth.uid()
              AND LOWER(COALESCE(employees.role::text, '')) IN ('admin', 'manager')
        )
    );
