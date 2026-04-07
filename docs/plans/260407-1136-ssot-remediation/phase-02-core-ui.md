# Phase 02: Refactor Core UI Components

Status: ⬜ Pending | 🟡 In Progress | ✅ Complete
Dependencies: phase-01-setup.md

## Objective

Thay thế các mã hardcode màu trong các Component lõi, sử dụng Token vừa định nghĩa. Điển hình là `status-select`, `date-picker`, `offline-indicator`.

## Implementation Steps

1. [ ] Sửa `components/ui/status-select.tsx`: Bỏ mã màu hardcode, thay bằng reference CSS Variable hoặc Tailwind Class SSOT.
2. [ ] Sửa `components/ui/select/SelectStatus.tsx`: Tương tự.
3. [ ] Sửa `components/ui/offline-indicator.tsx`: Bỏ hardcode màu, dùng biến `--color-warning`.
4. [ ] Sửa `components/ui/date-picker.tsx`: Bỏ các mã viền cứng `rgba()` và dùng biến `--color-primary/30`.

## Test Criteria

- [ ] Không còn thấy bất kỳ `#hex` nào trong các component trên nếu search regex.
- [ ] Component hiển thị trên giao diện vẫn hoàn toàn chuẩn mực như cũ.

---

Next Phase: phase-03-layout.md
