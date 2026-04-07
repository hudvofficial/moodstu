# Phase 01: Setup globals.css Tokens

Status: ⬜ Pending | 🟡 In Progress | ✅ Complete
Dependencies: None

## Objective

Xây dựng định nghĩa đầy đủ các biến màu `--color-` tại `app/globals.css` (@theme) để chuẩn bị biến `globals.css` thành từ điển màu (SSOT), và dọn dẹp `utilities.css`.

## Requirements

### Functional

- [ ] Mọi màu hệ thống (status, gallery, warning, offline) phải có mặt trong `@theme`.
- [ ] Không sinh thêm rác trong `utilities.css`.

## Implementation Steps

1. [ ] Quét các màu hex còn thiếu (như `#f39c12`, `#3498db`, `#e74c3c`, `#27ae60` ở Status Select) và đem vào `globals.css` dưới dạng (vd: `--color-status-pending`, `--color-status-success`...).
2. [ ] Định nghĩa các màu background nền (như `--color-bg-gallery: #1a1a1a`).
3. [ ] Dọn dẹp `utilities.css`, bỏ các class manual bị trùng.

## Files to Create/Modify

- `app/globals.css` - Bổ sung token màu
- `app/styles/utilities.css` - Dọn rác
- `package.json` - Cập nhật script lint / tsc (nếu cần thiết)

## Test Criteria

- [ ] File `globals.css` build không bị lỗi.

---

Next Phase: phase-02-core-ui.md
