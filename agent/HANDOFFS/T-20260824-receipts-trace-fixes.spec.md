# T-20260824 — `/finance/receipts`: sửa lỗi phân loại "Cọc" + nút Sửa vỡ trên phiếu bán vật tư + 2 lỗi UI nhỏ

**Owner:** claude (fallback, user chỉ định "render thật trước, rồi viết spec sửa hết") · **Trạng thái:** đã trace + render-verify xong, viết spec để implement
**Module:** tai-chinh (receipts) · **Bối cảnh:** user hỏi "trace /finance/receipts đã tối ưu chưa" — trace phát hiện 1 bug tiền thật đang sống (không phải nợ dữ liệu cũ) + 1 luồng UI luôn thất bại + 2 lỗi hiển thị nhỏ. Không đổi data model, không mở ADR riêng — chỉ sửa bug trong hạ tầng đã có.

**Locks:**
- `supabase/migrations/20260824140000_fix_receipt_documents_deposit_classification.sql` (mới)
- `components/finance/receipts/receipt-row-actions.tsx`
- `components/finance/receipts/receipt-mobile-swipe-card.tsx`
- `app/(protected)/finance/receipts/[id]/page.tsx`
- `components/finance/receipts/receipt-detail-modal.tsx`
- `app/(protected)/finance/receipts/page.tsx`

---

## 0. Bằng chứng đã verify thật (không phải suy đoán)

Tất cả bên dưới đã verify bằng **gọi thẳng RPC production + render Playwright thật trên `stu.moodwedding.com`** (seed 1 tài khoản E2E rồi xóa), không chỉ đọc code.

### Bug 1 [HIGH — đang sống, ảnh hưởng tiền thật]: "Cọc hợp đồng" bị phân loại nhầm thành "Thu hợp đồng"

**Root cause:** RPC `finance_receipt_documents` (đường đọc thật của `/finance/receipts`) phân loại `receipt_type` bằng:
```sql
WHEN lower(COALESCE(p.payment_stage, '')) LIKE '%coc%' THEN 'contract_deposit'
```
Nhưng `payments.payment_stage` **luôn được ghi bằng nhãn tiếng Việt có dấu** qua `payment_stage_display_label_v2()` — mọi khoản cọc mới đều ghi `'Cọc'`. `lower('Cọc') = 'cọc'` (ký tự `ọ` có dấu) **không khớp** `LIKE '%coc%'` (ASCII). Đây **không phải nợ dữ liệu cũ** — RPC ghi (`process_contract_payment_v2`) và RPC đọc (`finance_receipt_documents`) đã lệch nhau từ khi cả hai được viết, và lệch này tiếp diễn với **mọi khoản cọc mới thu**.

**Verify:**
- Gọi thẳng RPC: `select receipt_type, count(*) from finance_receipt_documents(null,null,null,null,500,0) where source_table='payments' group by 1` → `contract_deposit: 1` (chỉ 1 dòng cũ dùng key ASCII `dat_coc`), `contract_payment: 48` (gồm cả 17 khoản `payment_stage='Cọc'` thật, tổng **21.800.000đ**).
- Render thật tab "Cọc hợp đồng" tháng 5/2026 (tháng có dữ liệu thật): **chỉ hiện 1/1** (dòng `dat_coc` cũ), trong khi DB có **4 khoản Cọc thật trong tháng đó** (HĐ-2026-0006/0008/0009/0013, tổng 3.100.000đ) — tất cả nằm lẫn trong tab "Thu hợp đồng" (11/11), đúng badge "THANH TOÁN HỢP ĐỒNG" sai.
- **Phát hiện thêm khi render:** trang chi tiết/in của đúng khoản đó (`/finance/receipts/payment:<id>` và `/print`) lại hiện **ĐÚNG** "Cọc hợp đồng" — vì `getReceiptDetail` dùng hàm JS `paymentReceiptType()` (có strip dấu đúng), khác hẳn RPC dùng cho list. Tức cùng 1 bản ghi, 2 nơi trong cùng 1 app **tự mâu thuẫn nhau về loại phiếu**.

**Đã có sẵn hàm chuẩn hoá đúng trong DB, chỉ là RPC không dùng:** `payment_stage_key_v2(p_stage)` — dùng `translate()` để strip dấu tiếng Việt đúng chuẩn (đang được chính `process_contract_payment_v2` dùng để ghi), trả `'deposit'` cho mọi biến thể của "cọc". Đây chính là hàm `finance_receipt_documents` phải gọi thay vì tự viết `LIKE '%coc%'` (nguyên tắc tái dùng, không viết lại logic đã có).

### Bug 2 [HIGH — luồng chết]: nút "Sửa" trên phiếu "Bán vật tư" luôn thất bại

**Root cause:** `isContractGenerated` (điều kiện disable nút Sửa) chỉ check `source_table === "payments"` — không check `receipt_type === "sale_receipt"`. Trong khi server (`app/actions/receipt-actions.ts:208-210`, đã có sẵn, không đổi) chặn cứng:
```ts
if (currentReceipt.receipt_type === "sale_receipt") {
  throw new Error("Phiếu bán vật tư phải được xử lý từ luồng kho để giữ khớp giá bán, tồn kho và giá vốn.");
}
```

**Verify (render thật, click thật, an toàn — server chặn TRƯỚC khi ghi bất kỳ gì):**
- Bấm "Sửa" trên 1 phiếu bán vật tư thật → modal "Cập nhật phiếu thu" mở ra, nhưng **"Loại phiếu" hiện "Chọn..." (rỗng)** — không tự chọn "Bán vật tư", không có phần "Vật tư bán ra" nào cả (form hiện như đang sửa 1 phiếu thu khác thường).
- Bấm "Cập nhật phiếu thu" → chặn ngay ở **client-side validation**, còn sớm hơn cả lỗi server dự đoán ban đầu: toast đỏ **"Dữ liệu không hợp lệ: Loại phiếu thu không được để trống, Invalid input"**. Admin không có đường nào đi tiếp từ màn hình này.
- Trên mobile, cùng lỗi: swipe-action "Sửa" cũng không bị chặn cho phiếu bán vật tư.
- Nút "Xóa" hoạt động đúng (đã verify không đổi — trace code xác nhận DB trigger tự hoàn tồn kho khi xóa phiếu bán vật tư, không đụng tới).

### Bug 3 [LOW]: lộ tiền tố `payment:` trong dòng "ID:" ở trang chi tiết + modal chi tiết

**Verify render thật:** mở `/finance/receipts/payment:<id>` → dòng footer hiện `ID: payment:3eb06f8d • Ref: PT-202605-3EB06F8D • Created: ...` — biến `rawId` (đã strip tiền tố, dùng đúng chỗ khác trong cùng file) tồn tại sẵn nhưng dòng "ID:" lại dùng `receipt.id` thô. Trang in (`print-receipt-client.tsx`) đã làm đúng (dùng id đã strip) — chỉ 2 chỗ này sai.

### Bug 4 [LOW]: `bankInfo` không được truyền server-side vào `/finance/receipts`, gây nháy "chưa cấu hình QR" đầu trang

`app/(protected)/finance/receipts/page.tsx` không gọi `getStudioInfo()` (trong khi trang chi tiết `[id]/page.tsx` đã gọi) nên `<ReceiptsClient bankInfo=...>` không có SSR fallback — phải chờ 1 lượt fetch client-side (`useSWR`) mới có thông tin ngân hàng cho modal QR.

## 1. Đã trace nhưng KHÔNG sửa trong task này (ghi lại để không lặp trace)

- **"Người lập" trống trên phiếu in** (`print-receipt-client.tsx`): field có khai báo nhưng `getReceiptDetail` chưa từng join `created_by` → tên người lập. Cần join mới `employees.auth_user_id = created_by` (chưa tồn tại pattern này ở đâu khác trong finance actions — kể cả `print-expense-client.tsx` không có field này). Các dòng ký tên khác (Người nộp/Kế toán/Thủ quỹ) vốn cũng để trống theo thiết kế (ký tay), nên đây là mức độ thấp — để lại cho task riêng nếu cần.
- **`contract_adjustment` thiếu trong dropdown tạo/sửa phiếu** (`receipt-form-modal.tsx`): hiện không có đường thực tế nào tạo `receipts` row với type này (loại này chỉ sinh qua `payments` từ luồng hợp đồng), nên không phải lỗi đang sống. Cần quyết định sản phẩm (có cho tạo tay "Phát sinh" từ đây không?) trước khi thêm — không tự thêm.
- **JS fallback union trong `fetchReceipts`** (chỉ chạy khi RPC `finance_receipt_documents` bị mất — hiện đang sống trên DB) cắt bớt dữ liệu ở mốc 1000 dòng/bảng trước khi lọc theo tháng. Dữ liệu hiện quá nhỏ (49+4 dòng) để phát tác, và đường này hiện không chạy. Không sửa.
- **Tab filter "Bán vật tư" từng nghi có bug** khi test tự động (thấy 1 dòng "Thanh toán hợp đồng" dưới tab này) — điều tra lại: đây là **race condition trong script test** (click quá nhanh trước khi trang settle), không phải bug thật. Verify lại sạch bằng RPC trực tiếp (`finance_receipt_documents(8,2026,'sale_receipt',...)` → rỗng, đúng) và render lại có chờ đủ → đúng 0/0. Ghi lại để không báo nhầm.

## 2. Fix

### 2.1 Migration mới: `supabase/migrations/20260824140000_fix_receipt_documents_deposit_classification.sql`

`CREATE OR REPLACE FUNCTION public.finance_receipt_documents(...)` — giữ nguyên chữ ký + toàn bộ phần còn lại, chỉ đổi đúng nhánh CASE phân loại payments:

```sql
-- Trước:
CASE
  WHEN COALESCE(p.is_contract_adjustment, false) THEN 'contract_adjustment'
  WHEN lower(COALESCE(p.payment_stage, '')) LIKE '%coc%'
    OR lower(COALESCE(p.payment_stage, '')) IN ('deposit', 'contract_deposit')
    THEN 'contract_deposit'
  ELSE 'contract_payment'
END AS receipt_type,

-- Sau:
CASE
  WHEN COALESCE(p.is_contract_adjustment, false) THEN 'contract_adjustment'
  WHEN public.payment_stage_key_v2(p.payment_stage) = 'deposit' THEN 'contract_deposit'
  ELSE 'contract_payment'
END AS receipt_type,
```
Lý do dùng `payment_stage_key_v2` thay vì tự vá thêm điều kiện: đây là hàm đã tồn tại, đã strip dấu tiếng Việt đúng chuẩn (`translate()`), và chính là hàm `process_contract_payment_v2` dùng để ghi `payment_stage` — dùng lại đảm bảo đọc/ghi luôn đồng bộ về sau, không phải vá từng biến thể chữ.

Migration chạy qua `node scripts/migrate-direct.mjs <file>`; `CREATE OR REPLACE` hợp lệ vì không đổi `RETURNS TABLE(...)`.

### 2.2 `receipt-row-actions.tsx` — chặn nút Sửa cho phiếu bán vật tư

```ts
// Trước:
const isContractGenerated = receipt.source_table === "payments" || receipt.id.startsWith("payment:");

// Sau:
const isContractGenerated = receipt.source_table === "payments" || receipt.id.startsWith("payment:");
const isSaleReceipt = receipt.receipt_type === "sale_receipt";
const isEditLocked = isContractGenerated || isSaleReceipt;
```
Đổi nút Sửa dùng `isEditLocked` thay vì `isContractGenerated`, và `title`:
```tsx
title={isSaleReceipt ? "Phiếu bán vật tư — sửa từ Vật tư" : "Chỉnh sửa"}
```
(Delete/Xóa giữ nguyên `isContractGenerated` — không đổi, vì xóa phiếu bán vật tư vẫn hoạt động đúng qua DB trigger.)

### 2.3 `receipt-mobile-swipe-card.tsx` — cùng logic cho swipe-action "Sửa"

```ts
const isContractGenerated = receipt.source_table === "payments" || receipt.id.startsWith("payment:");
const isEditLocked = isContractGenerated || receipt.receipt_type === "sale_receipt";
```
`rightActions` hiện đang rẽ nhánh nhị phân theo `isContractGenerated` (`void`-only vs `edit+delete`) — sửa thành 3 nhánh: `isContractGenerated` → chỉ "Hủy" (không đổi); `isEditLocked && !isContractGenerated` (tức sale_receipt) → chỉ "Xóa" (bỏ "Sửa"); còn lại → "Sửa" + "Xóa" như cũ.

### 2.4 `[id]/page.tsx` dòng 285 + `receipt-detail-modal.tsx` dòng 254 — dùng `rawId` thay vì `receipt.id` thô

```tsx
// Trước:
ID: {receipt.id.split("-")[0]} • Ref: {refCode} • ...

// Sau:
ID: {rawId.split("-")[0]} • Ref: {refCode} • ...
```
(`rawId` đã được tính sẵn ngay phía trên trong cả 2 file, không cần thêm biến mới.)

### 2.5 `app/(protected)/finance/receipts/page.tsx` — SSR `bankInfo`

Thêm vào `Promise.all` cùng 4 lệnh fetch hiện có:
```ts
import { getStudioInfo } from "@/app/actions/settings-queries";
// ...
const [receiptsResult, statsResult, categoriesResult, contractsResult, studioResult] =
  await Promise.all([
    fetchReceipts({ page: 1, pageSize: 12, month, year }),
    fetchReceiptStats(month, year),
    fetchFinanceCategories("thu"),
    fetchContractOptions(),
    getStudioInfo(),
  ]);
// ...
<ReceiptsClient
  ...
  bankInfo={unwrap(studioResult, undefined)?.bank_info ?? null}
/>
```

## 3. Verify

1. `npx eslint` toàn bộ file trong locks (trừ migration `.sql`) — 0 error.
2. `npm run build` — exit 0.
3. Migration: `node scripts/migrate-direct.mjs supabase/migrations/20260824140000_fix_receipt_documents_deposit_classification.sql`, sau đó gọi lại `select receipt_type, count(*) from finance_receipt_documents(null,null,null,null,500,0) where source_table='payments' group by 1` → kỳ vọng `contract_deposit` tăng từ 1 lên **18** (17 "Cọc" + 1 "dat_coc"), `contract_payment` giảm từ 48 xuống **31**.
4. Render thật (`next start` cục bộ rồi lại production sau deploy, seed E2E rồi xóa):
   - Tab "Cọc hợp đồng" tháng 5/2026 → hiện đủ 5/5 (4 Cọc thật + 1 dat_coc cũ), không còn 1/1.
   - Bấm "Sửa" trên phiếu bán vật tư → nút bị khoá (không mở modal), title đúng thông báo hướng dẫn.
   - Trang chi tiết 1 phiếu nguồn `payments` → dòng "ID:" không còn tiền tố `payment:`.
   - `/finance/receipts` mở lần đầu → modal QR (nếu mở ngay) không còn nháy trạng thái "chưa cấu hình" trước khi có dữ liệu ngân hàng thật.
5. Không tạo/sửa bản ghi thanh toán thật nào trong lúc verify.

## 4. Ngoài phạm vi

Xem mục 1 — 3 điểm đã trace, ghi lại lý do không sửa, không lặp lại điều tra ở task sau.

---

## 5. Kết quả thực thi (2026-08-24)

**Trạng thái:** merged vào `main` (`eddd2bb`), migration đã apply production, đã deploy, đã xác nhận live bằng render thật.

### Verify

1. `npx eslint` (5 file code) → 0 error.
2. `npm run build` → exit 0.
3. Migration `20260824140000_fix_receipt_documents_deposit_classification.sql` apply qua `node scripts/migrate-direct.mjs` → gọi lại RPC ngay sau: `contract_deposit` từ **1 → 18**, `contract_payment` từ **48 → 31** (khớp dự kiến — 17 khoản "Cọc" thật + 1 "dat_coc" cũ).
4. Render thật (local `next start`, seed E2E admin rồi xóa):
   - Tab "Cọc hợp đồng" tháng 5/2026 → **5/5** (trước fix: 1/1).
   - Nút "Sửa" trên phiếu bán vật tư → `disabled=true`, title "Phiếu bán vật tư — sửa từ Vật tư".
   - Trang chi tiết phiếu nguồn `payments` → dòng "ID:" không còn tiền tố `payment:`.
5. Render thật trên **production** (`stu.moodwedding.com`, sau khi deploy xong — có 1 khoảng chờ deploy propagate ~3-4 phút):
   - Tab "Cọc hợp đồng" tháng 5/2026 → **5/5**, cả 5 dòng đúng badge "Cọc hợp đồng" (poll tới khi ổn định — lần đọc đầu do SWR chưa kịp revalidate trên cold-start production nên đọc nhầm số "Tất cả", đã loại bỏ false-positive bằng cách poll dài hơn + check badge thật thay vì chỉ đọc text đếm).
   - Nút "Sửa" phiếu bán vật tư → `disabled=true` trên production.
   - Dòng "ID:" trên trang chi tiết → sạch, không còn `payment:` leak, trên production.
6. Fix 4 (SSR `bankInfo`) không render-verify riêng bằng screenshot (thay đổi thuần server-side prop threading, rủi ro thấp) — xác nhận qua build + eslint sạch.

**Kết luận:** đúng spec, cả 4 fix đã sống trên production, không phát sinh lệch hành vi ngoài dự kiến.
