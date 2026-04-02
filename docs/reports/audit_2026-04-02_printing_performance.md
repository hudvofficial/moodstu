# Deep Performance Audit: /printing Module

## Summary

- 🔴 Critical Issues: 4
- 🟡 Warnings: 4
- 🟢 Suggestions: 2

---

## Query Flow Map

```
/printing page load:
═══════════════════════════════════════════════════════════════

[LAYER 1: SERVER SSR] — page.tsx Promise.all(3 actions)
  ├─ withAuth #1 → createClient() + getUser()
  │  └─ fetchPrintingOrders()
  │     └─ 1 query (printing_orders JOIN labs, contracts, customers)
  │
  ├─ withAuth #2 → createClient() + getUser()
  │  └─ getPrintingOrderStats()
  │     └─ 7 parallel queries (5 COUNT + 2 SELECT total_amount)
  │
  └─ withAuth #3 → createClient() + getUser()
     └─ fetchLabsList()
        └─ 4 parallel queries:
           ├─ labs (all)
           ├─ lab_services (limit 500)      ← KHÔNG CẦN!
           ├─ lab_payments (limit 500)      ← KHÔNG CẦN!
           └─ printing_orders (unpaid)      ← KHÔNG CẦN!

  Subtotal: 3x auth + 12 DB queries

[LAYER 2: CLIENT SWR revalidate on mount] — TOÀN BỘ LẶP LẠI
  ├─ useSWR → fetchPrintingOrders()  → withAuth + 1 query
  ├─ useSWR → getPrintingOrderStats() → withAuth + 7 queries
  └─ useSWR → fetchLabsList()         → withAuth + 4 queries

  Subtotal: 3x auth + 12 DB queries

═══════════════════════════════════════════════════════════════
TỔNG: 6x auth + 24 DB queries per page load
═══════════════════════════════════════════════════════════════
```

---

## 🔴 Critical Issues

### C1: DOUBLE FETCH — SWR revalidate ngay sau SSR

- **File:** [printing-list-page.tsx](file:///C:/Users/Admin/Desktop/Ai/mood%20saas/mood-studio/components/printing/printing-list-page.tsx#L77-L102)
- **Vấn đề:** 3 `useSWR()` hooks không set `revalidateOnMount: false`
- SWR nhận `fallbackData` từ SSR → hiển thị ngay → nhưng vẫn fire fetcher ngay khi mount
- **Hậu quả:** 12 queries + 3 auth calls lãng phí hoàn toàn
- **Impact:** **x2 load time**, x2 server load
- **Cùng lỗi tại:** [lab-list-page.tsx](file:///C:/Users/Admin/Desktop/Ai/mood%20saas/mood-studio/components/printing/labs/lab-list-page.tsx#L47-L63) (2 SWR hooks nữa)

### C2: fetchLabsList() quá nặng — chỉ cần lab names cho filter

- **File:** [lab-queries.ts](file:///C:/Users/Admin/Desktop/Ai/mood%20saas/mood-studio/app/actions/lab-queries.ts#L79-L128)
- **Vấn đề:** `/printing` page chỉ dùng `lab.id` + `lab.lab_name` cho filter dropdown, nhưng `fetchLabsList()` fetch 4 bảng:
  - `labs` — cần ✅
  - `lab_services` (limit 500) — **KHÔNG CẦN** ❌
  - `lab_payments` (limit 500) — **KHÔNG CẦN** ❌
  - `printing_orders` unpaid — **KHÔNG CẦN** ❌
- **Hậu quả:** Transfer ~1000+ rows thay vì ~10 rows
- **Fix:** Đã có `getLabOptions()` (L189-204) — fetch `id, lab_name` — chỉ 1 query

### C3: getPrintingOrderStats SUM vẫn fetch ALL rows

- **File:** [printing-queries.ts](file:///C:/Users/Admin/Desktop/Ai/mood%20saas/mood-studio/app/actions/printing-queries.ts#L222-L231)
- **Vấn đề:** `costResult` + `unpaidCostResult` fetch tất cả `total_amount` → client-side reduce
- Nếu 5000 orders → fetch 5000 rows chỉ để tính 2 con số SUM
- **Fix:** Dùng Supabase RPC `SELECT SUM(total_amount)`

### C4: getLabDebts() fetch ALL unpaid orders — không có limit

- **File:** [printing-queries.ts](file:///C:/Users/Admin/Desktop/Ai/mood%20saas/mood-studio/app/actions/printing-queries.ts#L411-L481)
- **Vấn đề:** Fetch tất cả unpaid `printing_orders` rồi aggregate client-side (giống C3)
- Khi `options.limit` không truyền → vô limit
- **Ảnh hưởng:** `/printing/labs` page gọi hàm này

---

## 🟡 Warnings

### W1: 3x withAuth = 3x createClient + 3x getUser mỗi page load

- **File:** [auth_utils.ts](file:///C:/Users/Admin/Desktop/Ai/mood%20saas/mood-studio/lib/auth_utils.ts#L220-L241)
- **Vấn đề:** Mỗi `withAuth()` tạo client + verify token riêng
- 3 actions song song = 3 auth roundtrips
- **Note:** Next.js có thể cache `cookies()` cùng request, nhưng `createAdminClient()` không cache

### W2: fetchLabsList() + getLabDebts() duplicate query printing_orders

- **Files:** `lab-queries.ts` L98-103 vs `printing-queries.ts` L416-422
- **Vấn đề:** Cả 2 đều query `printing_orders WHERE payment_status = 'chua_thanh_toan'`
- Labs page gọi CẢ 2 hàm → data bị fetch 2 lần

### W3: DB Index khả năng thiếu

- **Bảng:** `printing_orders`
- **Queries filter thường xuyên:** `status`, `payment_status`, `lab_id`, `deleted_at`, `order_date`, `order_code`
- Không tìm thấy migration tạo index → có thể chỉ có PK index
- **Impact:** Mỗi COUNT/filter query phải full table scan

### W4: printing-form-modal nhận full Lab[] chỉ dùng id + lab_name + status

- **File:** [printing-form-modal.tsx](file:///C:/Users/Admin/Desktop/Ai/mood%20saas/mood-studio/components/printing/printing-form-modal.tsx#L104-L111)
- **Vấn đề:** Nhận `labs: Lab[]` (với services, payments, debt) chỉ để render dropdown
- Tự filter `lab.status === "active"` → chỉ cần `LabOption` type

---

## 🟢 Suggestions

### S1: Lazy load PrintingFormModal

- Modal chỉ render khi `showForm = true` nhưng code vẫn được bundle ban đầu
- Có thể `React.lazy()` hoặc `next/dynamic` để tách chunk

### S2: PrintingTable/PrintingCard không cần lab data

- Table/Card components nhận `PrintingOrderRow` đã có `labName` denormalized
- Không cần pass full `labs` array → đã OK, chỉ note

---

## Fix Plan (ưu tiên theo impact)

| #      | Fix                                                                           | Impact       | Effort | Queries saved              |
| ------ | ----------------------------------------------------------------------------- | ------------ | ------ | -------------------------- |
| **F1** | `revalidateOnMount: false` cho 5 SWR hooks (2 pages)                          | **CRITICAL** | 5 min  | **-12 queries**            |
| **F2** | `/printing` page: dùng `getLabOptions()` thay `fetchLabsList()`               | **HIGH**     | 10 min | **-3 queries, -1000 rows** |
| **F3** | RPC `SUM(total_amount)` cho stats + lab debts                                 | **MEDIUM**   | 15 min | **-2 queries**             |
| **F4** | DB indexes cho `printing_orders` (status, payment_status, lab_id, deleted_at) | **MEDIUM**   | 5 min  | query speed↑               |
| **F5** | Lazy load `PrintingFormModal` + `ConfirmDialog`                               | **LOW**      | 5 min  | bundle size↓               |

### Expected result:

```
TRƯỚC:  6x auth + 24 DB queries + ~1500 rows transfer
SAU:    3x auth + 9 DB queries  + ~30 rows transfer
```
