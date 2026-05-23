-- Create vendors table
CREATE TABLE IF NOT EXISTS public.vendors (
    id UUID DEFAULT extensions.uuid_generate_v4() PRIMARY KEY,
    full_name TEXT NOT NULL,
    phone TEXT,
    service_type TEXT,
    status TEXT DEFAULT 'active',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    deleted_at TIMESTAMP WITH TIME ZONE
);

-- RLS policies for vendors
ALTER TABLE public.vendors ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Enable read access for authenticated users on vendors"
ON public.vendors FOR SELECT TO authenticated USING (true);

CREATE POLICY "Enable insert access for authenticated users on vendors"
ON public.vendors FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Enable update access for authenticated users on vendors"
ON public.vendors FOR UPDATE TO authenticated USING (true);

-- Add vendor_id to work_tasks
ALTER TABLE public.work_tasks
ADD COLUMN IF NOT EXISTS vendor_id UUID REFERENCES public.vendors(id);

-- Constraint to ensure mutual exclusivity: a task can have an employee OR a vendor, but not both
ALTER TABLE public.work_tasks
DROP CONSTRAINT IF EXISTS check_assignment_mutually_exclusive;

ALTER TABLE public.work_tasks
ADD CONSTRAINT check_assignment_mutually_exclusive
CHECK (
    (assigned_to IS NULL AND vendor_id IS NULL) OR
    (assigned_to IS NOT NULL AND vendor_id IS NULL) OR
    (assigned_to IS NULL AND vendor_id IS NOT NULL)
);

-- Create index for faster joins
CREATE INDEX IF NOT EXISTS idx_work_tasks_vendor_id ON public.work_tasks(vendor_id);
