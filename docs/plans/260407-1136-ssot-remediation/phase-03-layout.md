# Phase 03: Refactor Layout & Module Components

Status: ⬜ Pending | 🟡 In Progress | ✅ Complete
Dependencies: phase-02-core-ui.md

## Objective

Xóa sổ hardcode ở cấp cao (Module Level): Gallery, Quote Modal, App Shell. Các khu vực phức tạp lồng inline cực nhiều.

## Implementation Steps

1. [ ] Tái cấu trúc kiểu màu trong `components/gallery/public-gallery-client.tsx` (nhìu nhất, >30 dòng inline hardcode `rgba` & `backdropFilter`).
2. [ ] Sửa `components/gallery/selection-summary.tsx` và `password-gate.tsx`.
3. [ ] Sửa `components/theme/ThemeProvider.tsx` (có liên quan `resolved === 'dark'`).
4. [ ] Sửa `components/layout/app-shell.tsx` & `bottom-nav.tsx` (bỏ rgba ở gradient background).
5. [ ] Sửa `components/services/quote/quote-modal.tsx`.

## Test Criteria

- [ ] Giao diện Gallery giữ nguyên 100% cảm giác "premium", nhưng CSS sạch sẽ, code render bằng `var(--...)`.

---

Next Phase: phase-04-typescript.md
