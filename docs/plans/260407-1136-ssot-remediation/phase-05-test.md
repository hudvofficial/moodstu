# Phase 05: Verify & Test

Status: ⬜ Pending | 🟡 In Progress | ✅ Complete
Dependencies: phase-04-typescript.md

## Objective

Chạy đợt kiểm thử cuối cùng để chắc chắn công tác Đại tu cấu trúc không làm lệch Lịch, Đơn vị giá, Component cũ hay vỡ Layout trên thiết bị di động.

## Implementation Steps

1. [ ] Check 1 vòng `grep -rE "#[0-9a-fA-F]{3,6}\b|rgba?\(" components/` xem còn sót không.
2. [ ] Mở trình duyệt Test Dark Mode / Light Mode switch thử (Nếu SSOT làm đúng, việc sang Dark mode tự chuyển cực dễ).
3. [ ] Dùng công cụ Review / Cập nhật Task.md cho V2 Gold Standard Re-check.

## Test Criteria

- [ ] Hardcode CSS dưới 5 chỗ (cho phép các edge cases như Icon filler thuần túy).
- [ ] Code base đạt mức Type-safe 100%.

---

Next Phase: Hoàn tất
