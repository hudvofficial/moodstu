# Phase 01: Container Standard
Status: ✅ Complete
Dependencies: None

## Objective
Thay thế tất cả wrapper hardcoded (`lg:max-w-2xl lg:mx-auto`) trong module Settings
bằng SSOT token `main-container` từ layout.css.

## SSOT Token Reference
- `main-container` (layout.css): full-width, responsive padding, flex-column, gap tự quản lý.
- Gold Standard: employee-detail-page.tsx line 81: `<div className="main-container gap-4!">`

## Implementation Steps
1. [x] settings-view.tsx — Thay wrapper line 84
2. [x] studio-info-form.tsx — Thay wrapper line 94
3. [x] studio/page.tsx — Thay Suspense fallback line 28

## Files Modified
- `components/settings/settings-view.tsx` (line 84)
- `components/settings/studio-info-form.tsx` (line 94)
- `app/(protected)/settings/studio/page.tsx` (line 28)

## Test Criteria
- [x] Build thành công (0 errors)
- [x] UI /settings hiển thị full-width trên desktop
- [x] UI /settings/studio hiển thị full-width trên desktop
- [x] Skeleton loader phù hợp khi Suspense fallback

---
Next Phase: Phase 02 — Detail Grid & Optimistic UI
