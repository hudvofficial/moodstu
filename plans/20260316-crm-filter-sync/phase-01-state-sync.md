# Phase 01: State Takedown & Rewrite
Status: ✅ Complete

## Objective
Gỡ bỏ hoàn toàn việc phụ thuộc vào Local State (`useState`) của Text Input trong danh sách CRM. Đảm bảo Mobile & Desktop đồng nhất sử dụng URL SearchParams làm Single Source of Truth duy nhất. Trị triệt để Bug không xoá được chữ ở trên màn hình điện thoại.

## Requirements
### Functional
- [ ] Xóa `useState("q")` từ `CrmLayoutHeader`.
- [ ] Chuyển Ô tìm kiếm thành Stateless component (uncontrolled component). Nhận `defaultValue` trực tiếp từ URL, sử dụng DOM native logic để push param.
- [ ] Tích hợp `FilterChip` sao cho khi bấm "Xóa" trên Chip, ô Input chữ tự động Reset.

## Implementation Steps
1. [ ] Sửa lại Component Ô Tìm Kiếm (`input`). Thêm `ref` nếu cần, xóa `value/onChange`.
2. [ ] Thiết kế lại Hook để khi `onChange` nó lấy thẳng text từ `e.target` và đẩy lên URL via `useDebounce` theo nhịp đập 500ms mà không bị React ép ngược ngược dòng. Hoặc sử dụng `useSearchParams` hook thuần để detect `q` bị xóa nhằm clear Input box.

## Files to Modify
- `components/crm/CrmLayoutHeader.tsx`

---
Next Phase: phase-02-filter-consolidation.md
