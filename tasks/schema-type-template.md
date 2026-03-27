# 🗄️ Schema Type Template — ABC Rule

> Dùng template này khi thêm column status/type/category vào DB.
> Đọc kèm `audit_report.md` (ABC Framework v2.0) cho context đầy đủ.

---

## Group B — VARCHAR + TS enum (DEFAULT — 80% cases)

### DB Migration

```sql
-- Column dùng VARCHAR, KHÔNG dùng CREATE TYPE ... ENUM
ALTER TABLE [table_name]
  ADD COLUMN [column_name] VARCHAR(30) NOT NULL DEFAULT '[default_value]';
```

### TS Const Array (`types/[module]-constants.ts`)

```typescript
// ─── [COLUMN] values (Group B: VARCHAR + TS enum) ─────
export const [COLUMN]_VALUES = [
  "value_1",
  "value_2",
  "value_3",
] as const;

export type [ColumnType] = (typeof [COLUMN]_VALUES)[number];

// ─── Display map (SSOT: DB key → Vietnamese label) ────
export const [COLUMN]_MAP: Record<[ColumnType], { label: string; variant: string }> = {
  value_1: { label: "Label 1", variant: "success" },
  value_2: { label: "Label 2", variant: "info" },
  value_3: { label: "Label 3", variant: "neutral" },
};
```

### Zod Schema (`lib/validations/[module].schema.ts`)

```typescript
import { z } from "zod";
import { [COLUMN]_VALUES } from "@/types/[module]-constants";

export const [module]CreateSchema = z.object({
  [column_name]: z.enum([COLUMN]_VALUES),  // ← validates at API boundary
});
```

### Thêm value mới (ưu điểm Group B)

```typescript
// Chỉ cần thêm 1 dòng → rebuild. KHÔNG cần DB migration.
export const [COLUMN]_VALUES = [
  "value_1",
  "value_2",
  "value_3",
  "value_4",  // ← thêm dòng này, xong
] as const;
```

---

## Group A — DB ENUM (chỉ khi system-level, ≤5 values)

```sql
-- CHỈ dùng khi: RBAC, payment method, gender, binary choice
CREATE TYPE [type_name]_enum AS ENUM ('val_1', 'val_2', 'val_3');
ALTER TABLE [table] ADD COLUMN [col] [type_name]_enum DEFAULT 'val_1';
```

---

## Group C — Lookup Table (user-managed, ≥10 values)

```sql
CREATE TABLE [domain]_types (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  code VARCHAR(30) UNIQUE NOT NULL,
  label VARCHAR(100) NOT NULL,
  description TEXT,
  icon VARCHAR(50),
  sort_order INT DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- FK from main table
ALTER TABLE [main_table]
  ADD COLUMN [domain]_type_code VARCHAR(30)
  REFERENCES [domain]_types(code);
```
