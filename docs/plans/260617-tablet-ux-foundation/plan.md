# Implementation Plan: Tablet UX Foundation & Contracts PoC

## Overview
Dự án Mood Studio hiện đang bị tình trạng "Desktop fallback" trên iPad (đặc biệt là iPad landscape bị nhận diện nhầm thành desktop). Plan này thiết lập một **Tablet Design Foundation** dùng chung cho toàn hệ thống, và áp dụng nó làm mẫu (Proof of Concept - PoC) lên module `/contracts` trước khi roll-out ra các module khác (CRM, Lịch, v.v.).

## Architecture Decisions
- **Tablet Breakpoint Rethink:** iPad Landscape (1024px - 1180px) có sidebar sẽ không được coi là Desktop. Chúng ta coi nó là `Tablet Wide`. Desktop thực sự phải >= 1280px.
- **Hybrid List Pattern:** Bỏ tư duy "co kéo table desktop". Dùng layout 4 khối thông tin: Identity (Mã+Ngày), Customer (Tên+Tag), Finance (Tổng+Nợ), Actions.
- **Touch Targets:** Các nút bấm, filter, pagination trên tablet phải >= 44x44px. Row height của bảng phải cao hơn desktop.
- **Responsive Form & Detail:** Form trên iPad chỉ dùng tối đa 2 cột. Right-rail tài chính/summary phải được thiết kế để không wrap title hẹp. Action bar trên trang detail phải giấu secondary actions vào menu `...`.
- **Sidebar Strategy:** iPad/tablet-wide dùng icon-only sidebar (`w-20`) thay vì full text sidebar. Desktop full text chỉ từ >=1280px, giúp các module nghiệp vụ lấy lại ~176px canvas ngang.

## Task List

### Phase 1: Tablet Foundation (UI Wrappers)
- [ ] Task 1.1: Tạo hook `use-tablet-layout.ts` hoặc config Tailwind (nếu cần) để xử lý logic breakpoint `Tablet Wide` (phân biệt rõ với Desktop khi có sidebar).
- [ ] Task 1.2: Xây dựng `TabletHybridTable` component base.
- [ ] Task 1.3: Cập nhật `ResponsiveFormGrid` cho phép truyền số cột max (tablet=2, desktop=3).
- [ ] Task 1.4: Xây dựng `TabletActionHeader` (gom action phụ vào DropdownMenu).

### Checkpoint: Foundation
- [ ] Các UI component base được tsc/eslint pass.

### Phase 2: Contracts PoC (Áp dụng Foundation)
- [ ] Task 2.1: Sửa `/contracts` list (Dùng `TabletHybridTable`, gộp cột MÃ+NGÀY, KHÁCH+TAG, TỔNG+NỢ).
- [ ] Task 2.2: Sửa `/contracts/create` & `edit` form (Dùng FormGrid 2 cột, fix lỗi wrap title right-rail).
- [ ] Task 2.3: Sửa `/contracts/[id]` detail (Dùng `TabletActionHeader`, nới rộng card tài chính, collapse sidebar nếu cần).

### Checkpoint: Contracts PoC
- [ ] End-to-end flow màn hợp đồng hoạt động (List -> Create -> Detail).
- [ ] Reviewer Agent đánh giá PASS.

### Phase 3: QA & Verification
- [ ] Task 3.1: Chạy Playwright script chụp ảnh 3 viewport: Desktop (1440), iPad Ngang (1180), iPad Dọc (820).
- [ ] Task 3.2: Báo cáo user (gửi screenshot path).

### Checkpoint: Complete
- [ ] Chờ User duyệt hình ảnh.
- [ ] Merge vào Production.

## Risks and Mitigations
| Risk | Impact | Mitigation |
|------|--------|------------|
| Phá vỡ layout Desktop/Mobile cũ | High | Tách riêng file component (vd: `contracts-tablet-table.tsx`) hoặc dùng CSS `@media` cô lập cẩn thận. Chạy screenshot so sánh Desktop trước và sau. |
| Mất tính năng khi gom cột bảng | Med | Giữ nguyên action ở cột cuối, gộp thông tin hiển thị chứ không bỏ data. |
| Xung đột với Sidebar state hiện có | Low/Med | Chỉ thêm logic collapse/expand qua context/store hiện có, không đập đi viết lại sidebar. |
