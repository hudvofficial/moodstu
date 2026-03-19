# Plan v2: Fix Fullpage Layout — Minimal Impact
Created: 2026-03-19 11:21
Status: 🟡 In Progress

## Post-mortem: Tại sao Plan v1 fail
- Route group `(fullpage)` xóa Sidebar → user muốn giữ Sidebar
- FullpageFormShell dùng `min-h-screen` nhưng nằm trong AppShell `<main>` → height conflict
- Không check UI trước khi chốt approach

## Approach v2
- GIỮ routes trong `(protected)` (Sidebar giữ)
- ẨN Header + BottomNav khi route = fullpage form
- FullpageFormShell hoạt động TRONG AppShell `<main>`
- Bỏ border line bug giữa 2 cột

## Bugs hiện tại (từ screenshots)
1. Dark vertical border line giữa left/right column
2. Right panel (S4/S5) text bị cắt (380px quá hẹp)
3. FullpageFormShell `min-h-screen` conflict với AppShell `h-screen`
4. AppShell `<main>` có padding px-2/px-6 → double padding

---

## Phases

### Phase 01: AppShell — ẩn Header khi fullpage route
**File:** `components/layout/app-shell.tsx`
**Tasks:**
- [ ] Thêm `usePathname` detect fullpage routes
- [ ] Ẩn `<Header />` khi route match
- [ ] Ẩn `<BottomNav />` khi route match
- [ ] `<main>` bỏ padding khi fullpage (FullpageFormShell tự handle)

### Phase 02: FullpageFormShell — fix cho AppShell context
**File:** `components/layout/fullpage-form-shell.tsx`
**Tasks:**
- [ ] Bỏ `min-h-screen` → dùng `flex flex-col h-full`
- [ ] Right panel: tăng width từ 380px → `min-w-[360px] w-[360px]`
- [ ] Bỏ dark border line (check card-base hoặc grid border)
- [ ] Sticky header: adjust `top-0` offset cho AppShell context

### Phase 03: Verify — mở browser check
- [ ] Desktop: Sidebar ✅ + No Header ✅ + Two-column ✅
- [ ] Mobile: Sidebar drawer ✅ + No BottomNav ✅ + Single column ✅
- [ ] Dark line bug GONE
- [ ] S4/S5 text không bị cắt

## Progress
| Phase | Status | Progress |
|-------|--------|----------|
| 01 | ⬜ Pending | 0% |
| 02 | ⬜ Pending | 0% |
| 03 | ⬜ Pending | 0% |
