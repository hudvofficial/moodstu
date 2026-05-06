# Phase 02: Auth Waterfall Kill — `getClaims()`
Status: ⚠️ Code done, project config pending
Dependencies: None (song song với Phase 01)
Est: 30 phút

## Objective
Loại bỏ ~200-400ms auth network roundtrip bằng cách chuyển layout auth từ `getUser()` sang `getClaims()` (local JWT validation).

## Rationale
Hiện tại:
- `(protected)/layout.tsx` → `getAuthenticatedUserContext()` → `getVerifiedUser()` → `supabase.auth.getUser()` → **network roundtrip ~200ms**
- `contracts/layout.tsx` → gọi lại `getAuthenticatedUserContext()` → cache hit nhưng vẫn tốn `createClient()` overhead

`getClaims()` validate JWT locally (không gọi Supabase Auth server), giảm từ ~200ms → ~5ms.

## Pre-check
- [x] Verify Supabase project dùng **asymmetric JWT keys** (ECC/RSA) — kết quả hiện tại: anon JWT header là `HS256`, nên `getClaims()` có thể vẫn phải roundtrip

## Implementation Steps
1. [x] Sửa `getAuthenticatedUserContextCached()` trong `lib/auth_utils.ts`:
   - Layout path (default): dùng `getClaimsUser()` thay vì `getVerifiedUser()`
   - Chỉ dùng `getVerifiedUser()` khi `bootstrapProfile: true` (first login)
2. [x] Giữ role guard trong `contracts/layout.tsx`:
   - Hiện tại layout gọi `getAuthenticatedUserContext()` → check `canAccess()`
   - Không bỏ guard vì `(protected)/layout.tsx` chỉ check login/disabled, chưa check module role
3. [x] Verify `withAuth()` (server actions) vẫn giữ `getVerifiedUser()` — không sửa

## Files to Create/Modify
- `lib/auth_utils.ts` — [MODIFY] Tách layout path dùng getClaims, action path giữ getUser
- `app/(protected)/contracts/layout.tsx` — [MODIFY] Simplify hoặc remove duplicate auth

## Trade-offs
⚠️ `getClaims()` không detect user bị ban/xóa cho đến khi JWT hết hạn (max 1 giờ).
Server Actions vẫn dùng `getUser()` nên write operations vẫn an toàn.

## Test Criteria
- [x] Login → navigate `/contracts` → verify data loads
- [x] Logout → navigate `/contracts` → verify redirect to `/login`
- [x] Layout path uses `getClaims()` by default
- [x] JWT pre-check completed: project currently uses `HS256`; switch to asymmetric JWT keys is a Supabase project setting outside repo code
- [x] `npm run build` pass

## Impact
- **-200-400ms** từ auth waterfall

---
Next Phase: → phase-03-thin-server-shell.md
