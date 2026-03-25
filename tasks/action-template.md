# 📘 Action Template — Server Action chuẩn

> **BẮT BUỘC đọc file này TRƯỚC KHI tạo Server Action mới.**
> Audit phát hiện: 39/48 files thiếu try-catch, 9/48 thiếu withAuth, 15/48 thiếu revalidatePath.

---

## 1. Boilerplate — WRITE Action (Create/Update/Delete)

```typescript
"use server";

import { withAuth } from "@/lib/auth_utils";
import { revalidatePath } from "next/cache";

// ===== Return Type chuẩn =====
interface ActionResult<T = undefined> {
  success: boolean;
  data?: T;
  error?: string;
}

export async function createModule(
  data: CreateModuleInput
): Promise<ActionResult<ModuleType>> {
  const { supabase } = await withAuth();              // ← BẮT BUỘC

  // Server-side validation
  if (!data.name?.trim()) {
    return { success: false, error: "Tên không được để trống" };
  }

  try {                                                // ← BẮT BUỘC
    const { data: result, error } = await supabase
      .from("modules")
      .insert({ ...data })
      .select()
      .single();

    if (error) throw error;

    revalidatePath("/modules");                        // ← BẮT BUỘC
    return { success: true, data: result };

  } catch (error) {                                    // ← BẮT BUỘC
    console.error("[createModule]", error);             // ← Log kèm tên function
    return { success: false, error: "Không thể tạo. Vui lòng thử lại." };
  }
}
```

## 2. Boilerplate — READ Action (Query)

```typescript
export async function fetchModuleList(): Promise<ModuleType[]> {
  const { supabase } = await withAuth();              // ← BẮT BUỘC

  const { data, error } = await supabase
    .from("modules")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("[fetchModuleList]", error);
    return [];                                         // ← Return empty, KHÔNG throw
  }

  return data ?? [];
}
```

## 5 Quy tắc cứng

| # | Quy tắc | Áp dụng |
|---|---------|---------|
| 1 | `withAuth()` | Mọi action (cả READ lẫn WRITE) |
| 2 | `try-catch` | WRITE actions (CREATE/UPDATE/DELETE) |
| 3 | `revalidatePath` | Sau mỗi WRITE thành công |
| 4 | Return `{ success, data?, error? }` | WRITE actions — KHÔNG throw ra ngoài |
| 5 | `console.error("[fnName]", error)` | Mọi catch block — log kèm tên function |

---

## 3. Validation Rules

### Client-side (UX — hiện lỗi nhanh)

- Required fields → check trước khi gọi action
- Email regex, phone format → hiện lỗi dưới input bằng `.error-text`
- Dùng hook pattern từ `module-blueprint.md` §5

### Server-side (Security — chặn bypass)

```typescript
export async function createModule(data: Input): Promise<ActionResult> {
  // 1. Required fields
  if (!data.name?.trim()) {
    return { success: false, error: "Tên không được để trống" };
  }

  // 2. Enum validation
  if (!VALID_STATUSES.includes(data.status)) {
    return { success: false, error: "Trạng thái không hợp lệ" };
  }

  // 3. FK check (nếu cần)
  const { data: parent } = await supabase
    .from("parents")
    .select("id")
    .eq("id", data.parent_id)
    .single();
  if (!parent) {
    return { success: false, error: "Dữ liệu liên quan không tồn tại" };
  }

  // ... continue với withAuth + try-catch
}
```

### Rules:

- ❌ KHÔNG tin client data → luôn validate server-side
- ❌ KHÔNG dùng tiếng Việt cho enum values → `cho_xu_ly` (Lesson #65)
- ✅ FK `*_by` → trỏ `auth.users(id)` (Lesson #72)

---

## 4. Cache Invalidation

### Khi nào revalidate?

| Action type | revalidatePath | Ví dụ |
|------------|---------------|-------|
| CREATE | ✅ BẮT BUỘC | `revalidatePath("/modules")` |
| UPDATE | ✅ BẮT BUỘC | `revalidatePath("/modules")` |
| DELETE | ✅ BẮT BUỘC | `revalidatePath("/modules")` |
| READ/Query | ❌ KHÔNG cần | — |

### Cross-module write:

Khi action ảnh hưởng data module khác → revalidate CẢ 2:

```typescript
revalidatePath("/contracts");
revalidatePath("/employees");  // vì contract hiển thị tên employee
```

### SWR client-side sync:

Sau action thành công → `mutate(key)` để SWR re-fetch:

```typescript
const result = await createModule(data);
if (result.success) {
  mutate("/api/modules");  // SWR re-fetch
}
```

---

## 5. Error Message Standards

### User-facing messages:

- ❌ KHÔNG hiện raw Supabase error → `"duplicate key violates unique constraint"`
- ✅ Hiện message thân thiện → `"Mã này đã tồn tại. Vui lòng chọn mã khác."`

### Mapping chuẩn:

| Supabase Error | User Message |
|---------------|-------------|
| `duplicate key` | "Dữ liệu đã tồn tại" |
| `foreign key violation` | "Dữ liệu liên quan không tìm thấy" |
| `not null violation` | "[Field] không được để trống" |
| `check constraint` | "Giá trị không hợp lệ" |
| Network error | "Lỗi kết nối. Vui lòng thử lại." |
| Unknown | "Có lỗi xảy ra. Vui lòng thử lại." |

### Component-side feedback (BẮT BUỘC):

```tsx
// ❌ SAI — UI im lặng khi fail:
await createModule(data);

// ✅ ĐÚNG — luôn có toast feedback:
const result = await createModule(data);
if (result.success) {
  toast.success("Đã tạo thành công");
  closeModal();
} else {
  toast.error(result.error || "Có lỗi xảy ra");
}
```
