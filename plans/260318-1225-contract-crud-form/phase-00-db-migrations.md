# Phase 00: DB Migrations
Status: ✅ Complete
Dependencies: None

## Objective
Bổ sung columns + tables + RPC mà V2 đang thiếu so với V1.

## Migrations

### Migration 1: `add_customer_couple_fields` ✅
```sql
ALTER TABLE customers
  ADD COLUMN IF NOT EXISTS bride_name varchar,
  ADD COLUMN IF NOT EXISTS groom_name varchar;

COMMENT ON COLUMN customers.bride_name IS 'Tên cô dâu (wedding contracts)';
COMMENT ON COLUMN customers.groom_name IS 'Tên chú rể (wedding contracts)';
```

### Migration 2: `add_contract_cancel_fields` ✅
```sql
ALTER TABLE contracts
  ADD COLUMN IF NOT EXISTS cancel_reason text,
  ADD COLUMN IF NOT EXISTS cancelled_at timestamptz,
  ADD COLUMN IF NOT EXISTS cancelled_by uuid REFERENCES employees(id);

COMMENT ON COLUMN contracts.cancel_reason IS 'Lý do hủy hợp đồng';
COMMENT ON COLUMN contracts.cancelled_at IS 'Thời điểm hủy';
COMMENT ON COLUMN contracts.cancelled_by IS 'Người hủy';
```

### Migration 3: `create_addon_history` ✅
```sql
CREATE TABLE IF NOT EXISTS addon_history (
  id uuid PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
  addon_name varchar NOT NULL,
  addon_category addon_category_enum,
  last_price numeric DEFAULT 0,
  usage_count integer DEFAULT 1,
  last_used_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE addon_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY "addon_history_all" ON addon_history FOR ALL USING (true);

CREATE UNIQUE INDEX IF NOT EXISTS idx_addon_history_name_category
  ON addon_history(addon_name, addon_category);

COMMENT ON TABLE addon_history IS 'Lịch sử addon đã dùng — autocomplete + gợi ý giá';
```

### Migration 4: `create_submit_contract_rpc` ⏳ Phase 02
```sql
-- Atomic RPC: tạo/update contract + items + payment trong 1 transaction
-- Tham khảo V1 submit_contract_v4()
-- Chi tiết SQL sẽ viết khi code Phase 02 (cần biết đúng params)
-- Placeholder — implement cùng Phase 02
```

### Migration 5: `create_cancel_contract_rpc` ⏳ Phase 02
```sql
-- Atomic RPC: cascade cancel contract + tasks + prints + plans
-- Tham khảo V1 cancel_contract_atomic()
-- Placeholder — implement cùng Phase 02
```

## Test Criteria
- [x] `customers` table có `bride_name`, `groom_name` ✅ Verified
- [x] `contracts` table có `cancel_reason`, `cancelled_at`, `cancelled_by` ✅ Verified
- [x] `addon_history` table tồn tại với RLS ✅ Verified
- [x] RPC placeholder documented (sẽ implement Phase 02)

## Files to Create/Modify
- Supabase migrations (via MCP tool)

---
Next Phase: → phase-01-types-schemas.md
