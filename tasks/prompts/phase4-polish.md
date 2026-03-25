@[/code] Phase 4 — Polish: Pagination + Breadcrumb + Form Validation

## MỤC TIÊU
Fix 3 items P2 còn lại để module Employees đạt Gold Standard hoàn toàn.

## ĐỌC TRƯỚC (BẮT BUỘC)
- tasks/pre-code-checklist.md
- tasks/lessons.md
- tasks/gates/before-edit.md

## GATE: VISUAL VERIFY (BẮT BUỘC)
1. Mở browser `/employees` → screenshot pagination hiện tại
2. Mở browser `/employees/[id]` → screenshot back link hiện tại
3. Mở browser, click "Thêm nhân viên" → screenshot form modal
4. Viết plan ngắn → trình anh duyệt trước khi code

---

## BƯỚC 1: Thay EmployeePagination → Shared Pagination (P2 #9)

### Reference
Tìm shared Pagination component mà contracts dùng. Kiểm tra:
```
grep -r "Pagination" components/contracts/
grep -r "Pagination" components/ui/
```

### Target files
- `components/employees/employee-list-page.tsx` — đổi import
- `components/employees/employee-pagination.tsx` — XÓA file này sau khi verify

### Logic
TRƯỚC:
```tsx
import EmployeePagination from "./employee-pagination";
<EmployeePagination page={page} pageSize={pageSize} total={total} />
```

SAU:
```tsx
import { Pagination } from "@/components/ui/pagination"; // hoặc path đúng
<Pagination page={page} pageSize={pageSize} total={total} />
```

LƯU Ý: Check props interface của shared Pagination trước — nó có thể dùng tên props khác (ví dụ `currentPage`, `totalPages`...). Dùng ĐÚNG interface.

---

## BƯỚC 2: Back link → Breadcrumb (P2 #10)

### Target file
- `components/employees/employee-detail-page.tsx`

### Logic
TÌM đoạn back link (thường ở đầu page):
```tsx
<Link href="/employees">← Danh sách nhân viên</Link>
```

ĐỔI thành breadcrumb:
```tsx
<nav className="flex items-center gap-1.5 text-sm mb-4">
  <Link href="/employees" className="text-text-muted hover:text-text transition-colors">
    Nhân viên
  </Link>
  <span className="text-text-muted">›</span>
  <span className="text-text font-medium">{employee.full_name}</span>
</nav>
```

LƯU Ý: Giữ nguyên responsive — mobile có thể ẩn breadcrumb hoặc truncate.

---

## BƯỚC 3: Form validation nâng cao (P2 #13)

### Target file
- `components/employees/employee-form-modal.tsx`

### Validation cần thêm

1. **Phone format** (nếu nhập):
```ts
if (phone && !/^[0-9]{10,11}$/.test(phone.replace(/\s/g, ""))) {
  errors.phone = "SĐT phải 10-11 số";
}
```

2. **Email format** (nếu nhập):
```ts
if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
  errors.email = "Email không hợp lệ";
}
```

3. **Salary > 0** (nếu nhập):
```ts
if (baseSalary && Number(baseSalary) <= 0) {
  errors.salary = "Lương phải > 0";
}
```

### Hiển thị lỗi
Thêm `<p className="text-xs text-error mt-1">{errors.field}</p>` dưới mỗi input.

LƯU Ý: Check current validation logic trước — không phá code đang chạy. Chỉ BỔ SUNG, không rewrite.

---

## VERIFY

1. `/employees` → Pagination style giống `/contracts` 
2. `/employees/[id]` → Breadcrumb "Nhân viên › Tên NV" (không còn "← Danh sách")
3. "Thêm nhân viên" → nhập SĐT sai format → hiện lỗi đỏ
4. Nhập email sai → hiện lỗi đỏ
5. Nhập lương âm → hiện lỗi đỏ
6. Nhập đúng → submit thành công
7. Dev server 0 errors
8. `employee-pagination.tsx` đã bị xóa

## KHÔNG ĐƯỢC LÀM
- Không sửa employee-filters.tsx (đã xong Phase 3)
- Không sửa employee-queries.ts (đã xong Phase 2)
- Không sửa employee-table/card (đã xong Phase 2)
- Chỉ sửa: employee-list-page, employee-detail-page, employee-form-modal
