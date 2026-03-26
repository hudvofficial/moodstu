# Plan: Port V1 Reference → V2 Dresses UI Gaps

Created: 2026-03-26T17:16  
Status: 🟡 Awaiting Approval  
Audit Source: `docs/reports/audit_260326_v2_vs_v1_dresses.md`

---

## Nguyên tắc BẤT DI BẤT DỊCH

> [!CAUTION]
> **CHỈ THAM CHIẾU V1** — Không copy code, không port nguyên bản, không tạo table mới.
> V1 = reference cho UX mục đích. V2 = kiến trúc duy nhất.

- ✅ DÙNG: V2 server actions, Lucide icons, `design-system.css` tokens, SWR, URL searchParams
- ❌ KHÔNG: Material Symbols, `window.confirm`, `createClient()`, `dress_rentals` table
- ❌ KHÔNG modify: `dress-mutations.ts`, `dress-queries.ts`, `dress.schema.ts`

---

## Phases

| Phase | Name | Files Modified | Status | Effort |
|-------|------|----------------|--------|--------|
| 01 | Link "Xem lịch" + Category icons | `dresses-list-client.tsx`, `dress-form-modal.tsx` | ⬜ | ~25 min |
| 02 | Giá thuê trên QR nhãn | `dress-qr-modal.tsx` | ⬜ | ~5 min |
| 03 | QR preview trong form edit | `dress-form-modal.tsx` | ⬜ | ~20 min |
| 04 | Action nhanh trên drawer | `dress-drawer-content.tsx` | ⬜ | ~1h |
| 05 | Verification | Browser check mobile + desktop | ⬜ | ~15 min |

**Tổng: ~2h**

---

## Phase 01: Link "Xem lịch" + Category Icons (~25 min)

### Gap C2: Link "Xem lịch"

**V1 ref:** `DressesToolbar.tsx` L167-173 — nút link `/dresses/rentals`  
**V2 hiện tại:** Trang `rental-history-client.tsx` đã tồn tại nhưng toolbar không có link

**Thay đổi:**

#### [MODIFY] [dresses-list-client.tsx](file:///c:/Users/Admin/Desktop/Ai/mood%20saas/mood-studio/components/dresses/dresses-list-client.tsx)

Thêm `Link` icon button (Lucide `CalendarDays`) vào toolbar desktop strip (cạnh "Quét mã", "In nhãn"):
```
<Link href="/dresses/rentals" className="btn btn-ghost text-xs gap-1.5">
  <CalendarDays size={16} />
  <span className="hidden lg:inline">Xem lịch</span>
</Link>
```

---

### Gap W2: Category Icons Đa Dạng

**V1 ref:** Mỗi category dùng icon riêng (Material Symbols)  
**V2 hiện tại:** `dress-form-modal.tsx` tất cả 6 category chips dùng `Shirt`

**Thay đổi:**

#### [MODIFY] [dress-form-modal.tsx](file:///c:/Users/Admin/Desktop/Ai/mood%20saas/mood-studio/components/dresses/dress-form-modal.tsx)

Tạo icon map bằng Lucide icons:
```typescript
const CATEGORY_ICON_MAP: Record<string, LucideIcon> = {
  "Váy cưới": Shirt,       // giữ nguyên
  "Áo dài":  Ribbon,       // flowing ao dai
  "Vest":    Briefcase,     // formal vest
  "Váy tráp": Gift,        // lễ tráp
  "Đồ bé":  Baby,          // children
  "Khác":   Shapes,         // misc
};
```

Thay `<Shirt size={20} />` → `{const Icon = CATEGORY_ICON_MAP[cat] || Shapes; <Icon size={20} />}`

---

## Phase 02: Giá Thuê Trên QR Nhãn (~5 min)

### Gap W1

**V1 ref:** `QRCodeLabel.tsx` L61-64 — hiển thị `Giá: ${safePrice}` trên nhãn in  
**V2 hiện tại:** `dress-qr-modal.tsx` `QRLabel` component thiếu giá

**Thay đổi:**

#### [MODIFY] [dress-qr-modal.tsx](file:///c:/Users/Admin/Desktop/Ai/mood%20saas/mood-studio/components/dresses/dress-qr-modal.tsx)

Trong `QRLabel` component (L59-70), sau block size+color, thêm dòng giá:
```tsx
{dress.rental_price && (
  <span className="text-caption font-semibold text-primary">
    {new Intl.NumberFormat("vi-VN").format(dress.rental_price)}đ
  </span>
)}
```

---

## Phase 03: QR Preview Trong Form Edit (~20 min)

### Gap W3

**V1 ref:** `DressModal.tsx` (edit mode) có `QRCodeLabel` inline bên cạnh Image  
**V2 hiện tại:** Form modal không hiện QR khi edit (phải mở QR modal riêng)

**Thay đổi:**

#### [MODIFY] [dress-form-modal.tsx](file:///c:/Users/Admin/Desktop/Ai/mood%20saas/mood-studio/components/dresses/dress-form-modal.tsx)

Khi `editDress` (có `item_code`), hiển thị QR mini preview dưới ImageUpload:
```tsx
{editDress?.item_code && (
  <div className="flex flex-col items-center gap-2 p-3 bg-bg-hover rounded-xl">
    <QRLabel dress={editDress} qrSize={100} />
    <p className="text-caption text-text-muted">Mã QR sẽ in cùng nhãn</p>
  </div>
)}
```

Cần import `QRLabel` từ `dress-qr-modal.tsx` → phải **export** `QRLabel` (hiện chỉ dùng nội bộ).

---

## Phase 04: Action Nhanh Trên Drawer (~1h)

### Gap C1

**V1 ref:** `RentButton.tsx` — nút trên card để đặt thuê/trả nhanh  
**V2 hiện tại:** Drawer có `ReservationsSection` với "Trả" button nhưng thiếu "Đặt thuê"

> [!IMPORTANT]
> KHÔNG port RentButton V1. V1 dùng standalone `dress_rentals` table.
> V2 dùng `inventory_reservations` linked to contracts → khác data model.

**Thiết kế mới:**

#### [MODIFY] [dress-drawer-content.tsx](file:///c:/Users/Admin/Desktop/Ai/mood%20saas/mood-studio/components/dresses/dress-drawer-content.tsx)

Thêm **Action Bar** vào `InfoSection` hoặc drawer header. 2 senarios:

**Khi dress status = "available":**
```tsx
<Link href="/contracts/new?dress_id={dress.id}" className="btn btn-primary w-full gap-2">
  <ShoppingBag size={16} />
  Đặt cho hợp đồng
</Link>
```

**Khi dress có active reservation (status = "reserved" hoặc "rented"):**
- Nút "Trả" đã có trong `ReservationRow` → **giữ nguyên**

**Lý do thiết kế này:**
1. V2 không có standalone rent — tất cả reservation linked to contract
2. Nút "Đặt cho hợp đồng" redirect đến form tạo contract với dress pre-selected
3. Hoặc, nếu user muốn flow nhanh hơn: mở modal select contract → call `reserveDressForContract`

**Cần hỏi user:** Anh muốn flow nào?
- **A)** Nút redirect sang `/contracts/new?dress_id=X` (đơn giản, dùng luôn contract form)
- **B)** Nút mở mini modal chọn contract → đặt ngay trong drawer (phức tạp hơn, UX nhanh hơn)

---

## Phase 05: Verification (~15 min)

### V-GATE Check
- [ ] Mở browser mobile (375px) → screenshot danh sách + drawer
- [ ] Mở browser desktop (1440px) → screenshot toolbar + QR label
- [ ] So sánh trước/sau
- [ ] Build check: `npm run build` (no errors)

---

## Files Summary

| File | Phase | Thay đổi |
|------|-------|----------|
| `dresses-list-client.tsx` | 01 | + Link "Xem lịch" |
| `dress-form-modal.tsx` | 01, 03 | + Category icons map, + QR preview khi edit |
| `dress-qr-modal.tsx` | 02, 03 | + Giá thuê trên nhãn, export QRLabel |
| `dress-drawer-content.tsx` | 04 | + Action button "Đặt cho hợp đồng" |

**Tổng: 4 files — KHÔNG có backend/schema changes**
