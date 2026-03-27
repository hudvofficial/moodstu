# 🏥 Audit Report Round 5 — 2026-03-27

## Summary
- 🔴 Critical Issues: **0** ✅
- 🟡 Warnings: **3** (cosmetic/naming)
- 🟢 Suggestions: **2** (housekeeping)
- ✅ Clean: Round 4 fixes verified, build passed, 0 legacy table refs

---

## ✅ Round 4 Fixes Verified

| Check | Result |
|-------|--------|
| `inventory_items` in `*.ts/*.tsx` | ✅ 0 hits |
| `inventory-actions` imports | ✅ 0 hits |
| `inventory-query-actions` imports | ✅ 0 hits |
| Legacy files in `app/actions/` | ✅ 0 files |
| `database.types.ts` — `inventory_items` view | ✅ Removed |
| `npm run build` | ✅ Exit code 0 |
| `as any` in `app/actions/` | ✅ 0 hits |
| `console.log` in `components/` | ✅ 0 hits |

---

## 🟡 Warnings (Cosmetic — Không ảnh hưởng runtime)

### W1. Stale SWR cache key: `inventoryItem`
- **File:** `lib/swr.ts:28`
- **Code:** `inventoryItem: (id: string) => \`inventory:${id}\``  
- **Vấn đề:** Cache key thừa, không nơi nào dùng `cacheKeys.inventoryItem` (confirmed grep = 0 hits)
- **Cùng file có:** `inventory: () => "inventory"` (line 27) — cũng không dùng
- **Cách sửa:** Xóa 2 entries `inventory` + `inventoryItem` trong `cacheKeys`

### W2. Stale `revalidatePath("/inventory")` 
- **File:** `app/actions/receipt-actions.ts:132`
- **Vấn đề:** Route `/inventory` không tồn tại (đã đổi thành `/dresses`)
- **Cách sửa:** Đổi thành `revalidatePath("/dresses")`

### W3. TS naming: `InventoryItem` interface
- **File:** `components/contracts/detail/inventory-reservation-form.tsx:27`
- **Vấn đề:** Interface vẫn tên `InventoryItem` thay vì `Dress`
- **Ảnh hưởng:** Cosmetic only — không ảnh hưởng runtime
- **Cách sửa:** Rename `InventoryItem` → `Dress` trong file

---

## 🟢 Suggestions (Tùy chọn)

### S1. npm audit: 1 moderate vulnerability
- **Package:** `brace-expansion < 5.0.5` (dev dependency via `@surma/rollup-plugin-off-main-thread`)
- **Severity:** Moderate (DoS via zero-step sequence)
- **Ảnh hưởng:** Dev only, không ảnh hưởng production
- **Cách sửa:** `npm audit fix` hoặc chờ upstream update

### S2. `inventoryItemId` property names in TS
- **Files:** `dress-mutations.ts`, `dress.schema.ts`, `inventory-reservation-form.tsx`
- **Vấn đề:** Variable names vẫn dùng `inventoryItemId` thay vì `dressId`
- **Lý do giữ nguyên:** DB columns `inventory_item_id` vẫn tồn tại trong `inventory_reservations`, `contract_items` → rename cả DB column sẽ là breaking change lớn
- **Đánh giá:** **SAFE TO IGNORE** — mapping names phù hợp với DB schema hiện tại

---

## 📊 Health Score

| Category | Score | Notes |
|----------|-------|-------|
| Security | 🟢 9/10 | Clean, no secrets, no XSS |
| Code Quality | 🟢 9/10 | 3 cosmetic naming issues |
| Performance | 🟢 9/10 | Build optimized, no N+1 |
| Type Safety | 🟢 10/10 | 0 `as any` in actions |
| Legacy Cleanup | 🟢 10/10 | 0 legacy table refs |

**Overall: 🟢 47/50 (94%)**

---

## 📋 Recommended Fixes

```
1️⃣ Fix W1: Xóa stale cache keys trong swr.ts
2️⃣ Fix W2: Đổi revalidatePath("/inventory") → "/dresses" 
3️⃣ Fix W3: Rename InventoryItem interface (optional)
4️⃣ Ignore S1-S2 (dev dep, DB column naming)
```
