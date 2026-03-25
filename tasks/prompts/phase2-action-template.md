# Phase 2: Tạo Action Template (`tasks/action-template.md`)

## CONTEXT
Dự án Next.js + Supabase. Đã có 48 action files trong `app/actions/`.
Deep audit phát hiện: 39/48 thiếu try-catch, 9/48 thiếu withAuth, 15/48 thiếu revalidatePath.
Cần tạo template chuẩn để mọi action mới follow đúng pattern.

## TASK — Tạo `tasks/action-template.md` với 4 sections:

---

### Section 1: Server Action Boilerplate

```typescript
// TEMPLATE BẮT BUỘC — Mọi Server Action PHẢI theo format này

"use server";

import { withAuth } from "@/lib/auth_utils";
import { revalidatePath } from "next/cache";

// ===== Type Definitions =====
interface ActionResult<T = undefined> {
  success: boolean;
  data?: T;
  error?: string;
}

// ===== WRITE Action (Create/Update/Delete) =====
export async function createModule(
  data: CreateModuleInput
): Promise<ActionResult<ModuleType>> {
  const { supabase } = await withAuth();              // ← BẮT BUỘC

  try {                                                // ← BẮT BUỘC
    const { data: result, error } = await supabase
      .from("modules")
      .insert({ ...data })
      .select()
      .single();

    if (error) throw error;

    revalidatePath("/modules");                        // ← BẮT BUỘC cho WRITE
    return { success: true, data: result };

  } catch (error) {                                    // ← BẮT BUỘC
    console.error("[createModule]", error);
    return { success: false, error: "Không thể tạo. Vui lòng thử lại." };
  }
}

// ===== READ Action (Query) =====
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

**5 quy tắc cứng:**
1. `withAuth()` — BẮT BUỘC cho mọi action (cả read lẫn write)
2. `try-catch` — BẮT BUỘC cho WRITE actions
3. `revalidatePath` — BẮT BUỘC sau mỗi WRITE thành công
4. Return `{ success, data?, error? }` — KHÔNG throw error ra ngoài
5. `console.error("[functionName]", error)` — log kèm tên function

---

### Section 2: Validation Rules

```markdown
## Client-side Validation (UX — nhanh)
- Required fields → check trước khi gọi action
- Email regex, phone format → hiện lỗi dưới input
- Dùng `.error-text` token cho error messages

## Server-side Validation (Security — chặn bypass)
- Check `!data.requiredField` → return error
- Check enum values hợp lệ → reject invalid
- Check FK tồn tại → query trước khi insert

## Pattern chuẩn:
```tsx
export async function createModule(data: Input): Promise<ActionResult> {
  // Server-side validation
  if (!data.name?.trim()) {
    return { success: false, error: "Tên không được để trống" };
  }
  if (!VALID_STATUSES.includes(data.status)) {
    return { success: false, error: "Trạng thái không hợp lệ" };
  }

  const { supabase } = await withAuth();
  // ... continue
}
```

**Rules:**
- ❌ KHÔNG tin client data → luôn validate server-side
- ❌ KHÔNG dùng tiếng Việt cho enum values → `cho_xu_ly` (Lesson #65)
- ✅ FK `*_by` → trỏ `auth.users(id)` (Lesson #72)
```

---

### Section 3: Cache Invalidation Rules

```markdown
## Khi nào revalidate?

| Action type | revalidatePath | Ví dụ |
|------------|---------------|-------|
| CREATE | ✅ BẮT BUỘC | `revalidatePath("/modules")` |
| UPDATE | ✅ BẮT BUỘC | `revalidatePath("/modules")` |
| DELETE | ✅ BẮT BUỘC | `revalidatePath("/modules")` |
| READ/Query | ❌ KHÔNG cần | — |

## Cross-module write:
Khi action ảnh hưởng dữ liệu module khác → revalidate CẢ 2:
```tsx
revalidatePath("/contracts");
revalidatePath("/employees");  // vì contract hiển thị tên employee
```

## SWR client-side:
Sau action thành công → `mutate(key)` để SWR re-fetch:
```tsx
const result = await createModule(data);
if (result.success) {
  mutate("/api/modules");  // SWR re-fetch
}
```
```

---

### Section 4: Error Message Standards

```markdown
## User-facing error messages:
- ❌ KHÔNG hiện raw Supabase error → "duplicate key violates..."
- ✅ Hiện message thân thiện → "Mã này đã tồn tại. Vui lòng chọn mã khác."

## Mapping chuẩn:
| Supabase Error | User Message |
|---------------|-------------|
| `duplicate key` | "Dữ liệu đã tồn tại" |
| `foreign key violation` | "Dữ liệu liên quan không tìm thấy" |
| `not null violation` | "[Field] không được để trống" |
| `check constraint` | "Giá trị không hợp lệ" |
| Network error | "Lỗi kết nối. Vui lòng thử lại." |
| Unknown | "Có lỗi xảy ra. Vui lòng thử lại." |
```

---

## LƯU Ý:
- File này là **reference document**, KHÔNG phải code
- Mục đích: AI đọc 1 file = biết cách viết Server Action đúng chuẩn
- Enforce qua `pre-code-checklist.md` item 9
