# Phase 02: Đồng bộ UX Navigation (Leads)
Status: ✅ Complete
Dependencies: Phase 01

## Objective
Bổ sung `useTransition` vào `components/crm/lead-list-page.tsx` nhằm tạo trải nghiệm loading mượt mà cho việc chuyển trang và lọc dữ liệu, đồng bộ hóa tuyệt đối với quy chuẩn UX đang áp dụng bên `customer-list-page.tsx`.

## Requirements
### Functional
- [x] Khai báo `const [isPending, startTransition] = useTransition();` tại `LeadListPage`.
- [x] Bọc các lệnh điều hướng (`router.push` trong Pagination và các filter) bằng `startTransition`.
- [x] Khóa mờ khu vực danh sách (`opacity-50 pointer-events-none`) khi `isPending === true`.

### Non-Functional
- [x] Không ảnh hưởng tới cơ chế SSR và Hydration.

## Implementation Steps
1. [x] Import `useTransition` từ `react` vào `lead-list-page.tsx`.
2. [x] Render lại UI Wrapper cho phần List/Table.

## Files to Create/Modify
- `components/crm/lead-list-page.tsx` - [Update component logic and UI wrappers]

## Test Criteria
- [x] Click page/filter sẽ thấy danh sách mờ đi nhẹ nhàng, thay vì trang bị chớp cứng (hard reload).
- [x] Các action hiện tại trong tab Leads không bị side-effects.

---
Next Phase: [Phase 03](phase-03-layout-resiliency.md)
