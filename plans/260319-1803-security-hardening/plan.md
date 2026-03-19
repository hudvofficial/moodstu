# Plan: Security Hardening — Auth Callback + Role Fail-Closed
Created: 2026-03-19T18:03
Status: 🟡 In Progress

## Overview
Fix 2 lỗ hổng bảo mật phát hiện từ audit:
1. Auth callback route bị middleware chặn (edge case)
2. Role fallback fail-open sang "admin" (BUG thật)

## Phases

| Phase | Name | Status | Files |
|-------|------|--------|-------|
| 01 | Fix role fail-closed | ⬜ | `app/(protected)/layout.tsx` |
| 02 | Fix auth callback route | ⬜ | `lib/supabase/middleware.ts` |
| 03 | Verify | ⬜ | Browser test |

---

## Phase 01: Role Fail-Closed (CRITICAL)

### Vấn đề
```typescript
// HIỆN TẠI — line 20
const role = (user.user_metadata?.role as Role) || "admin";
//                                                  ^^^^^^ FAIL-OPEN!
// User mới chưa có role → tự động thành ADMIN → toàn quyền!
```

### Fix
```typescript
// SAU KHI FIX
const role = (user.user_metadata?.role as Role) || "employee";
//                                                  ^^^^^^^^^ FAIL-CLOSED
// User mới chưa có role → mức thấp nhất → an toàn
```

### Files
- `app/(protected)/layout.tsx` — line 20: đổi "admin" → "employee"

---

## Phase 02: Auth Callback Whitelist

### Vấn đề
- Middleware matcher bắt TẤT CẢ routes (trừ static files)
- `/api/auth/callback` bị match → middleware chạy → chưa có session → redirect /login
- Thực tế đang hoạt động vì Supabase cookie flow, nhưng là RACE CONDITION

### Fix
```typescript
// HIỆN TẠI — lib/supabase/middleware.ts line 40
const publicRoutes = ["/login", "/offline"];

// SAU KHI FIX
const publicRoutes = ["/login", "/offline", "/api/auth"];
```

### Files
- `lib/supabase/middleware.ts` — line 40: thêm "/api/auth" vào publicRoutes

---

## Phase 03: Verify
- [ ] Login flow vẫn hoạt động
- [ ] User mới (không có role metadata) → hiện UI employee (không phải admin)
- [ ] Auth callback route accessible

---

## Không làm (và lý do)

| Issue | Lý do skip |
|-------|-----------|
| withAuth() bypass RLS | V1 proven pattern, by design |
| Navigation routes chưa có | UX issue, không phải security |
| useRealtime subscription | Hook đã ổn, deps đã ổn định |
