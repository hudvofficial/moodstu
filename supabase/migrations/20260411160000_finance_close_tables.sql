-- ═══════════════════════════════════════════
-- Finance Close Management Tables
-- v2: Admin-only — no authenticated read policies
-- All reads via withAdmin → service_role client
-- ═══════════════════════════════════════════

-- 1. Monthly Closes
CREATE TABLE IF NOT EXISTS public.finance_monthly_closes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  period TEXT NOT NULL,                     -- Format: 'YYYY-MM'
  status TEXT NOT NULL DEFAULT 'draft',      -- draft | in_progress | pending_review | locked
  snapshot_metrics JSONB DEFAULT '{}',
  locked_by UUID REFERENCES auth.users(id),
  locked_at TIMESTAMPTZ,
  notes TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT unique_close_period UNIQUE(period)
);

-- 2. Close Tasks (8-step workflow)
CREATE TABLE IF NOT EXISTS public.finance_close_tasks (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  close_id UUID NOT NULL REFERENCES public.finance_monthly_closes(id) ON DELETE CASCADE,
  step_number INT NOT NULL CHECK (step_number BETWEEN 1 AND 8),
  step_name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'chua_bat_dau',
  assignee_id UUID REFERENCES auth.users(id),
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT unique_close_step UNIQUE(close_id, step_number)
);

-- 3. RLS — Admin-only via service_role (all finance reads/writes through withAdmin)
ALTER TABLE public.finance_monthly_closes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "service_role_closes"
  ON public.finance_monthly_closes FOR ALL
  TO service_role
  USING (true) WITH CHECK (true);

-- NO authenticated read policy: Finance is admin-only module

ALTER TABLE public.finance_close_tasks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "service_role_close_tasks"
  ON public.finance_close_tasks FOR ALL
  TO service_role
  USING (true) WITH CHECK (true);

-- NO authenticated read policy: Finance is admin-only module
