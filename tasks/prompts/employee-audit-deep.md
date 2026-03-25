Audit chuyên sâu module Employees, so sánh với Gold Standard /contracts. KHÔNG fix gì, CHỈ báo cáo.

## CONTEXT

Đọc trước (BẮT BUỘC):
- components/contracts/contracts-list-client.tsx — Gold Standard layout
- components/contracts/contracts-dropdown-filters.tsx — Gold Standard filters (token-based select)
- components/ui/tabs-filter.tsx — TabsFilter component (dùng cho status tabs)
- components/ui/select/SelectPill.tsx — SelectPill component (dùng cho mobile)
- components/employees/employee-list-page.tsx — layout hiện tại
- components/employees/employee-filters.tsx — filters hiện tại
- components/employees/employee-table.tsx — table hiện tại
- components/employees/employee-card.tsx — mobile card hiện tại
- components/employees/employee-detail-page.tsx — detail page
- components/employees/employee-stats-bar.tsx — stats bar
- components/employees/employee-info-card.tsx — info card
- app/actions/employee-queries.ts — server actions
- types/employee.ts + types/employee-constants.ts — types
- app/globals.css — design tokens (tìm --select, --input, --radius, etc.)

TRƯỚC KHI VIẾT BÁO CÁO: mở browser xem cả 2 trang /contracts + /employees (desktop + mobile) để so sánh visual.

## AUDIT CHECKLIST

### 1. LAYOUT COMPARISON (Contracts vs Employees)

So sánh từng phần:
- [ ] Stats bar: vị trí, style, có nút CTA (Thêm nhân viên) không?
- [ ] Status tabs/pills: dùng TabsFilter component hay tự viết?
- [ ] Filter dropdowns: dùng ContractsDropdownFilters pattern hay native select?
- [ ] Search bar: có bị dư không? (header đã có global search)
- [ ] Table: column layout, spacing, hover effect giống nhau không?
- [ ] Mobile: dùng SelectPill hay native select? Card layout responsive?
- [ ] Pagination: dùng shared Pagination component hay tự viết?
- [ ] Empty state: có giống contracts không?
- [ ] FAB (mobile): contracts có FAB "Tạo HĐ" — employees có không?

### 2. TOKEN COMPLIANCE

Kiểm tra từng component:
- [ ] Select elements: dùng class `select-base` hay `input-base`? Đúng token?
- [ ] Button classes: `btn btn-primary`, `btn btn-secondary` — đúng token?
- [ ] Border radius: dùng `rounded-lg` (token) hay hardcoded?
- [ ] Shadow: dùng `shadow-xs` (token) hay khác?
- [ ] Typography: dùng `text-h3`, `text-sm`, etc. đúng hierarchy?
- [ ] Colors: dùng semantic tokens (text-text, text-text-muted, bg-bg-card) hay hardcoded?
- [ ] Spacing: dùng `gap-3`, `p-4`, etc. từ design system?

### 3. COMPONENT REUSE

- [ ] Employees dùng bao nhiêu shared components từ /components/ui/?
- [ ] Contracts dùng bao nhiêu shared components?
- [ ] Liệt kê components contracts dùng mà employees KHÔNG dùng (cần refactor)
- [ ] Liệt kê components employees tự viết mà đáng lẽ nên dùng shared

### 4. DATA FLOW COMPARISON

- [ ] Contracts: SWR hooks (client-side fetch) vs Employees: Server Component (RSC fetch)
- [ ] Ưu/nhược của mỗi approach cho module này
- [ ] Filter state: contracts dùng useContractFilters hook, employees dùng URL searchParams trực tiếp
- [ ] Pagination: cùng pattern hay khác?

### 5. BUSINESS LOGIC BUGS

- [ ] Filter "Nghỉ việc": gửi `inactive` nhưng server check `terminated` — mismatch
- [ ] Stats count: NV đã xóa mềm không được đếm → pill "Nghỉ việc" hiện (0)
- [ ] NV đã xóa mềm vẫn hiện badge "Đang làm" (vì status='active', chỉ deleted_at bị set)
- [ ] Data test: 5 NV đều role='media' → không test được filter "Vai trò"
- [ ] Lương hiển thị thiếu ₫

### 6. DETAIL PAGE COMPARISON

Mở /contracts/[id] và /employees/[id] so sánh:
- [ ] Header layout: avatar + info + action buttons
- [ ] Breadcrumb vs back link
- [ ] Info cards: style, spacing, typography
- [ ] Notes section: auto-save pattern giống nhau?
- [ ] Action buttons: Sửa, Xóa, Khôi phục — vị trí + style

### 7. ACCESSIBILITY & MOBILE

- [ ] Touch targets đủ 44px trên mobile?
- [ ] Select dropdowns có đủ chỗ tap?
- [ ] Table có scroll ngang nếu hẹp quá không?
- [ ] Card mode tự động khi mobile?

## OUTPUT FORMAT

Viết báo cáo dạng bảng cho mỗi section:

| # | Item | Contracts (Gold Standard) | Employees (Hiện tại) | Verdict | Fix Priority |
|---|------|--------------------------|----------------------|---------|-------------|
| 1 | Status tabs | TabsFilter component | Tự viết pills | ❌ Khác | P1 |

Cuối cùng tổng hợp:
1. Danh sách P1 (phải fix để giống Gold Standard)
2. Danh sách P2 (nên fix để polish)
3. Danh sách P3 (nice-to-have)

KHÔNG FIX GÌ. CHỈ BÁO CÁO.
