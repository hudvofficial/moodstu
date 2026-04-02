# Audit Report — Module /printing

**Date:** 2026-04-02 | **Scope:** Full Audit (Business Logic + Security + Performance)

---

## Summary

- 🔴 Critical Issues: **5**
- 🟡 Warnings: **9**
- 🟢 Suggestions: **6**

---

## 🔴 Critical Issues (Phải sửa ngay)

### C1. Duplicate Action Files — Legacy `lab-actions.ts` & `lab-sync-actions.ts` vẫn tồn tại song song

- **File:** `app/actions/lab-actions.ts` (113L) + `app/actions/lab-sync-actions.ts` (129L)
- **Vấn đề:** Hai file legacy này chứa code CŨ (V1) **song song** với file mới `lab-mutations.ts` (352L) và `lab-queries.ts` (206L). Cụ thể:
  - `lab-actions.ts` L47: `deleteLab()` thực hiện **HARD DELETE** (`supabase.from("labs").delete()`)
  - `lab-mutations.ts` L117: `deleteLab()` mới thực hiện **SOFT DELETE** (`update({ deleted_at })`)
  - Nếu bất kỳ consumer nào vẫn import từ `lab-actions.ts` → data bị xóa vĩnh viễn thay vì soft delete
  - `lab-sync-actions.ts` L21: `getLabDebts()` trả `LabDebtData` **khác cấu trúc** hoàn toàn so với `printing-queries.ts` L386 `getLabDebts()` → 2 hàm cùng tên, khác output
- **Hậu quả:** Xung đột logic nghiêm trọng, data có thể bị xóa cứng ngoài ý muốn, import nhầm file sẽ gây bug silent
- **Cách sửa:**
  1. Grep toàn bộ consumers import từ `lab-actions.ts` và `lab-sync-actions.ts`
  2. Migrate callers sang `lab-mutations.ts` / `lab-queries.ts` / `printing-queries.ts`
  3. Deprecate và xóa 2 file legacy

---

### C2. `lab-actions.ts` thiếu Zod validation — chỉ dùng `requireName()` thủ công

- **File:** `app/actions/lab-actions.ts` L12-21
- **Vấn đề:** File legacy dùng validation thủ công (`requireId()`, `requireName()`, `requirePositive()`):
  - KHÔNG validate format UUID cho ID → truyền string bất kỳ qua được
  - KHÔNG validate length/format cho `phone`, `address`, `contact_person`
  - KHÔNG sanitize input → tiềm ẩn rủi ro injection qua field text
- **So sánh:** File mới `lab-mutations.ts` ĐÃ dùng Zod schema (`createLabSchema`, `updateLabSchema`) → đúng chuẩn
- **Hậu quả:** Nếu consumer nào vẫn gọi `lab-actions.ts` → bypass toàn bộ validation
- **Cách sửa:** Consolidate vào `lab-mutations.ts` (đã có Zod), xóa `lab-actions.ts`

---

### C3. `lab-sync-actions.ts` bypass `withAuth()` — gọi Supabase trực tiếp

- **File:** `app/actions/lab-sync-actions.ts` L21-22
- **Vấn đề:** `getLabDebts()` **KHÔNG dùng `withAuth()`**, mà tự tạo client:
  ```typescript
  const { createClient } = await import("@/lib/supabase/server");
  const supabase = await createClient();
  ```
  Pattern này:
  - Bypass auth check → user chưa đăng nhập vẫn có thể gọi được
  - Không có error wrapping `ActionResult<T>` → trả raw data, callers không handle được
  - Không nhất quán với convention `withAuth()` của toàn bộ module
- **Hậu quả:** Lộ dữ liệu công nợ lab cho user chưa xác thực
- **Cách sửa:** Dùng version trong `printing-queries.ts` L386 (đã wrapped `withAuth()`), xóa bản cũ

---

### C4. `printing-order-form.tsx` (Contract Detail) — dùng native `<input>` và `<textarea>` thay vì SSOT component

- **File:** `components/contracts/detail/printing-order-form.tsx` L172-228
- **Vấn đề:** File này dùng:
  - L172-198: Native `<input>` elements (5 instances) thay vì `<Input>` component
  - L222-228: Native `<textarea>` thay vì `<Textarea>` component
  - L160: Native `<button>` thay vì `<Button>` component
  - L233-245: Native `<button>` cho form actions thay vì `<Button>`
  - L9: Dùng `SimpleSelect` thay vì `SelectForm` (SSOT)
- **So sánh:** File mới `printing-form-modal.tsx` **ĐÃ** dùng đúng `<Input>`, `<Textarea>`, `<Button>`, `<SelectForm>`, `<CurrencyInput>` → Gold Standard
- **Hậu quả:** Inconsistency giữa 2 entry points cùng tạo đơn in, vi phạm SSOT design system
- **Cách sửa:** Migrate `printing-order-form.tsx` sang dùng SSOT components như `printing-form-modal.tsx`

---

### C5. `printing-actions.ts` chứa `updateReservationStatus()` thuộc domain DRESS — mixed domain concern

- **File:** `app/actions/printing-actions.ts` L27-64
- **Vấn đề:** Function `updateReservationStatus()` thao tác trên tables `dress_reservations` và `dresses` — hoàn toàn thuộc domain costume/dress, **KHÔNG liên quan** printing
  - Spec §8D ghi rõ: "This function belongs to dress domain, OUT OF SCOPE for printing module"
  - Function giữ lại inline vì backward-compat (bridge strategy), nhưng:
    - L35-42: Cập nhật `dress_reservations` không validate `status` qua Zod
    - L46-58: Cập nhật `dresses.status = "available"` KHÔNG check trạng thái hiện tại → race condition nếu 2 user trả đồng thời
    - L47-51: Fetch lại reservation SAU KHI đã update → nếu update fail, fetch vẫn chạy (wasted query)
- **Hậu quả:** Business logic sai khi concurrent updates, thiếu validation

---

## 🟡 Warnings (Nên sửa)

### W1. `printing-queries.ts` L162-163 — ilike search không sanitize wildcard characters

- **File:** `app/actions/printing-queries.ts` L162-163
- **Vấn đề:** `query = query.ilike("order_code", \`%${filters.search.trim()}%\`)`— input chứa`%`hoặc`\_` sẽ trở thành wildcard patterns trong SQL LIKE
- **Hậu quả:** User gõ `%` sẽ match TẤT CẢ records (bypassing filter), `_` match 1 ký tự bất kỳ
- **Cách sửa:** Escape `%` → `\%` và `_` → `\_` trước khi truyền vào `ilike()`

### W2. `getContractOptions()` — 3 sequential queries thay vì 1 query

- **File:** `app/actions/printing-queries.ts` L279-383
- **Vấn đề:** Search contract tạo tới 3 query sequential:
  1. L312: Search `contracts` by `contract_code`
  2. L325: Search `customers` by `full_name`
  3. L339: Fetch `contracts` by `customer_id`
  4. L360: Fetch final contracts with customer info
- **Hậu quả:** Mỗi lần user gõ ký tự (debounced 300ms) → 3-4 roundtrips DB
- **Cách sửa:** Dùng Supabase `or()` filter hoặc RPC function để gom 1 query duy nhất

### W3. `getPrintingOrderStats()` — tải TOÀN BỘ rows để đếm client-side

- **File:** `app/actions/printing-queries.ts` L191-232
- **Vấn đề:** `.select("status, total_amount, payment_status")` trả VỀ TẤT CẢ rows (không limit), rồi đếm bằng `rows.forEach()`
- **Hậu quả:** Khi có 1000+ đơn in → tải toàn bộ 1000 rows về server action để đếm, lãng phí bandwidth + memory. Ngoài ra còn bị Supabase PostgREST silent truncation ở 1000 rows (Lesson #83) → stats sai khi vượt 1000 đơn
- **Cách sửa:** Tạo RPC function `get_printing_stats()` dùng `COUNT(*) ... GROUP BY status` để DB tính

### W4. `fetchLabsList()` — 4 parallel queries nhưng thiếu `deleted_at` filter cho `lab_services` và `lab_payments`

- **File:** `app/actions/lab-queries.ts` L79-128
- **Vấn đề:**
  - L93: `lab_services` query KHÔNG filter `is("deleted_at", null)` → nếu lab_services có soft delete thì trả cả deleted records
  - L97: `lab_payments` query KHÔNG filter → trả toàn bộ payments history unbounded
  - Cả 4 queries đều KHÔNG có `.limit()` → nguy cơ tải quá nhiều data khi scale
- **Cách sửa:** Thêm limit hợp lý, filter `deleted_at` nếu table hỗ trợ

### W5. `autoCreatePrintingExpense()` — tìm category bằng `.ilike("name", "%in an%")` fuzzy

- **File:** `app/actions/printing-mutations.ts` L48-52
- **Vấn đề:** Dùng fuzzy matching `ilike("name", "%in an%")` để tìm expense category:
  - Có thể match sai category nếu có categories khác chứa "in an"
  - Nếu category bị rename → auto-expense mất category mapping (silent fail, gán `null`)
- **Cách sửa:** Dùng category ID cố định (config) hoặc exact match, không dùng fuzzy text

### W6. `printing-form-modal.tsx` — 482 lines, vượt ngưỡng 250 lines

- **File:** `components/printing/printing-form-modal.tsx`
- **Vấn đề:** File dài 482 lines, vượt quy chuẩn max 250 lines/file (Lesson #7)
- **Cách sửa:** Tách items editor thành `printing-items-editor.tsx` riêng, giữ modal wrapper ≤ 200 lines

### W7. `formatCurrency()` duplicate 3 lần

- **Files:**
  - `printing-table.tsx` L23-25
  - `printing-card.tsx` L16-18
  - `printing-form-modal.tsx` L81-83
- **Vấn đề:** Cùng 1 function format currency nhưng copy-paste 3 lần, có thể trở thành inconsistent
- **Cách sửa:** Tách thành shared util trong `lib/utils.ts` hoặc `lib/format.ts`

### W8. `updatePrintingOrder()` không revalidate contract path

- **File:** `app/actions/printing-mutations.ts` L217
- **Vấn đề:** Chỉ `revalidatePath("/printing")` mà KHÔNG revalidate `/contracts/${contractId}` — khác với `createPrintingOrder` (L145-148) và `updatePrintingOrderStatus` (L286-287) đều revalidate contract path
- **Hậu quả:** Sửa đơn in xong, trang contract detail vẫn hiển thị data cũ
- **Cách sửa:** Thêm `revalidatePath(\`/contracts/${contractId}\`)`— cần fetch`contract_id` từ order hiện tại

### W9. SWR cache keys cho printing không có trong `lib/swr.ts`

- **File:** `lib/swr.ts`
- **Vấn đề:** Grep `swr.ts` cho `printingOrders|printingStats|printingDetail|labDebts` → **0 kết quả**. Cache keys được dùng trong `printing-list-page.tsx` (L78, L87) qua `cacheKeys.printingOrders()`, `cacheKeys.printingStats()` nhưng không thấy trong swr.ts → khả năng keys được define nhưng ở đâu đó khác, hoặc runtime error
- **Cách sửa:** Verify cache keys có tồn tại trong `lib/swr.ts`, nếu không thì append theo spec §3D

---

## 🟢 Suggestions (Tùy chọn)

### S1. `lab-sync-actions.ts` L76-112 — `autoCreatePrintingOrder()` dùng `defaultLab` first active

- Tự động chọn lab đầu tiên có status `active` → không phải lab user muốn
- Khuyến nghị: để `lab_id = null` và cho user chọn sau

### S2. `printing-queries.ts` L146 — dùng `count: "estimated"` thay vì `"exact"`

- Đã dùng `estimated` count → tốt cho performance, nhưng pagination count có thể lệch vài rows
- Nếu cần chính xác hơn sau này → switch sang `"exact"` với index

### S3. `printing-order-form.tsx` (Contract Detail) — không dùng `CurrencyInput` cho đơn giá

- L193-196: Dùng native `<input type="number">` cho unitPrice → user nhập raw number
- `printing-form-modal.tsx` đã dùng `<CurrencyInput>` → experience inconsistent

### S4. `printing-mutations.ts` — `buildOrderCode()` dùng `Date.now()` → collision risk

- L24-26: `IN-${Date.now().toString(36).toUpperCase()}` — nếu 2 đơn tạo cùng ms → trùng code
- Khuyến nghị: thêm random suffix hoặc dùng DB sequence

### S5. `lab-sync-actions.ts` — `syncAlbumStatus()` chỉ audit log nhưng KHÔNG thực sự update contract status

- L116-128: Check tất cả đơn in `da_nhan` → chỉ ghi audit log, không update field nào trên contract
- Nếu mục đích là đánh dấu contract "đã giao album" → cần update column tương ứng

### S6. `printing-actions.ts` L15-17 — `createPrintingOrder()` wrapper không add value

- Chỉ re-export `createPrintingOrderImpl(rawData)` mà không thêm logic gì → redundant layer
- Bridge strategy OK theo spec, nhưng nên document rõ là bridge file

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│ Legacy Files (CẦN CLEANUP)                                  │
│ ├── lab-actions.ts (113L) — HARD DELETE, no Zod ❌           │
│ └── lab-sync-actions.ts (129L) — bypass withAuth ❌          │
├─────────────────────────────────────────────────────────────┤
│ New Files (V2 Standard ✅)                                   │
│ ├── printing-mutations.ts (340L) — Zod + withAuth + audit   │
│ ├── printing-queries.ts (456L) — withAuth + pagination      │
│ ├── lab-mutations.ts (352L) — Zod + withAuth + audit        │
│ └── lab-queries.ts (206L) — withAuth + parallel queries     │
├─────────────────────────────────────────────────────────────┤
│ Bridge File                                                  │
│ └── printing-actions.ts (65L) — re-exports + dress domain   │
├─────────────────────────────────────────────────────────────┤
│ UI Components (V2 Standard ✅)                               │
│ ├── printing-list-page.tsx (272L) — SWR + SSR hybrid         │
│ ├── printing-form-modal.tsx (482L ⚠️ > 250L)                │
│ ├── printing-table.tsx (111L) — SSOT components              │
│ ├── printing-card.tsx (78L) — mobile cards                   │
│ ├── printing-filters.tsx (106L) — TabsFilter + SelectPill    │
│ └── printing-stats-bar.tsx (71L) — StatsBar                  │
├─────────────────────────────────────────────────────────────┤
│ Legacy UI (CẦN UPDATE)                                       │
│ └── printing-order-form.tsx (251L) — native elements ❌      │
└─────────────────────────────────────────────────────────────┘
```

---

## Next Steps

1. **Ưu tiên cao:** Cleanup legacy files (C1, C2, C3) — xóa `lab-actions.ts` và `lab-sync-actions.ts`
2. **Ưu tiên cao:** Migrate `printing-order-form.tsx` sang SSOT components (C4)
3. **Ưu tiên trung bình:** Fix performance issues (W2, W3, W4)
4. **Ưu tiên trung bình:** Fix search sanitization (W1) và revalidation gap (W8)
5. **Ưu tiên thấp:** Refactor code quality (W6, W7, S4)
