# T-20260827-contract-discount-percent — Giảm giá theo % bị lưu thành số thô (50) thay vì số tiền; hiển thị "Giảm: −50"

**Owner:** claude (spec + code trực tiếp) · **Trạng thái:** implementing (user báo 27/08: "giảm 50% mà UI hiển thị −50 thì có vẻ không diễn tả hết") · **Branch:** `claude/contract-discount-percent` · **Module:** hop-dong · **DB:** 1 migration data-fix 2 dòng (không đổi schema).

## 0. Trace (prod 27/08, chỉ đọc)
- HĐ-2026-0060: `total_amount` 475.000 ✓ (= 950.000 − 50%), nhưng `discount_amount` = **50** (số phần trăm thô). HĐ-2026-0062 y hệt (=50; 1.700.000 → 850.000). Không HĐ nào khác có `discount_amount` trong 1..100.
- Gốc: `components/contracts/form/hooks/useContractForm.ts:386` gửi `discount_amount: financials.discount` (giá trị ô nhập) trong khi `total_amount: financials.totalAmount` dùng `discountAmount` đã quy đổi (`useContractFinancials.ts:29-32`: percent → `round(subtotal × d / 100)`). `contracts` chỉ có cột `discount_amount` (không có loại/%) → phải lưu **số tiền**.
- Hệ quả hiển thị: `detail-layout-sections.tsx:123` `subtotal = total_amount + discount_amount` = 475.050; `financial-dashboard.tsx:132` "Tạm tính: 475.050 · Giảm: −50". Bản in / `service-details-block` tính tạm tính từ hạng mục (950.000) → hai chỗ nói hai số.
- Nguy cơ tiếp theo: mở Sửa HĐ → `prefillFinancials(contract.discount_amount)` nạp 50 với loại mặc định "fixed" → lưu lại sẽ ra tổng 949.950. Phải fix data trước.
- **Không phải lỗi:** hạng mục "GÓI BABY 02" xuất hiện 2 dòng — dòng cũ có `deleted_at` (RPC `save_contract_atomic` xoá mềm rồi chèn lại khi sửa, đúng thiết kế). 1 HĐ có 2 dòng active giống nhau (0046) — hợp lệ (2 gói). HĐ-2026-0064 (tổng 4.000.000 > hạng mục 3.300.000, giảm 0) và HĐ-2026-0047 (11.000.000 − 2.500.000 ≠ 8.800.000) là tổng nhập tay lệch hạng mục — ghi nhận, ngoài scope.

## 1. Sửa
1. `useContractForm.ts:386` → `discount_amount: financials.discountAmount` (số tiền đã quy đổi, cùng nguồn với `totalAmount`).
2. Migration `20260827160000_contract_discount_percent_datafix.sql`: pre-check đúng 2 HĐ (`HĐ-2026-0060`, `HĐ-2026-0062`) có `discount_amount = 50`; `UPDATE contracts SET discount_amount = (Σ contract_items active không addon) − total_amount` → 475.000 và 850.000; NOTICE; dừng nếu lệch.
3. `financial-dashboard.tsx:130-134`: "Tạm tính: {subtotal} · Giảm: −{discount} (50%)" — % dẫn xuất `round(discount / subtotal × 100)` khi `subtotal > 0` và `pct ≥ 1`. Không đổi schema (không thêm cột loại giảm — 27 HĐ có giảm đều lưu số tiền, % chỉ là cách nhập).

## 2. Verify
- eslint 2 file · tsc · build · `verify:contracts`.
- DB sau migration: 2 HĐ `discount_amount` = 475.000 / 850.000; `total_amount` không đổi; không HĐ nào `discount_amount` trong 1..100.
- Render local: `/contracts/<id HĐ-2026-0060>` → "Tạm tính: 950.000 · Giảm: −475.000 (50%)"; sau merge kiểm trên prod cùng trang.

## 3. Kết quả (27/08/2026)
- Code: `useContractForm.ts` gửi `financials.discountAmount`; `financial-dashboard.tsx` thêm "(N%)" dẫn xuất. eslint 0 · tsc 0 · build ✓ · `verify:contracts` ✓.
- Migration `20260827160000` **đã áp prod** (pre-check 2 dòng = 50 → sau: 0060 = 475.000, 0062 = 850.000; `total_amount` không đổi; không còn HĐ nào `discount_amount` 1..100).
- Render local (next start, Playwright, HĐ-2026-0060): "Tạm tính: 950.000 · Giảm: −475.000 (50%)", không còn "475.050"; ảnh thẻ Tài chính gửi user. Sau merge: prod hiện đúng ngay cả trước deploy (data đã sửa), phần "(50%)" cần deploy.
- Ngoài scope (ghi nhận): HĐ-2026-0064 (tổng 4.000.000 > hạng mục 3.300.000, giảm 0) và HĐ-2026-0047 (11.000.000 − 2.500.000 ≠ 8.800.000) — tổng nhập tay lệch hạng mục, không thuộc lỗi này.
