# Phase 02: Cold-Start UX (Smart Splash Screen)
Status: ⬜ Pending
Dependencies: Không (độc lập)

## Objective
Port Smart Splash Screen từ V1 — hiện logo animation khi cold-start, skip khi warm visit.
Thay vì white flash → hiện logo Mood Studio pulse animation → fade out khi DOMContentLoaded.

## Requirements
### Functional
- [ ] Lần đầu mở app (cold-start) → hiện splash screen với logo pulse
- [ ] Lần sau trong cùng session (warm visit) → **skip hoàn toàn** (check `sessionStorage`)
- [ ] Splash tự ẩn sau khi content load xong hoặc timeout 4s

### Non-Functional
- [ ] Inline script trong `<head>` — zero render-blocking
- [ ] Dùng Earth-tone color (`--color-primary` / `#8B5E3C`) thay V1 green
- [ ] Animation nhẹ nhàng (opacity pulse), không dùng heavy CSS transform

## Implementation Steps
1. [ ] Mở `app/layout.tsx`
2. [ ] Thêm inline `<script>` trong `<head>` (trước body):
   - Check `sessionStorage.getItem('ms_v2_loaded')` → nếu có → skip
   - Set `sessionStorage.setItem('ms_v2_loaded', '1')`
   - Tạo div#splash-screen overlay full screen, nền `var(--color-primary, #8B5E3C)`
   - Chèn logo `/logo.png` 80x80 với animation pulse
   - DOMContentLoaded → fade out 300ms → remove
   - Safety timeout 4s → force remove
3. [ ] Thêm inline `<style>` cho `@keyframes splashPulse`
4. [ ] Test trên cả mobile PWA và desktop

## Files to Create/Modify
- `app/layout.tsx` — Thêm inline splash script

## Test Criteria
- [ ] Cold-start (clear sessionStorage) → thấy splash → fade out → content hiện
- [ ] Warm visit (F5 hoặc navigate) → không thấy splash
- [ ] Mobile PWA → splash hiện đúng, không bị trắng trước

---
Next Phase: Phase 03 — PWA Hardening
