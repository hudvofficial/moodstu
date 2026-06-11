-- ═══════════════════════════════════════════════════════════════════
-- Migration: Printing Orders Phase 3 - Issue State + Status History
-- ═══════════════════════════════════════════════════════════════════

-- 1. Add issue tracking columns to printing_orders
ALTER TABLE printing_orders
  ADD COLUMN IF NOT EXISTS issue_reason text,
  ADD COLUMN IF NOT EXISTS issue_reported_at timestamptz,
  ADD COLUMN IF NOT EXISTS issue_reported_by uuid REFERENCES auth.users(id);

-- 2. Create status history table for velocity analytics & audit trail
CREATE TABLE IF NOT EXISTS printing_order_status_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES printing_orders(id) ON DELETE CASCADE,
  from_status text NOT NULL,
  to_status text NOT NULL,
  changed_by uuid REFERENCES auth.users(id),
  changed_at timestamptz NOT NULL DEFAULT now(),
  reason text,
  source text NOT NULL DEFAULT 'manual'  -- 'manual' | 'bulk' | 'payment_trigger' | 'barcode_scan'
);

-- Index for fast lookups by order
CREATE INDEX IF NOT EXISTS idx_posh_order_id ON printing_order_status_history(order_id);
CREATE INDEX IF NOT EXISTS idx_posh_changed_at ON printing_order_status_history(changed_at);

-- 3. RLS: same role-based policy as printing_orders
ALTER TABLE printing_order_status_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "printing_order_status_history_select"
  ON printing_order_status_history
  FOR SELECT
  USING (
    get_current_employee_role() = ANY (ARRAY['admin'::employee_role_enum, 'manager'::employee_role_enum])
  );

CREATE POLICY "printing_order_status_history_insert"
  ON printing_order_status_history
  FOR INSERT
  WITH CHECK (
    get_current_employee_role() = ANY (ARRAY['admin'::employee_role_enum, 'manager'::employee_role_enum, 'sale'::employee_role_enum])
  );

-- 4. Grant access to authenticated users (RLS handles row filtering)
GRANT SELECT, INSERT ON printing_order_status_history TO authenticated;
