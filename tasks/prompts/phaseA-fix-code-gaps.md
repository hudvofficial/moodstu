# Phase A: Fix 4 Code Gaps → TRUE Hybrid Gold Standard

## CONTEXT
Dự án Next.js + Supabase + Tailwind. Audit phát hiện 4 gaps chặn đường đạt industry-level.
Plan ref: `implementation_plan.md` (Phase A).
Follow: `tasks/action-template.md` cho action patterns.

## TASK — 5 items, THEO THỨ TỰ:

---

### A1 + A3: Contracts `page.tsx` → Server-side fetch + SEO metadata

**File sửa:** `app/(protected)/contracts/page.tsx`

**Hiện tại (ANTI-PATTERN — client fetch toàn bộ):**
```tsx
import ContractsListClient from "@/components/contracts/contracts-list-client";
export default function ContractsPage() {
  return <ContractsListClient />;
}
```

**Sửa thành (theo Employees gold pattern):**
```tsx
import { getContractList, getContractStats } from "@/app/actions/contract-queries";
import ContractsListClient from "@/components/contracts/contracts-list-client";

export const metadata = { title: "Hợp đồng | Mood Studio" };

export default async function ContractsPage() {
  // Server-side fetch — SEO + faster initial render
  // NOTE: ContractsListClient hiện tại tự fetch bằng SWR
  // → Truyền initialData để hydrate, SWR vẫn re-fetch client-side
  return <ContractsListClient />;
}
```

> ⚠️ **QUAN TRỌNG:** `contracts-list-client.tsx` hiện đã dùng SWR self-contained.
> Nếu refactor quá lớn → chỉ thêm `metadata` + comment TODO cho server-fetch.
> KHÔNG phá SWR flow đang chạy tốt. Ưu tiên: metadata + không regression.

---

### A2: Contracts mutations → thêm `fireAuditLog()`

**File sửa:** `app/actions/contract-mutations.ts`

**Thêm import:**
```tsx
import { fireAuditLog } from "@/lib/audit";
```

**Thêm audit log sau mỗi mutation thành công:**

Trong `createContract()` — SAU `revalidatePath`, TRƯỚC `return`:
```tsx
fireAuditLog({
  action: data.existingContractId ? "UPDATE" : "CREATE",
  tableName: "contracts",
  recordId: contractId!,
  description: data.existingContractId
    ? `Cập nhật HĐ: ${contractPayload.contract_code}`
    : `Tạo HĐ: ${contractPayload.contract_code}`,
  newData: contractPayload,
});
```

Trong `updateContractStatus()` — SAU `revalidatePath`:
```tsx
fireAuditLog({
  action: "UPDATE",
  tableName: "contracts",
  recordId: id,
  description: `Chuyển trạng thái HĐ: ${currentStatus} → ${newStatus}`,
});
```

**File sửa thêm (nếu có cancel/delete):** `app/actions/contract-lifecycle.ts`
- Thêm `fireAuditLog()` vào `cancelContract()` và `deleteContract()` tương tự.

---

### A4: Employee mutations → thêm Zod schema

**File tạo mới:** `lib/validations/employee.schema.ts`

```tsx
import { z } from "zod";

export const employeeCreateSchema = z.object({
  full_name: z.string().min(1, "Tên không được để trống"),
  phone: z.string().optional().nullable(),
  email: z.string().email("Email không hợp lệ").optional().nullable(),
  department: z.string().optional().nullable(),
  role: z.string().optional().nullable(),
  position: z.string().optional().nullable(),
  status: z.enum(["active", "inactive"]).optional().default("active"),
  join_date: z.string().optional().nullable(),
  salary_info: z.record(z.unknown()).optional().nullable(),
  notes: z.string().optional().nullable(),
});

export type EmployeeCreateInput = z.infer<typeof employeeCreateSchema>;
```

**File sửa:** `app/actions/employee-mutations.ts`

Trong `createEmployee()` — TRƯỚC `withAuth`:
```tsx
import { employeeCreateSchema } from "@/lib/validations/employee.schema";

export async function createEmployee(payload: EmployeePayload) {
  // Zod validation
  const parsed = employeeCreateSchema.safeParse(payload);
  if (!parsed.success) {
    const firstIssue = parsed.error.issues[0];
    return {
      success: false as const,
      error: `Dữ liệu không hợp lệ: ${firstIssue.message}`,
    };
  }

  return withAuth(async (supabase) => {
    const data = sanitizePayload(parsed.data as EmployeePayload);
    // ... rest same
  });
}
```

---

### A5: Error boundaries cho CẢ 2 modules

**File tạo mới:** `app/(protected)/contracts/error.tsx`
**File tạo mới:** `app/(protected)/employees/error.tsx`

Cùng nội dung:
```tsx
"use client";

export default function ModuleError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[400px] gap-4 p-6">
      <div className="text-4xl">😕</div>
      <h2 className="text-h2">Có lỗi xảy ra</h2>
      <p className="text-body text-text-secondary text-center max-w-md">
        {error.message || "Đã có lỗi không mong muốn. Vui lòng thử lại."}
      </p>
      <button onClick={reset} className="btn btn-primary">
        Thử lại
      </button>
    </div>
  );
}
```

---

## LƯU Ý QUAN TRỌNG:
- A1 cẩn thận: `contracts-list-client.tsx` dùng SWR → KHÔNG phá flow hiện tại
- A2 cẩn thận: `fireAuditLog` là NON-BLOCKING (fire-and-forget) → không ảnh hưởng UX
- A4: Check xem `zod` đã có trong `package.json` chưa (Contracts đã dùng → chắc có rồi)
- A5: Dùng SSOT tokens (`.text-h2`, `.text-body`, `.btn`, `.btn-primary`)
- SAU KHI XONG → chạy `npm run build` verify 0 errors
