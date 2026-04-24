# Phase 04: SWR Persist Layer (IndexedDB Cold-Start Survival)
Status: ⬜ Pending
Dependencies: Không (độc lập, nhưng nên làm sau Phase 01-03)

## Objective
Tạo IndexedDB persist layer cho SWR cache, tương tự V1 dùng React Query + idb-keyval.
Khi user mở app lần 2+ → data cũ hiện ngay 0ms từ IndexedDB → SWR fetch ngầm update.

## Architecture Difference
```
V1: React Query → PersistQueryClient → IndexedDB (built-in support)
V2: SWR → ??? → IndexedDB (phải tự xây)
```

SWR không có built-in persist như React Query. Em sẽ xây middleware pattern:
```
App load → Hydrate SWR cache từ IndexedDB → Render UI ngay
         → SWR revalidate ngầm → Update IndexedDB
```

## Requirements
### Functional
- [ ] Cold-start: data cũ từ IndexedDB hiện ngay (<50ms), sau đó SWR revalidate
- [ ] Chỉ persist whitelist modules (dashboard, contracts, employees, services, dresses...)
- [ ] Không persist: auth tokens, search results, temporary data
- [ ] `navigator.storage.persist()` — bảo vệ IndexedDB khỏi bị browser xóa

### Non-Functional
- [ ] Dùng `idb-keyval` (lightweight, proven, V1 đã dùng)
- [ ] Max persist age: 24 giờ
- [ ] Graceful fallback khi IndexedDB unavailable (Safari private mode)
- [ ] Không block initial render

## Implementation Steps

### 1. Install idb-keyval
1. [ ] `npm install idb-keyval`

### 2. Tạo SWR IndexedDB Persist Provider
2. [ ] Tạo file `lib/swr-persist.ts`:
   - `PERSIST_WHITELIST` — danh sách cache key prefix được persist
   - `saveToIDB(key, data)` — lưu vào IndexedDB (debounced)
   - `loadFromIDB()` → `Map<string, any>` — load tất cả data
   - `clearIDB()` — xóa tất cả (dùng khi logout)

### 3. Tạo SWR Persist Init Component
3. [ ] Tạo file `components/providers/swr-persist-init.tsx`:
   - Client component, render null
   - `useEffect` → load IndexedDB → `mutate(key, data, { revalidate: false })` cho mỗi entry
   - Sau hydrate xong → enable persist listener
   - `navigator.storage.persist()` call

### 4. Tạo SWR onSuccess callback global
4. [ ] Update `lib/swr.ts`:
   - Thêm `onSuccess` vào `swrConfig`:
     ```js
     onSuccess: (data, key) => {
       if (shouldPersist(key)) saveToIDB(key, data);
     }
     ```

### 5. Integrate vào layout
5. [ ] Mở `app/layout.tsx`
6. [ ] Import và render `<SWRPersistInit />` (lazy, render null)

### 6. Cleanup on logout
7. [ ] Update `app/actions/auth.ts` — logout function: gọi `clearIDB()`

## Files to Create/Modify
- `lib/swr-persist.ts` — [NEW] IndexedDB persist logic
- `components/providers/swr-persist-init.tsx` — [NEW] Hydrate component
- `lib/swr.ts` — Thêm onSuccess persist callback
- `app/layout.tsx` — Render SWRPersistInit
- `app/actions/auth.ts` — Cleanup on logout
- `package.json` — Thêm `idb-keyval`

## Test Criteria
- [ ] Mở app → load data → đóng tab → mở lại → data hiện ngay (không loading spinner)
- [ ] F12 > Application > IndexedDB → thấy entries
- [ ] Logout → IndexedDB cleared
- [ ] Safari Private mode → app vẫn hoạt động bình thường (fallback graceful)

## Risk Assessment
- **Low Risk:** `idb-keyval` rất nhẹ, proven library
- **Medium Risk:** SWR không có native persist support → phải tự xây. Cần test kỹ edge cases (race condition hydrate vs revalidate)
- **Mitigation:** Dùng `revalidate: false` khi hydrate → SWR tự revalidate sau

---
Next Phase: Phase 05 — Smart Prefetch on Hover
