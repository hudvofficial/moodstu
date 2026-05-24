-- =====================================================
-- Printing Workflow Phase 1: Core Infrastructure (FIXED)
-- =====================================================
-- Features:
-- - Enhanced printing_orders with payment/inventory tracking
-- - order_payments table for linking orders to payments
-- - inventory_reservations table for soft-locking stock
-- - Views for payment summary and available stock
-- =====================================================

-- ─── 1. ENHANCE printing_orders table ────────────────

ALTER TABLE printing_orders
  ADD COLUMN IF NOT EXISTS deposit_amount DECIMAL(12,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS final_amount DECIMAL(12,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS total_amount DECIMAL(12,2),
  ADD COLUMN IF NOT EXISTS paid_amount DECIMAL(12,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS payment_status TEXT DEFAULT 'unpaid'
    CHECK (payment_status IN ('unpaid', 'partial', 'paid')),
  ADD COLUMN IF NOT EXISTS inventory_status TEXT DEFAULT 'none'
    CHECK (inventory_status IN ('none', 'reserved', 'stocked_out', 'cancelled')),
  ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS cancellation_reason TEXT,
  ADD COLUMN IF NOT EXISTS delivered_at TIMESTAMPTZ;

-- Add computed column for remaining amount
ALTER TABLE printing_orders
  ADD COLUMN IF NOT EXISTS remaining_amount DECIMAL(12,2)
  GENERATED ALWAYS AS (COALESCE(total_amount, 0) - COALESCE(paid_amount, 0)) STORED;

-- Update existing orders: set total_amount if null
UPDATE printing_orders
SET total_amount = COALESCE(deposit_amount, 0) + COALESCE(final_amount, 0)
WHERE total_amount IS NULL;

-- Add comment
COMMENT ON COLUMN printing_orders.payment_status IS 'Payment status: unpaid (chưa trả), partial (trả 1 phần), paid (đã thanh toán đủ)';
COMMENT ON COLUMN printing_orders.inventory_status IS 'Inventory status: none (chưa xử lý), reserved (đã đặt trước), stocked_out (đã xuất kho), cancelled (đã hủy)';

-- ─── 2. CREATE order_payments table ──────────────────

CREATE TABLE IF NOT EXISTS order_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES printing_orders(id) ON DELETE CASCADE,
  payment_id UUID REFERENCES payments(id) ON DELETE SET NULL,
  receipt_id UUID REFERENCES receipts(id) ON DELETE SET NULL,
  payment_type TEXT NOT NULL CHECK (payment_type IN ('deposit', 'final', 'refund', 'adjustment')),
  amount DECIMAL(12,2) NOT NULL CHECK (amount != 0),
  payment_date DATE NOT NULL,
  payment_method TEXT NOT NULL CHECK (payment_method IN ('cash', 'transfer', 'card', 'other')),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  created_by UUID REFERENCES auth.users(id),
  updated_at TIMESTAMPTZ DEFAULT now(),
  updated_by UUID REFERENCES auth.users(id)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_order_payments_order ON order_payments(order_id);
CREATE INDEX IF NOT EXISTS idx_order_payments_payment ON order_payments(payment_id);
CREATE INDEX IF NOT EXISTS idx_order_payments_receipt ON order_payments(receipt_id);
CREATE INDEX IF NOT EXISTS idx_order_payments_date ON order_payments(payment_date DESC);
CREATE INDEX IF NOT EXISTS idx_order_payments_type ON order_payments(payment_type);

-- RLS policies (SIMPLIFIED - no user_studio_memberships dependency)
ALTER TABLE order_payments ENABLE ROW LEVEL SECURITY;

-- Allow all authenticated users for now (can be tightened later)
DROP POLICY IF EXISTS "Allow authenticated users to manage order_payments" ON order_payments;
DROP POLICY IF EXISTS "Enable read access for authenticated users on order_payments" ON order_payments;
DROP POLICY IF EXISTS "Enable insert access for authenticated users on order_payments" ON order_payments;
CREATE POLICY "Allow authenticated users to manage order_payments"
  ON order_payments FOR ALL
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

COMMENT ON TABLE order_payments IS 'Links printing orders to payments/receipts (deposit, final, refund)';
COMMENT ON COLUMN order_payments.payment_type IS 'Type: deposit (đặt cọc), final (tất toán), refund (hoàn tiền), adjustment (điều chỉnh)';

-- ─── 3. CREATE inventory_reservations table ──────────

CREATE TABLE IF NOT EXISTS inventory_reservations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id UUID NOT NULL REFERENCES inventory_items(id) ON DELETE CASCADE,
  order_id UUID NOT NULL REFERENCES printing_orders(id) ON DELETE CASCADE,
  reserved_quantity DECIMAL(10,2) NOT NULL CHECK (reserved_quantity > 0),
  reserved_at TIMESTAMPTZ DEFAULT now(),
  expires_at TIMESTAMPTZ,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'fulfilled', 'cancelled', 'expired')),
  notes TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_inventory_reservations_item ON inventory_reservations(item_id);
CREATE INDEX IF NOT EXISTS idx_inventory_reservations_order ON inventory_reservations(order_id);
CREATE INDEX IF NOT EXISTS idx_inventory_reservations_status ON inventory_reservations(status) WHERE status = 'active';
CREATE INDEX IF NOT EXISTS idx_inventory_reservations_expires ON inventory_reservations(expires_at) WHERE expires_at IS NOT NULL AND status = 'active';

-- RLS policies (SIMPLIFIED)
ALTER TABLE inventory_reservations ENABLE ROW LEVEL SECURITY;

-- Allow all authenticated users for now
CREATE POLICY "Allow authenticated users to manage inventory_reservations"
  ON inventory_reservations FOR ALL
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

COMMENT ON TABLE inventory_reservations IS 'Soft-lock inventory for printing orders before actual stock out';
COMMENT ON COLUMN inventory_reservations.status IS 'Status: active (đang đặt), fulfilled (đã xuất), cancelled (đã hủy), expired (hết hạn)';

-- ─── 4. ENHANCE inventory_transactions table ─────────

ALTER TABLE inventory_transactions
  ADD COLUMN IF NOT EXISTS reservation_id UUID REFERENCES inventory_reservations(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS is_rollback BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS rolled_back_txn_id UUID REFERENCES inventory_transactions(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_inventory_transactions_reservation ON inventory_transactions(reservation_id);
CREATE INDEX IF NOT EXISTS idx_inventory_transactions_rollback ON inventory_transactions(is_rollback) WHERE is_rollback = true;

COMMENT ON COLUMN inventory_transactions.reservation_id IS 'Link to reservation if this transaction fulfills a reservation';
COMMENT ON COLUMN inventory_transactions.is_rollback IS 'True if this transaction reverses a previous transaction (e.g., cancel order)';
COMMENT ON COLUMN inventory_transactions.rolled_back_txn_id IS 'Original transaction being rolled back';

-- ─── 5. CREATE VIEW: order_payment_summary ───────────

CREATE OR REPLACE VIEW order_payment_summary AS
SELECT
  o.id as order_id,
  o.total_amount,
  COALESCE(SUM(CASE WHEN op.payment_type = 'deposit' THEN op.amount ELSE 0 END), 0) as deposit_paid,
  COALESCE(SUM(CASE WHEN op.payment_type = 'final' THEN op.amount ELSE 0 END), 0) as final_paid,
  COALESCE(SUM(CASE WHEN op.payment_type = 'refund' THEN op.amount ELSE 0 END), 0) as refund_amount,
  COALESCE(SUM(CASE WHEN op.payment_type = 'adjustment' THEN op.amount ELSE 0 END), 0) as adjustment_amount,
  COALESCE(SUM(
    CASE
      WHEN op.payment_type IN ('deposit', 'final') THEN op.amount
      WHEN op.payment_type = 'refund' THEN op.amount
      WHEN op.payment_type = 'adjustment' THEN op.amount
      ELSE 0
    END
  ), 0) as total_paid,
  COALESCE(o.total_amount, 0) - COALESCE(SUM(
    CASE
      WHEN op.payment_type IN ('deposit', 'final') THEN op.amount
      WHEN op.payment_type = 'refund' THEN op.amount
      WHEN op.payment_type = 'adjustment' THEN op.amount
      ELSE 0
    END
  ), 0) as remaining
FROM printing_orders o
LEFT JOIN order_payments op ON o.id = op.order_id
GROUP BY o.id, o.total_amount;

COMMENT ON VIEW order_payment_summary IS 'Aggregated payment summary per printing order';

-- ─── 6. CREATE VIEW: inventory_available_stock ────────

CREATE OR REPLACE VIEW inventory_available_stock AS
SELECT
  i.id,
  i.item_code,
  i.name,
  i.current_stock,
  i.unit,
  COALESCE(SUM(CASE WHEN r.status = 'active' THEN r.reserved_quantity ELSE 0 END), 0) as reserved_quantity,
  i.current_stock - COALESCE(SUM(CASE WHEN r.status = 'active' THEN r.reserved_quantity ELSE 0 END), 0) as available_stock,
  i.min_stock,
  CASE
    WHEN i.current_stock - COALESCE(SUM(CASE WHEN r.status = 'active' THEN r.reserved_quantity ELSE 0 END), 0) <= 0 THEN 'out_of_stock'
    WHEN i.min_stock IS NOT NULL AND i.current_stock - COALESCE(SUM(CASE WHEN r.status = 'active' THEN r.reserved_quantity ELSE 0 END), 0) < i.min_stock THEN 'low_stock'
    ELSE 'in_stock'
  END as stock_status
FROM inventory_items i
LEFT JOIN inventory_reservations r ON i.id = r.item_id AND r.status = 'active'
WHERE i.deleted_at IS NULL
GROUP BY i.id, i.item_code, i.name, i.current_stock, i.unit, i.min_stock;

COMMENT ON VIEW inventory_available_stock IS 'Real-time available stock = current_stock - reserved_quantity';

-- ─── 7. HELPER FUNCTION: Auto-expire reservations ────

CREATE OR REPLACE FUNCTION expire_old_reservations()
RETURNS INTEGER AS $$
DECLARE
  expired_count INTEGER;
BEGIN
  UPDATE inventory_reservations
  SET status = 'expired',
      updated_at = now()
  WHERE status = 'active'
    AND expires_at IS NOT NULL
    AND expires_at < now();

  GET DIAGNOSTICS expired_count = ROW_COUNT;
  RETURN expired_count;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION expire_old_reservations IS 'Marks active reservations as expired if past expires_at. Run periodically via cron.';

-- ─── 8. GRANT permissions ─────────────────────────────

GRANT SELECT ON order_payment_summary TO authenticated;
GRANT SELECT ON inventory_available_stock TO authenticated;

-- =====================================================
-- Migration complete - RLS policies simplified
-- Next: Update TypeScript types and create actions
-- =====================================================
