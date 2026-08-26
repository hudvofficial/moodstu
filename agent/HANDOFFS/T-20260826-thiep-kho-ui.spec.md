# T-20260826-thiep-kho-ui — M3b: thiệp của khách hợp đồng đi đúng đường "Bán thêm HĐ" / "Xuất HĐ" (gợi ý theo SĐT + lối vào từ trang hợp đồng)

**Owner:** claude (spec + review; code = coder subagent) · **Trạng thái:** approved (user "tiến hành triển khai" 26/08 cho M3b/M4/M5 chưa spec) → implement ngay · **Branch:** `claude/thiep-kho-ui` · **Module:** vat-tu + hop-dong · **Không đụng DB** (RPC `create_contract_inventory_addon_sale_atomic` và `inventory_stock_out_atomic` đã đủ; `contract_financials.cogs` đã cộng `contract_fulfillment` + `contract_addon_sale`).

**Đo 26/08 (prod, chỉ đọc):** 4 lần bán thiệp (5.295.000, giá vốn 2.608.000) đều `retail_sale`, SĐT **không khớp** khách HĐ nào → là khách lẻ thật, **không di trú gì**. RPC "Bán thêm HĐ" ghi đủ 3 sổ (`contract_items` phát sinh → doanh thu HĐ · `payments` → tiền vào · `stock_out` `contract_id` → COGS) nhưng **0 lần dùng**. Vì sao: (1) lối vào duy nhất là 3 nút "Xuất kho" trong `/inventory`, trang HĐ không có; (2) ô chọn HĐ trong modal chỉ tìm mã HĐ + tên khách, **không tìm SĐT** (`fetchInventoryContractOptions`); (3) chế độ "Bán lẻ" không nhắc gì khi SĐT nhập vào là khách HĐ; (4) "Xuất HĐ" (`stockOut`) chỉ `revalidatePath("/inventory")` → trang HĐ/`/finance` không tươi. Tồn kho: VT-016 20 · VT-017 0 · VT-018 650 tờ.

**Locks:** `app/actions/inventory-queries.ts` (`fetchInventoryContractOptions`) · `app/actions/inventory-mutations.ts` (`stockOut` revalidate) · `components/inventory/stock-out-modal.tsx` · `components/contracts/detail/quick-actions-grid.tsx` (ô thứ 7) · `components/contracts/detail/contract-detail-client.tsx` · `tests/e2e/inventory-contract-sale.spec.ts` (mới). **KHÔNG đụng:** RPC/migration, `contract-actions-menu.tsx` (chỉ là modal hủy/xoá), `top-action-bar.tsx` (desktop-only), `receipt-*` (bán lẻ từ Tài chính giữ nguyên), `lib/validations/inventory.schema.ts`; các class `uppercase tracking-wider text-tiny` có sẵn trong `quick-actions-grid.tsx` là vi phạm typography **ngoài scope** — không sửa ở đây.

## 0. Mục tiêu đo được
1. Gõ SĐT khách HĐ ở chế độ **Bán lẻ** → modal gợi ý đúng HĐ, một bấm chuyển sang **Bán thêm HĐ** với HĐ chọn sẵn.
2. Ô chọn HĐ tìm được theo SĐT (gõ 4+ chữ số).
3. Trang `/contracts/[id]` có lối vào "Thiệp / vật tư" → modal mở với HĐ chọn sẵn (mặc định Bán thêm HĐ, đổi được sang Xuất HĐ).
4. Sau khi bán/xuất từ trang HĐ: trang HĐ + drawer lợi nhuận (`Giá vốn vật tư`) + `/finance` tươi ngay, không F5.

## 1. Thay đổi

### 1.1 `fetchInventoryContractOptions(search)` — tìm cả SĐT
Sau `const term = normalizeSearch(search);` thêm `const digits = (search || "").replace(/\D/g, "").replace(/^84/, "0");`. Điều kiện:
```ts
if (term || digits.length >= 4) {
  const parts = [] as string[];
  if (term) parts.push(`contract_code.ilike.%${term}%`, `customers.full_name.ilike.%${term}%`);
  if (digits.length >= 4) parts.push(`customers.phone.ilike.%${digits}%`);
  query = query.or(parts.join(","));
}
```
(`customers!inner` đã có nên lọc cột quan hệ trong `.or()` hợp lệ — cùng cách `customers.full_name` đang dùng.)

### 1.2 `StockOutModal` — 3 prop mới (additive) + gợi ý theo SĐT
```ts
interface StockOutModalProps {
  isOpen: boolean; onClose: () => void; item?: InventoryItem | null; items?: InventoryItem[];
  /** Mở sẵn ở chế độ này (trang HĐ: "contract_addon_sale") */
  initialMode?: OperationMode;
  /** HĐ chọn sẵn (trang HĐ) */
  initialContract?: InventoryContractOption | null;
  /** Gọi sau khi ghi thành công (trang HĐ revalidate react-query của nó) */
  onSuccess?: () => void;
}
```
- `useState<OperationMode>(initialMode ?? "retail_sale")`, `useState(initialContract ?? null)` cho `selectedContract`, `contractQuery` khởi tạo `initialContract?.contract_code ?? ""`. `resetForm()` đặt lại về đúng các giá trị khởi tạo này (không về `retail_sale`/null cứng).
- Trong `startTransition` sau nhánh thành công (trước `handleClose()`): `onSuccess?.()`.
- **Gợi ý SĐT** (chỉ `mode === "retail_sale"`): `const debouncedPhone = useDebounce(customerPhone, 400)`; state `phoneMatch: InventoryContractOption | null` + `phoneHintDismissed: boolean`. Effect `[debouncedPhone, mode, isOpen]`: `digits = debouncedPhone.replace(/\D/g,"")`; nếu `mode !== "retail_sale" || digits.length < 9` → `setPhoneMatch(null)`; ngược lại `fetchInventoryContractOptions(digits)` → lấy phần tử đầu có `customer_phone` sau khi bỏ ký tự không phải số **bằng** `digits` (khớp chính xác, không ilike lỏng) → `setPhoneMatch(...)`; lỗi → null. Đổi `customerPhone` → `setPhoneHintDismissed(false)`.
- JSX ngay dưới ô `SĐT` (khối `retail_sale`), khi `phoneMatch && !phoneHintDismissed`:
```tsx
<div className="flex items-start justify-between gap-3 rounded-md border border-warning/20 bg-warning/5 px-3 py-2">
  <p className="text-caption text-text-secondary">
    SĐT này là khách của <span className="font-semibold text-text-main">{phoneMatch.contract_code}</span> — {phoneMatch.customer_name}. Bán thêm cho hợp đồng để doanh thu và giá vốn gắn vào HĐ?
  </p>
  <div className="flex shrink-0 gap-1.5">
    <Button type="button" size="sm" variant="primary" onClick={() => { switchMode("contract_addon_sale"); setSelectedContract(phoneMatch); setContractQuery(phoneMatch.contract_code); setShowContractDropdown(false); }}>Bán thêm HĐ</Button>
    <Button type="button" size="sm" variant="ghost" onClick={() => setPhoneHintDismissed(true)}>Bỏ qua</Button>
  </div>
</div>
```
(`Button` SSOT của repo — coder dùng đúng `variant`/`size` đang có trong `components/ui/button.tsx`; chữ theo token, không `uppercase`/`text-tiny`.) Lưu ý `switchMode` hiện xoá `selectedContract` khi rời chế độ HĐ — thứ tự gọi ở trên (switchMode trước, set sau) là cố ý.

### 1.3 Lối vào từ trang hợp đồng — ô thứ 7 của "Thao tác nhanh" (hiện ở cả 3 tier, một chỗ)
- `quick-actions-grid.tsx`: thêm vào `ACTIONS` sau `print`: `{ key: "inventory", label: "Thiệp", icon: Package, text: "text-orange-600", bg: "bg-orange-50", hoverBg: "group-hover:bg-orange-100" }` (import `Package` từ lucide); lưới `grid-cols-6` → `grid-cols-7` (ô phone ~47px vẫn đủ icon 32px + nhãn đã `truncate`). Không đổi gì khác trong file (kể cả các class typography cũ).
- `contract-detail-client.tsx`: `const StockOutModal = dynamic(() => import("@/components/inventory/stock-out-modal").then((m) => m.StockOutModal), { ssr: false })` cạnh các modal dynamic khác; state `showInventoryModal`; `handleQuickAction` thêm `case "inventory": setShowInventoryModal(true); break;` (và nối từ menu). Render:
```tsx
{showInventoryModal && (
  <StockOutModal
    isOpen={showInventoryModal}
    onClose={() => setShowInventoryModal(false)}
    initialMode="contract_addon_sale"
    initialContract={{ id: contract.id, contract_code: contract.contract_code, customer_name: contract.customers?.full_name || "Khách hàng", customer_phone: contract.customers?.phone ?? null }}
    onSuccess={() => { muteRealtimeEcho(); void revalidateContractDetailCaches(queryClient, id); }}
  />
)}
```
(`contract.customers` là `Customer | null` — có `phone`; kiểm tsc.)

### 1.4 `stockOut` (Xuất HĐ / nội bộ) — revalidate đủ
Sau 2 dòng `revalidatePath("/inventory")`/`/inventory/${itemId}` thêm: `if (input.contractId) { revalidatePath("/contracts"); revalidatePath(\`/contracts/${input.contractId}\`); revalidatePath("/finance"); }` (tên biến theo file). `createInventoryContractAddonSale` đã đủ.

## 2. Verify
- `npx eslint` 5 file · `npx tsc --noEmit` · `npm run build` · `npm run verify:inventory` + `verify:contracts`.
- Playwright mới `tests/e2e/inventory-contract-sale.spec.ts` (`--workers=1`, login helper có settle wait như `cashflow-m2`): seed admin E2E + khách (SĐT `09E2E…` 10 số) + HĐ `E2E-VT-…` 5.000.000 + vật tư `E2E-VT` tồn 100, giá vốn 500, giá bán 1.100 (insert thẳng `inventory_items` + `inventory_transactions stock_in` hoặc RPC nhập kho có sẵn — coder chọn cách đã có ở test khác/`verify-inventory`).
  (a) `/inventory` → "Xuất kho" → chọn vật tư E2E → chế độ Bán lẻ → gõ SĐT khách → banner hiện đúng mã HĐ → bấm "Bán thêm HĐ" → chế độ đổi, HĐ chọn sẵn → SL 10, giá 1.100 → xác nhận → DB: `contract_items` phát sinh 11.000 · `payments` 11.000 · `inventory_transactions` `stock_out` `contract_addon_sale` `contract_id` = HĐ · `current_stock` 90 · `contract_financials([id]).cogs` = 5.000.
  (b) `/contracts/[id]` → menu → "Thiệp / vật tư" → modal mở, HĐ chọn sẵn, chế độ Bán thêm HĐ → đổi "Xuất HĐ" → chọn vật tư → SL 5 → xác nhận → `stock_out` `contract_fulfillment` → `cogs` = 7.500; drawer lợi nhuận trên `/contracts` (cột Lợi nhuận) hiện "Giá vốn vật tư" 7.500 và 2 dòng.
  (c) Ô chọn HĐ: gõ 4 số cuối SĐT → HĐ E2E xuất hiện.
  Cleanup: xoá theo thứ tự `inventory_transactions` → `payments` → `contract_items` → `contracts` → `customers` → `inventory_items` → user.
- Ảnh modal (banner gợi ý) + menu trang HĐ @1366 → artifact.
- Sau merge: chạy spec trên prod.

## 3. Docs
`vault/40-module/vat-tu.md` (lối vào + gợi ý SĐT), `vault/40-module/hop-dong.md` (menu "Thiệp / vật tư"), `docs/design/dong-tien-mood-v2.md` §9 M3b ✅, `agent/TASKS.yaml`, `agent/CURRENT_STATE.md`.

## 4. Kết quả
- **Phát hiện khi chạy e2e (27/08):** `fetchInventoryContractOptions` bản cũ `.or("contract_code.ilike…,customers.full_name.ilike…")` bị PostgREST từ chối *"failed to parse logic tree"* — **`or` cấp cha không được trộn cột bảng nhúng** → ô chọn HĐ trong modal Xuất kho **đã hỏng từ trước** mỗi khi gõ chữ (chỉ danh sách "gần đây" chạy); phần SĐT thêm vào kế thừa lỗi. Sửa: tách 2 truy vấn (`ilike("contract_code")` + `.or("full_name…,phone…", { referencedTable: "customers" })` với `customers!inner`) rồi gộp theo `created_at` desc, limit 20. Test (c) mở rộng: tìm theo SĐT · tên · mã HĐ.
- **Code (Claude trực tiếp — coder subagent chạm giới hạn phiên, đường lùi):** §1.1 hai truy vấn gộp · §1.2 `StockOutModal` 3 prop mới, gợi ý SĐT (state `phoneMatch` chỉ set trong promise; hiển thị **dẫn xuất** từ SĐT đang gõ = SĐT đã khớp → đổi số tự ẩn, không `set-state-in-effect`), `onSuccess` · §1.3 ô "Thiệp" (`Package`, cam) trong lưới 7 cột + `StockOutModal` dynamic ở `contract-detail-client.tsx` (`initialMode="contract_addon_sale"`, `initialContract` từ `contract.customers`, `onSuccess` → `revalidateContractDetailCaches`) · §1.4 `stockOut` revalidate `/contracts`, `/contracts/[id]`, `/finance` khi có HĐ.
- **Verify:** eslint 0 · tsc 0 · build ✓ · `verify:inventory` + `verify:contracts` ✓ · Playwright local `inventory-contract-sale` **3/3**: (a) gõ SĐT → banner đúng HĐ → Bán thêm HĐ 10 tờ → `contract_items` 11.000 `is_addon` · `payments` 11.000 · `stock_out contract_addon_sale` gắn HĐ · tồn 90 · `contract_financials.cogs` 5.000; (b) trang HĐ → ô Thiệp → modal sẵn HĐ (mặc định Bán thêm HĐ) → Xuất HĐ 5 tờ → tồn 85 · `cogs` 7.500 · drawer lợi nhuận `/contracts` hiện "Giá vốn vật tư" 7.500 + tên vật tư; (c) ô chọn HĐ tìm theo 4 số cuối SĐT · tên · mã. Ảnh 3 màn @1366 trong artifact. `DRAWER_SHOTS=1` chụp `test-results/m3b/*.png`.
- **Docs:** vault `vat-tu` (mục mới), `hop-dong` (route `/contracts/[id]` 7 ô), `bay-du-lieu` #16 (PostgREST `or` bảng nhúng), design §9 M3b ✅, TASKS, CURRENT_STATE.
