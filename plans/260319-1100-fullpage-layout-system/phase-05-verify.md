# Phase 05: Verify Desktop + Mobile
Status: ⬜ Pending
Dependencies: Phase 04

## Objective
Visual verification — mở browser, chụp screenshot, so sánh với Stitch mockup.

## Checklist Desktop (≥ 1024px)

### Header
- [ ] Không có AppShell Header (Hợp đồng / search / icons)
- [ ] Không có Sidebar
- [ ] Sticky header của form: "← Quay lại danh sách" | badge HD-XXXX
- [ ] Header background: white/blur, border bottom rõ ràng

### Two-column Layout
- [ ] LEFT column: S1, S2, S3, S6 hiển thị đúng
- [ ] RIGHT panel: S4, S5, Actions sticky bên phải
- [ ] Gap giữa 2 cột hợp lý (gap-6)
- [ ] Right panel không scroll theo left khi scroll xuống
- [ ] Không có whitespace trống quá lớn 2 bên

### Footer
- [ ] Desktop: KHÔNG có fixed footer ở bottom
- [ ] Actions nằm trong right panel

## Checklist Mobile (< 1024px)

- [ ] Single column layout: S1→S2→S3→S4→S5→S6
- [ ] Fixed footer vẫn hiện: [Hủy] · [Lưu nháp] · [Tạo HĐ]
- [ ] Không bị chồng content

## Checklist Functionality
- [ ] Thêm dịch vụ → S4 tổng kết cập nhật ngay
- [ ] Toggle giảm giá VNĐ/% hoạt động
- [ ] Chọn khách hàng từ dropdown
- [ ] Lưu nháp hoạt động
- [ ] Tạo hợp đồng submit đúng
- [ ] "Quay lại" navigate về `/contracts`

## Screenshot Points
1. Desktop full view (1440px)
2. Desktop scroll xuống (right panel visible, left scrolled)
3. Mobile view (375px)
4. Mobile với fixed footer

---
✅ Khi phase này xong = Feature COMPLETE
