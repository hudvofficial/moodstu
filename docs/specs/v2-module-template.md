# V2 Module Template Spec

> **Gold Standard:** Contract module — audited & optimized 2026-03-24
> **Purpose:** Blueprint cho mọi V2 module (CRM, Orders, Inventory, Finance...)

---

## 1. Folder Structure

```
app/
├── actions/
│   ├── {module}-queries.ts       # READ-only server actions
│   ├── {module}-mutations.ts     # CREATE/UPDATE/DELETE actions
│   └── {module}-lifecycle.ts     # Status transitions, workflows (nếu có)
├── {module}/
│   ├── page.tsx                  # Server component (SSR data fetch)
│   └── [id]/
│       ├── page.tsx              # Detail page (SSR)
│       └── edit/page.tsx         # Edit page (nếu có)
│
components/
├── {module}/
│   ├── {module}-list-client.tsx  # List view (client component)
│   ├── {module}-drawer.tsx       # Quick preview drawer
│   ├── detail/                   # Detail sub-components
│   │   ├── {module}-detail-client.tsx
│   │   ├── detail-layout-sections.tsx  # Desktop + Mobile layouts
│   │   ├── summary-card.tsx
│   │   └── ...
│   ├── form/                     # Create/Edit form
│   │   ├── index.tsx             # Form orchestrator
│   │   ├── {Section}Section.tsx  # PascalCase form sections
│   │   ├── hooks/
│   │   │   ├── use{Module}Form.ts
│   │   │   └── use{Module}{Feature}.ts
│   │   └── modals/               # Form-specific modals
│   └── gallery/                  # Media sub-module (nếu có)
│
types/
├── {module}.ts                   # DB types + enums
├── {module}-constants.ts         # Labels, maps, helpers
└── {module}-form.ts              # Form-specific types
```

### Naming Convention

| Type | Convention | Ví dụ |
|------|-----------|-------|
| Files (components) | kebab-case | `contract-drawer.tsx` |
| Files (form sections) | PascalCase | `ContractCustomerSection.tsx` |
| Files (actions) | kebab-case | `contract-queries.ts` |
| Files (types) | kebab-case | `contract-form.ts` |
| Functions | camelCase: verb + Module + Detail | `getContractForEdit()` |
| Components | PascalCase | `ContractDrawer` |
| Hooks | camelCase: use + Module + Feature | `useContractForm()` |

---

## 2. Server Actions Pattern

### 2.1 Queries (READ)

```typescript
// {module}-queries.ts
"use server";

import { withAuth } from "@/lib/auth_utils";

export async function get{Module}ForEdit(id: string) {
  return withAuth(async (supabase) => {
    const { data, error } = await supabase
      .from("{table}")
      .select("*, related_table(*)")
      .eq("id", id)
      .is("deleted_at", null)
      .single();

    if (error || !data) throw new Error("Không tìm thấy");
    return data;
  });
}
```

### 2.2 Mutations (CREATE/UPDATE/DELETE)

```typescript
// {module}-mutations.ts
"use server";

import { withAuth } from "@/lib/auth_utils";
import { revalidatePath } from "next/cache";
import { fireAuditLog } from "@/lib/audit";
import { {module}Schema } from "@/lib/validations/{module}.schema";

export async function create{Module}(rawData: unknown) {
  // 1. Zod Validation (Bắt buộc)
  const parsed = {module}Schema.safeParse(rawData);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message };
  }
  const payload = parsed.data;

  return withAuth(async (supabase, userId) => {
    // 2. Race Prevention (nếu có auto-code) - Retry loop 3 lần
    
    // 3. Insert/Update
    const { data, error } = await supabase
      .from("{table}")
      .insert({ ...payload, created_by: userId })
      .select()
      .single();

    if (error) throw new Error(error.message);

    // 4. Revalidate
    revalidatePath("/{module}");
    
    // 5. Fire Audit Log (Bắt buộc cho mọi mutation)
    fireAuditLog({
      action: "CREATE",
      tableName: "{table}",
      recordId: data.id,
      description: `Tạo mới {Module}: ${data.code}`,
      newData: data,
      source: "server_action"
    });

    return { success: true, data };
  });
}

export async function update{Module}(id: string, rawData: unknown, expectedUpdatedAt?: string) {
  const parsed = {module}Schema.safeParse(rawData);
  if (!parsed.success) return { success: false, error: parsed.error.issues[0].message };
  const payload = parsed.data;

  return withAuth(async (supabase, userId) => {
    // 1. Optimistic Locking (Bắt buộc cho Update)
    if (expectedUpdatedAt) {
      const { data: current } = await supabase.from("{table}").select("updated_at").eq("id", id).single();
      if (current && current.updated_at !== expectedUpdatedAt) {
        throw new Error("Dữ liệu đã bị thay đổi bởi người khác. Vui lòng tải lại trang.");
      }
    }

    const { data, error } = await supabase
      .from("{table}")
      .update({ ...payload, updated_by: userId, updated_at: new Date().toISOString() })
      .eq("id", id)
      .select().single();

    if (error) throw error;

    revalidatePath("/{module}");
    revalidatePath(`/{module}/${id}`);

    fireAuditLog({
      action: "UPDATE",
      tableName: "{table}",
      recordId: id,
      description: `Cập nhật {Module}: ${id}`,
      newData: payload,
      source: "server_action"
    });

    return { success: true, data };
  });
}
```

### 2.3 Status Transition Machine

Sử dụng `VALID_TRANSITIONS` để chặn việc nhảy trạng thái sai logic:

```typescript
const VALID_TRANSITIONS: Record<{Module}Status, {Module}Status[]> = {
  pending: ["processing", "cancelled"],
  processing: ["completed", "failed"],
  // ...
};

export async function updateStatus(id: string, newStatus: {Module}Status) {
  return withAuth(async (supabase) => {
    // 1. Fetch current status
    // 2. Check VALID_TRANSITIONS[current]
    // 3. Update + fireAuditLog
  });
}
```

### 2.4 Domain Isolation Rule

> **MỖI action file CHỈ chứa functions thuộc domain đó.**

```
✅ contract-queries.ts → getContractForEdit(), getNextContractCode()
✅ customer-actions.ts → searchCustomers(), createCustomer()

❌ contract-queries.ts → searchCustomers()  ← SẼ BỊ AUDIT FLAG
❌ contract-mutations.ts → getNextContractCode()  ← query ≠ mutation
```

---

## 3. Hook Composition Pattern

### 3.1 Main Form Hook

```typescript
// hooks/use{Module}Form.ts
export function use{Module}Form(editId?: string) {
  const [formData, setFormData] = useState<{Module}FormData>(DEFAULT);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Load edit data
  useEffect(() => { if (editId) loadEditData(editId); }, [editId]);

  // Field updater
  const updateField = <K extends keyof FormData>(field: K, value: FormData[K]) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field as string]) {
      setErrors(prev => { const next = { ...prev }; delete next[field as string]; return next; });
    }
  };

  // Submit
  const handleSubmit = async () => { /* validate → create/update → revalidate */ };

  return { formData, updateField, errors, saving, handleSubmit };
}
```

### 3.2 Feature Hooks (Tách logic phức tạp)

```typescript
// hooks/use{Module}{Feature}.ts
export function use{Module}Customer() {
  // Search, select, create customer logic
  return { searchQuery, results, selectCustomer, ... };
}
```

---

## 4. Types Centralization

### 4.1 DB Types (`types/{module}.ts`)

```typescript
// Enums từ PostgreSQL
export type ContractStatus = "cho_xu_ly" | "dang_thuc_hien" | "hoan_thanh" | "da_huy";

// DB row type
export interface Contract {
  id: string;
  contract_code: string;
  status: ContractStatus;
  // ... all columns
}
```

### 4.2 Constants (`types/{module}-constants.ts`)

```typescript
// Display labels (SSOT cho UI)
export const STATUS_LABELS: Record<ContractStatus, string> = {
  cho_xu_ly: "Chờ xử lý",
  dang_thuc_hien: "Đang thực hiện",
  hoan_thanh: "Hoàn thành",
  da_huy: "Đã hủy",
};

// Color map (cho Badge, Status indicators)
export const CONTRACT_STATUS_MAP: Record<ContractStatus, { label: string; variant: string }> = { ... };
```

### 4.3 Form Types (`types/{module}-form.ts`)

```typescript
// Tách riêng vì form data ≠ DB data
export interface ContractFormData {
  // Form-specific fields, có thể khác DB schema
}
```

---

## 5. Database Patterns

### 5.1 Soft Delete

```sql
-- Mọi bảng cần xóa mềm PHẢI có:
ALTER TABLE {table} ADD COLUMN deleted_at TIMESTAMPTZ DEFAULT NULL;

-- Queries LUÔN filter:
.is("deleted_at", null)
```

### 5.2 Audit Columns

```sql
CREATE TABLE {table} (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  -- ... business columns ...
  created_by UUID REFERENCES auth.users(id),  -- PHẢI trỏ auth.users, KHÔNG employees
  updated_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  deleted_at TIMESTAMPTZ DEFAULT NULL
);
```

### 5.3 RLS Policy Template

```sql
-- V2: bypass RLS qua service_role (withAuth pattern)
ALTER TABLE {table} ENABLE ROW LEVEL SECURITY;

-- Service role (server actions) — full access
CREATE POLICY "service_role_full_access" ON {table}
  FOR ALL USING (auth.role() = 'service_role');

-- Anon — blocked
CREATE POLICY "anon_no_access" ON {table}
  FOR ALL USING (false);
```

### 5.4 Status Enum

```sql
CREATE TYPE {module}_status_enum AS ENUM (
  'cho_xu_ly',      -- Pending
  'dang_thuc_hien', -- In Progress
  'hoan_thanh',     -- Completed
  'da_huy'          -- Cancelled
);
```

---

## 6. File Size Rules

| Threshold | Action |
|-----------|--------|
| ≤ 250 lines | ✅ Ideal |
| 250–300 lines | ⚠️ Monitor |
| > 300 lines | 🔴 MUST SPLIT |

### Split Strategy

1. **Identify internal functions** — Nếu file có hàm con (`function CoupleFields(...)`) → extract to own file
2. **Identify layout sections** — Desktop vs Mobile layout → extract to `*-layout-sections.tsx`
3. **Identify panels/tabs** — Task list, tab content → extract to `*-panel.tsx`
4. **Keep parent as orchestrator** — State, handlers, data fetching stay in parent
5. **NO barrel exports for internal splits** — Import trực tiếp, không re-export

---

## 7. UI & Error Standards

### 7.1 CSS Classes (SSOT)

```
PHẢI dùng: .input-base, .label-base, .btn-primary, .card-base, .badge-*
KHÔNG hardcode: text-xl font-bold, h-12 px-5 bg-bg-card rounded-2xl
```

### 7.2 Module Error Boundaries

Mỗi module `{module}/` bắt buộc phải có `error.tsx` để cô lập lỗi:

```typescript
// app/(protected)/{module}/error.tsx
"use client";

import { ErrorFallback } from "@/components/ui/error-fallback";

export default function ModuleError({ error, reset }: { error: Error; reset: () => void }) {
  return <ErrorFallback error={error} reset={reset} moduleName="{Module Name}" />;
}
```

### 7.3 SEO & Metadata

Mọi trang chính (`page.tsx`) đều phải có Metadata:

```typescript
export const metadata: Metadata = {
  title: "{Module Name} | Mood Studio",
  description: "Quản lý {Description} chuyên nghiệp",
};
```

### 7.4 Import Pattern

```typescript
// ✅ Đúng — import từ domain action
import { searchCustomers } from "@/app/actions/customer-actions";
import { createContract } from "@/app/actions/contract-mutations";

// ❌ Sai — cross-module import
import { searchCustomers } from "@/app/actions/contract-queries";
```

### 7.3 Currency Display

```typescript
// LUÔN format thống nhất
import { formatCurrency, CURRENCY_SYMBOL } from "@/lib/utils";
// Output: "8.000.000 VNĐ"
```

---

## 8. Module Compliance Checklist

Validate bất kỳ module mới nào trước khi merge:

### Architecture
- [ ] Actions split: `{module}-queries.ts` + `{module}-mutations.ts` + `{module}-lifecycle.ts`
- [ ] No cross-module functions in action files
- [ ] All actions use `withAuth()` wrapper
- [ ] **Zod Validation** thực hiện qua `safeParse()` ở đầu action
- [ ] **Audit Logs** được bắn qua `fireAuditLog()` cho mọi mutation
- [ ] **Optimistic Locking** (check `updated_at`) cho hàm Update
- [ ] `revalidatePath()` gọi sau mutations
- [ ] `created_by` FK → `auth.users(id)` (KHÔNG employees)

### Naming
- [ ] Functions: `verb` + `Module` + `Detail` (camelCase)
- [ ] Files: kebab-case (components), PascalCase (form sections)
- [ ] DB enums: snake_case tiếng Việt không dấu
- [ ] Display labels: Sentence case (không UPPERCASE)

### Types & Validations
- [ ] Types centralized in `types/{module}.ts`
- [ ] Constants/labels in `types/{module}-constants.ts`
- [ ] Zod Schema đặt tại `lib/validations/{module}.schema.ts`
- [ ] Không dùng `any` — full TypeScript types

### Components
- [ ] No file > 300 lines (split nếu cần)
- [ ] Form sử dụng composition hook pattern (`use{Module}Form`)
- [ ] CSS classes từ SSOT (`design-system.css`)
- [ ] Cung cấp `error.tsx` riêng cho module
- [ ] Responsive: Desktop + Mobile layouts
- [ ] Currency via `formatCurrency()` + `CURRENCY_SYMBOL`

### Database
- [ ] Soft delete: `deleted_at` column + `.is("deleted_at", null)`
- [ ] RLS: `service_role_full_access` + `anon_no_access`
- [ ] Status: PostgreSQL ENUM type
- [ ] Audit columns: `created_by`, `updated_by`, `created_at`, `updated_at`

### Performance
- [ ] SWR cho client-side data (không React Query)
- [ ] Pagination cho lists > 50 items
- [ ] No foreignTable sub-select cho bảng > 1000 rows

---

## Gold Standard Reference (Contract Module)

| Layer | File | Lines | Purpose |
|-------|------|-------|---------|
| Queries | `contract-queries.ts` | 97 | Read-only, domain-specific |
| Mutations | `contract-mutations.ts` | ~210 | Create/Update/Delete |
| Lifecycle | `contract-lifecycle.ts` | ~85 | Status transitions |
| Types | `contract.ts` | — | DB types + enums |
| Constants | `contract-constants.ts` | — | Labels, maps |
| Form types | `contract-form.ts` | — | Form data types |
| List | `contracts-list-client.tsx` | — | SWR + filters |
| Drawer | `contract-drawer.tsx` | 117 | Shell (content extracted) |
| Detail | `contract-detail-client.tsx` | 254 | State + handlers (layout extracted) |
| Form | `form/index.tsx` | — | Form orchestrator |
| Form hook | `form/hooks/useContractForm.ts` | ~200 | Composition hook |
