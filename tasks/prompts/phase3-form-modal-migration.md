/code Phase 3: Employee Form Modal Migration (SSOT Tokens + SelectForm)

## CONTEXT
Phase 1 (Breadcrumb FC) ✅ + Phase 2 (section-heading, info-card, notes, detail-page tokens) ✅.
Phase 3 chỉ còn **employee-form-modal.tsx** — migrate native selects và inline classes.

## TASK 3.1 — Import SelectForm
File `components/employees/employee-form-modal.tsx`, thêm import:

```tsx
import { SelectForm } from "@/components/ui/select/SelectForm";
```

## TASK 3.2 — Section headings → `.section-heading`
Tìm tất cả instances `text-sm font-semibold text-text` → thay bằng `section-heading`

Cụ thể:
- "Thông tin cá nhân" heading
- "Thông tin công việc" heading 
- "Thông tin lương" heading (nếu có)

## TASK 3.3 — Form grid → `form-grid-2col`
Tìm `grid grid-cols-1 lg:grid-cols-2 gap-3` → check:
- Nếu token `form-grid-2col` breakpoint phù hợp (kiểm tra trong `forms.css`) → dùng `form-grid-2col`
- Nếu breakpoint khác (form-grid-2col dùng `sm:` nhưng modal cần `lg:`) → **GIỮ NGUYÊN** inline class

> ⚠️ QUAN TRỌNG: Kiểm tra `form-grid-2col` trong forms.css trước. Nếu breakpoint tại `sm (640px)` mà modal width < 640px trên mobile → 2 cột sẽ bị bóp. GIỮ inline nếu không khớp.

## TASK 3.4 — Native `<select>` → `<SelectForm>`
Có 3 native selects cần migrate:

### Select 1: Giới tính
```tsx
// TRƯỚC:
<select className="input-base" value={form.gender} onChange={...}>
  <option value="">Chọn...</option>
  <option value="Nam">Nam</option>
  <option value="Nữ">Nữ</option>
  <option value="Khác">Khác</option>
</select>

// SAU:
<SelectForm
  label="Giới tính"
  value={form.gender}
  onChange={(v) => setField("gender", v)}
  options={[
    { value: "Nam", label: "Nam" },
    { value: "Nữ", label: "Nữ" },
    { value: "Khác", label: "Khác" },
  ]}
  placeholder="Chọn giới tính"
/>
```

### Select 2: Phòng ban
```tsx
<SelectForm
  label="Phòng ban"
  value={form.department}
  onChange={(v) => setField("department", v)}
  options={DEPARTMENT_OPTIONS}  // hoặc tạo constant
  placeholder="Chọn phòng ban"
  error={errors.department}
/>
```

### Select 3: Vai trò
```tsx
<SelectForm
  label="Vai trò"
  value={form.role}
  onChange={(v) => setField("role", v as EmployeeRole)}
  options={ROLE_OPTIONS}  // hoặc tạo constant
  placeholder="Chọn vai trò"
/>
```

> **LƯU Ý:** Kiểm tra SelectForm props interface trước. Nếu thiếu `label` prop hoặc `error` prop → check `SelectForm.tsx` để đảm bảo compatible. Tạo options constants nếu chưa có.

## TASK 3.5 — Error text → `.error-text`
Tìm tất cả:
```tsx
<p className="text-xs text-error mt-1">
```
Thay bằng:
```tsx
<p className="error-text">
```

## TASK 3.6 — Xóa toast validation trùng
Tìm logic dạng:
```tsx
toast.error("Vui lòng nhập họ tên");
toast.error("Vui lòng chọn phòng ban");
```
Nếu inline error messages ĐÃ hiển thị cùng validation → xóa toast trùng.
CHỈ xóa nếu inline error đã cover cùng validation case.

## TASK 3.7 — ESLint cleanup
Dòng 1 file `employee-detail-page.tsx`:
```tsx
// TRƯỚC:
/* eslint-disable @next/next/no-img-element */

// SAU: Xóa hẳn hoặc thay bằng inline:
{/* eslint-disable-next-line @next/next/no-img-element */}
// đặt ngay trước dòng <img>
```

## QUY TẮC
- CHỈ sửa 2 files: `employee-form-modal.tsx` + `employee-detail-page.tsx` (eslint only)
- KHÔNG sửa file nào NGOÀI danh sách trên
- KHÔNG thay đổi business logic (validation logic giữ nguyên)
- Kiểm tra SelectForm props interface TRƯỚC khi dùng
- Tạo options constants nếu cần

## VERIFY
1. `npm run dev` — không lỗi compile
2. Mở form modal (click "Sửa" trên employee detail) → 3 selects render Radix dropdown
3. Keyboard navigation: Tab/Arrow/Enter trên SelectForm
4. Submit form → validation works (inline errors hiển thị)
5. Mobile: form layout OK, selects tap-friendly
6. `npx tsc --noEmit` → 0 errors
