# Printing Workflow - Database Schema Design

## 1. Enhanced printing_orders table

```sql
ALTER TABLE printing_orders ADD COLUMN IF NOT EXISTS:
  - deposit_amount DECIMAL(12,2) DEFAULT 0
  - final_amount DECIMAL(12,2) DEFAULT 0
  - total_amount DECIMAL(12,2) NOT NULL
  - paid_amount DECIMAL(12,2) DEFAULT 0
  - remaining_amount DECIMAL(12,2) GENERATED AS (total_amount - paid_amount)
  - payment_status TEXT CHECK (payment_status IN ('unpaid', 'partial', 'paid'))
  - inventory_status TEXT CHECK (inventory_status IN ('none', 'reserved', 'stocked_out', 'cancelled'))
  - cancelled_at TIMESTAMPTZ
  - cancellation_reason TEXT
```

## 2. NEW: order_payments (Link đơn in với payments)

```sql
CREATE TABLE order_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES printing_orders(id) ON DELETE CASCADE,
  payment_id UUID REFERENCES payments(id) ON DELETE SET NULL,
  receipt_id UUID REFERENCES receipts(id) ON DELETE SET NULL,
  payment_type TEXT NOT NULL CHECK (payment_type IN ('deposit', 'final', 'refund', 'adjustment')),
  amount DECIMAL(12,2) NOT NULL,
  payment_date DATE NOT NULL,
  payment_method TEXT NOT NULL,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  created_by UUID REFERENCES auth.users(id)
);

CREATE INDEX idx_order_payments_order ON order_payments(order_id);
CREATE INDEX idx_order_payments_payment ON order_payments(payment_id);
```

## 3. NEW: inventory_reservations (Đặt trước vật tư)

```sql
CREATE TABLE inventory_reservations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id UUID NOT NULL REFERENCES inventory_items(id),
  order_id UUID NOT NULL REFERENCES printing_orders(id) ON DELETE CASCADE,
  reserved_quantity DECIMAL(10,2) NOT NULL CHECK (reserved_quantity > 0),
  reserved_at TIMESTAMPTZ DEFAULT now(),
  expires_at TIMESTAMPTZ, -- Optional auto-release
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'fulfilled', 'cancelled')),
  notes TEXT,
  created_by UUID REFERENCES auth.users(id)
);

CREATE INDEX idx_inventory_reservations_item ON inventory_reservations(item_id);
CREATE INDEX idx_inventory_reservations_order ON inventory_reservations(order_id);
CREATE INDEX idx_inventory_reservations_status ON inventory_reservations(status);
```

## 4. Enhanced inventory_transactions

```sql
ALTER TABLE inventory_transactions ADD COLUMN IF NOT EXISTS:
  - reservation_id UUID REFERENCES inventory_reservations(id),
  - is_rollback BOOLEAN DEFAULT false,
  - rolled_back_txn_id UUID REFERENCES inventory_transactions(id)
```

## 5. View: order_payment_summary

```sql
CREATE OR REPLACE VIEW order_payment_summary AS
SELECT 
  o.id as order_id,
  o.total_amount,
  COALESCE(SUM(CASE WHEN op.payment_type = 'deposit' THEN op.amount ELSE 0 END), 0) as deposit_paid,
  COALESCE(SUM(CASE WHEN op.payment_type = 'final' THEN op.amount ELSE 0 END), 0) as final_paid,
  COALESCE(SUM(CASE WHEN op.payment_type = 'refund' THEN -op.amount ELSE 0 END), 0) as refund_amount,
  COALESCE(SUM(CASE WHEN op.payment_type IN ('deposit', 'final') THEN op.amount 
                    WHEN op.payment_type = 'refund' THEN -op.amount 
                    ELSE 0 END), 0) as total_paid,
  o.total_amount - COALESCE(SUM(CASE WHEN op.payment_type IN ('deposit', 'final') THEN op.amount 
                                      WHEN op.payment_type = 'refund' THEN -op.amount 
                                      ELSE 0 END), 0) as remaining
FROM printing_orders o
LEFT JOIN order_payments op ON o.id = op.order_id
GROUP BY o.id, o.total_amount;
```

## 6. View: inventory_available_stock

```sql
CREATE OR REPLACE VIEW inventory_available_stock AS
SELECT 
  i.id,
  i.item_code,
  i.name,
  i.current_stock,
  COALESCE(SUM(CASE WHEN r.status = 'active' THEN r.reserved_quantity ELSE 0 END), 0) as reserved_quantity,
  i.current_stock - COALESCE(SUM(CASE WHEN r.status = 'active' THEN r.reserved_quantity ELSE 0 END), 0) as available_stock
FROM inventory_items i
LEFT JOIN inventory_reservations r ON i.id = r.item_id
WHERE i.deleted_at IS NULL
GROUP BY i.id, i.item_code, i.name, i.current_stock;
```
