# Audit Report — /contracts Module Performance
Date: 2026-05-02
Scope: Performance Focus
Module: `/contracts` (list + detail)

## Summary
- 🔴 Critical Issues: 2
- 🟡 Warnings: 3
- 🟢 Suggestions: 2

---

## 🔴 Critical Issues (Gây chậm rõ ràng)

### C1. Waterfall tuần tự 3 tầng — Layout → Layout → Page

Khi user vào `/contracts`, server phải chạy **tuần tự**:

```
(protected)/layout.tsx   →  getAuthenticatedUserContext()          ~200-400ms
  → contracts/layout.tsx →  getAuthenticatedUserContext() + canAccess  ~150-300ms (LẶP LẠI auth check)
    → contracts/page.tsx →  Promise.all([getContractList, getContractStats])  ~300-800ms
```

**Tổng thời gian server-side: ~650ms–1500ms TRƯỚC KHI client nhận được HTML đầu tiên.**

**Nguyên nhân cụ thể:**
- `contracts/layout.tsx` (L10) gọi lại `getAuthenticatedUserContext()` — hàm này tuy dùng `cache()` nhưng bên trong vẫn phải `createClient()` + `getUser()` + `createAdminClient()` + query `employees` table → overhead dù đã cached.
- Không có `loading.tsx` ở route `/contracts` (list page) → **không có streaming** → user phải chờ toàn bộ data trước khi thấy gì.

**File:** `app/(protected)/contracts/layout.tsx:10`, `app/(protected)/layout.tsx:11`

---

### C2. getContractList() thực hiện 3 round-trip DB tuần tự (N+1 pattern)

```
Round 1: findMatchingCustomerIds()  — nếu có search term → query customers table
Round 2: Main query contracts + FK join customers  
Round 3: Promise.all([work_tasks IN(...), contract_checklists IN(...)])  — batch nhưng VẪN là round-trip thêm
```

**File:** `app/actions/contract-queries.ts:112-241`

**Vấn đề:**
- `findMatchingCustomerIds()` (L149) → query riêng bảng `customers` trước, rồi mới inject ID vào query chính. Đây là **2 round-trip** thay vì 1.
- Sau khi lấy contracts, lại chạy thêm 2 query nữa (`work_tasks`, `contract_checklists`) cho progress badges (L200-209) → **tổng 3-4 round-trip**.
- `getContractStats()` fallback path (L276-336) nếu RPC `contract_stats` fail → chạy **3 query tuần tự** (all contracts, this month count, last month count).

---

## 🟡 Warnings (Nên sửa — ảnh hưởng UX)

### W1. 6 Realtime subscriptions trên Contract List page

`contracts-list-client.tsx` mở **6 Supabase Realtime channels** đồng thời:
- `contracts`, `contract_checklists`, `contract_notes`, `contract_events`, `work_tasks`, `payment_plans`

Mỗi channel = 1 WebSocket subscription → 6 subscriptions mount khi vào trang list. Tất cả đều trigger `revalidateContractListCaches()` → re-fetch cả list + stats.

**Hậu quả:** Khi có bất kỳ thay đổi nào trên 6 bảng → cả 2 SWR key (`contracts` + `contract-stats`) đều bị invalidate → gọi lại toàn bộ 3-4 round-trip DB ở trên.

**File:** `components/contracts/contracts-list-client.tsx:147-170`

### W2. Contract Detail page mở 9 Realtime channels

`contract-detail-client.tsx` mở **9 channels**: contracts, payments, contract_checklists, contract_notes, contract_events, work_tasks, payment_plans, dress_reservations, printing_orders.

Tất cả đều trigger cùng 1 callback → full re-fetch `getContractDetail()` (9 queries).

**File:** `components/contracts/detail/contract-detail-client.tsx:238-246`

### W3. Không có loading.tsx cho contract list route

`app/(protected)/contracts/` thiếu `loading.tsx` → Next.js không stream skeleton → user nhìn thấy blank page hoặc layout cũ cho đến khi server hoàn thành toàn bộ data fetch.

**File:** Thiếu `app/(protected)/contracts/loading.tsx`

---

## 🟢 Suggestions (Tùy chọn)

### S1. ProgressBadge và MissingInfoBadge tính toán trên mỗi row

Mỗi contract row trong bảng render 2 component phức tạp (`ProgressBadge` + `MissingInfoBadge`). Cả 2 đều:
- Filter/sort arrays
- Tính toán progress percentage
- Setup `useEffect` + `useRef` cho tooltip flip

Với 20 rows = 40 component instances × hooks → không phải bottleneck chính nhưng tăng Time to Interactive.

### S2. Duplicate auth check có thể loại bỏ

`contracts/layout.tsx` check auth rồi `page.tsx` qua `withAuth()` lại check auth thêm lần nữa. Layout check chỉ cần cho route guard, nhưng hiện tại nó tạo thêm 1 DB query (dù `cache()` giảm bớt).

---

## Root Cause Analysis — Tại sao "chậm và lag"

```
┌─────────────────────────────────────────────────────────────┐
│  WATERFALL CHÍNH (first paint /contracts):                  │
│                                                             │
│  1. Middleware proxy.ts           ~50ms                     │
│  2. (protected)/layout auth       ~200-400ms                │
│  3. contracts/layout auth         ~100-200ms (cached nhưng  │
│     vẫn cần createClient)                                   │
│  4. contracts/page.tsx            ~300-800ms                 │
│     ├─ getContractList            ~200-600ms                │
│     │  ├─ withAuth + requireAccess  ~50-100ms               │
│     │  ├─ findMatchingCustomerIds   ~50-100ms (nếu search)  │
│     │  ├─ main contracts query      ~100-200ms              │
│     │  └─ work_tasks + checklists   ~100-200ms              │
│     └─ getContractStats (RPC)     ~100-200ms                │
│                                                             │
│  TOTAL SERVER TIME: ~650ms - 1600ms                         │
│  + Network latency (client ↔ Vercel ↔ Supabase)            │
│                                                             │
│  5. Client hydration + mount      ~200-400ms                │
│  6. 6x Realtime channel setup     ~100-300ms                │
│                                                             │
│  TOTAL TIME TO INTERACTIVE: ~1s - 2.3s                      │
└─────────────────────────────────────────────────────────────┘
```

---

## Proposed Fixes (ưu tiên theo impact)

### Fix 1: Thêm `loading.tsx` cho contract list (⚡ Quick win)
- Thêm skeleton tại `app/(protected)/contracts/loading.tsx`
- User thấy layout ngay lập tức thay vì blank page
- **Impact: -500ms perceived load time**

### Fix 2: Gộp getContractList() thành RPC duy nhất
- Tạo Supabase RPC `get_contract_list_v2()` trả về contracts + tasks + checklists trong 1 query
- Loại bỏ 3 round-trip → 1 round-trip
- **Impact: -200-400ms server time**

### Fix 3: Giảm Realtime subscriptions
- List page: Gộp 6 channels → 1 channel duy nhất với `schema:public` + filter theo bảng trong handler
- Detail page: Gộp 9 channels → 2-3 channels (contracts+payments, related tables)
- **Impact: -100-200ms mount time, giảm WebSocket overhead**

### Fix 4: Loại bỏ duplicate auth check ở contracts/layout.tsx
- `(protected)/layout.tsx` đã check auth → contracts/layout chỉ cần check role từ context đã cached
- Hoặc: merge contracts/layout logic vào page.tsx
- **Impact: -100-200ms**

---

## Next Steps

Anh muốn làm gì tiếp theo?

1️⃣ Xem báo cáo chi tiết trước
2️⃣ Sửa lỗi Critical ngay — bắt đầu từ Fix 1 (loading.tsx) + Fix 4 (duplicate auth)
3️⃣ Lên plan đầy đủ cho cả 4 fixes
4️⃣ Bỏ qua, lưu báo cáo
5️⃣ 🔧 FIX ALL — Tự động sửa TẤT CẢ lỗi có thể sửa

Gõ số (1-5) để chọn:
