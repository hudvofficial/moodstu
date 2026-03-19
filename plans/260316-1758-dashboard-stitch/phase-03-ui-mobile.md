# Phase 03: Tối ưu UI Mobile Responsive
Status: ⬜ Pending
Dependencies: Phase 02

## Objective
Giao diện "Mood Studio Mobile Dashboard" rất quan trọng đối với Sale/Camera Man. Không dồn cục biểu đồ trên Mobile mà phải vuốt kéo dọc.

## Requirements
### Functional
- [ ] List View dọc (1 cột). KPIs chuyển sang dạng vuốt ngang (Horizontal Scroll - ẩn thanh trượt) hoặc Stack 2 dòng x 2 cột.
- [ ] Ẩn các cột phụ không cần thiết của Hợp đồng / Doanh thu trên màn hình quá bé.
- [ ] Tuân thủ SafeArea Bottom Notch (PWA/iOS webapp).

### Code Quality (Taiwind)
- [ ] Chỉ dùng class `md:` hoặc `lg:` tuân thủ Mobile First.
- [ ] padding-x = 4 (16px) ở Mobile, = 6 or 8 (24/32px) ở Desktop.

## Implementation Steps
1. Khảo sát lại `app/(protected)/dashboard/page.tsx` và thêm các breakpoints.
2. Áp dụng Horizontal Scroll cho `KPI_Cards_List` trên `sm` screen.
3. Test lại Layout tại 375px màn hình.

---
Next Phase: [Phase 04](phase-04-integration-charts.md)
