# Phase 03: PWA Hardening (Supabase REST NetworkFirst)
Status: ⬜ Pending
Dependencies: Không (độc lập)

## Objective
Chuyển Supabase REST API caching rule từ `NetworkOnly` → `NetworkFirst` (5s timeout).
Khi mạng chậm/mất → trả data cũ từ Service Worker cache thay vì blank screen.

## Current Problem (V2)
```js
// next.config.ts — RULE 4 hiện tại:
{
  urlPattern: /^https:\/\/.*\.supabase\.co\/rest\/.*/i,
  handler: "NetworkOnly",  // ← Mạng mất = app chết
}
```

## V1 Solution (Proven)
```js
{
  urlPattern: /^https:\/\/.*\.supabase\.co\/rest\/.*/i,
  handler: "NetworkFirst",
  options: {
    cacheName: "supabase-api",
    networkTimeoutSeconds: 5,
    expiration: { maxEntries: 200, maxAgeSeconds: 60 * 60 },
  },
}
```

## Requirements
### Functional
- [ ] Mạng tốt → lấy data mới từ server (NetworkFirst behavior)
- [ ] Mạng chậm > 5s → trả data cũ từ SW cache
- [ ] Mạng mất hoàn toàn → trả data cũ từ SW cache (nếu có)

### Non-Functional
- [ ] Cache tối đa 200 entries, expire sau 1 giờ
- [ ] Timeout 5 giây trước khi fallback cache
- [ ] Auth endpoints VẪN là NetworkOnly (đã đúng)

## Implementation Steps
1. [ ] Mở `next.config.ts`
2. [ ] Tìm RULE 4 (Supabase REST API)
3. [ ] Đổi `handler: "NetworkOnly"` → `handler: "NetworkFirst"`
4. [ ] Thêm `options` block:
   ```js
   options: {
     cacheName: "supabase-api",
     networkTimeoutSeconds: 5,
     expiration: { maxEntries: 200, maxAgeSeconds: 60 * 60 },
   }
   ```
5. [ ] Verify: Auth rule (RULE 1) vẫn là `NetworkOnly` — KHÔNG thay đổi

## Files to Create/Modify
- `next.config.ts` — Chỉnh 1 rule trong `runtimeCaching`

## Test Criteria
- [ ] Build thành công
- [ ] F12 > Application > Service Worker > Cache Storage → thấy `supabase-api`
- [ ] Simulate offline → app vẫn hiện data cũ (không trắng trơn)

---
Next Phase: Phase 04 — SWR Persist Layer
