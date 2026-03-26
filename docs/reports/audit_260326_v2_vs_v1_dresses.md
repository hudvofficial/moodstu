# 🏥 Full 1:1 Audit — V2 Dresses Module vs V1

**Ngày:** 2026-03-26  
**Scope:** Full Audit — SO SÁNH 1:1 mọi layer: Routes, Server Actions, Components, UI, Performance

---

## 📊 File Inventory

### V1 Files (11 files)

| Layer | File | Lines |
|-------|------|------:|
| **Route** | `dresses/page.tsx` | 219 |
| **Route** | `dresses/[id]/page.tsx` | 278 |
| **Route** | `dresses/new/page.tsx` | ? |
| **Route** | `dresses/rentals/page.tsx` | 270 |
| **Route** | `dresses/loading.tsx` | ? |
| **Component** | `DressCard.tsx` (_components) | 121 |
| **Component** | `DressesSkeleton.tsx` (_components) | ? |
| **Component** | `DressModal.tsx` | 295 |
| **Component** | `RentButton.tsx` | 246 |
| **Component** | `DressesToolbar.tsx` | 207 |
| **Component** | `QRCodeLabel.tsx` | 102 |
| **Action** | `actions/dresses.ts` | 143 |
| **Shared** | `ui/ImageUpload.tsx` | 109 |

### V2 Files (14 files)

| Layer | File | Lines |
|-------|------|------:|
| **Route** | `dresses/page.tsx` (server) | — |
| **Route** | `dresses/rentals/page.tsx` | — |
| **Component** | `dress-card.tsx` | 94 |
| **Component** | `dress-drawer.tsx` | — |
| **Component** | `dress-drawer-content.tsx` | 200 |
| **Component** | `dress-form-modal.tsx` | 236 |
| **Component** | `dress-qr-modal.tsx` | 145 |
| **Component** | `dress-scanner-modal.tsx` | — |
| **Component** | `dresses-filters.tsx` | — |
| **Component** | `dresses-list-client.tsx` | 239 |
| **Component** | `dresses-stats-bar.tsx` | — |
| **Component** | `rental-history-client.tsx` | 292 |
| **Action** | `dress-mutations.ts` | 437 |
| **Action** | `dress-queries.ts` | 192 |
| **Shared** | `ui/image-upload.tsx` | 115 |

---

## 1️⃣ SERVER ACTIONS — 1:1

### V1: `actions/dresses.ts` (5 functions)

| Function | Auth | Validation | Audit Log | Revalidate |
|----------|:----:|:----------:|:---------:|:----------:|
| `createDress` | `withAdmin` | ❌ No Zod | ❌ | ✅ |
| `updateDress` | `withAdmin` | ❌ | ❌ | ✅ |
| `deleteDress` | `withAdmin` | ❌ | ❌ | ✅ |
| `rentDress` | `withAdmin` | ❌ | ❌ | ✅ |
| `returnDress` | `withAdmin` | ❌ | ❌ | ✅ |

### V2: `dress-mutations.ts` (6 functions) + `dress-queries.ts` (5 functions)

**Mutations:**

| Function | Auth | Zod Validation | Audit Log | Revalidate |
|----------|:----:|:--------------:|:---------:|:----------:|
| `createDress` | `withAuth` | ✅ `dressCreateSchema` | ✅ | ✅ |
| `updateDress` | `withAuth` | ✅ `dressUpdateSchema` | ✅ | ✅ |
| `deleteDress` | `withAuth` | ✅ ID check | ✅ | ✅ |
| `reserveDressForContract` | `withAuth` | ✅ `reserveDressSchema` | ✅ | ✅ |
| `releaseReservation` | `withAuth` | ✅ ID check | ✅ | ✅ |
| `uploadDressImage` | `withAuth` | ✅ type+size | — | — |

**Queries (V1 không tách riêng):**

| Function | V1 tương đương |
|----------|---------------|
| `fetchDressList` | inline trong `page.tsx` |
| `fetchDressDetail` | inline trong `[id]/page.tsx` |
| `getDressStats` | inline `fetchDressStats` |
| `getDressAvailability` | ❌ V1 không có |
| `fetchRentalHistory` | inline trong `rentals/page.tsx` |

### 🏆 Verdict: **V2 thắng hoàn toàn**

V2 có: Item code auto-gen (MAX parse), Zod validation, audit logs, optimistic locking (`updated_at`), tách queries riêng, `getDressAvailability` (V1 không có). V1 dùng `Record<string, unknown>` (unsafe), không validate, không audit.

---

## 2️⃣ ROUTES & PAGES — 1:1

| Route | V1 | V2 | Winner |
|-------|:--:|:--:|:------:|
| `/dresses` — list page | ✅ Client component (useQuery) | ✅ Server + Client (SWR) | **V2** (SWR lighter) |
| `/dresses/[id]` — detail/edit page | ✅ Full page (278 lines) | ✅ Drawer component (200 lines) | **V2** (0ms, no page load) |
| `/dresses/new` — create page | ✅ Separate page | ✅ Modal trong list page | **V2** (no navigation) |
| `/dresses/rentals` — rental history | ✅ Server component (270 lines) | ✅ Client component (292 lines) | **V2** (TabsFilter, URL state) |

### 🏆 Verdict: **V2 thắng**

V2 không cần navigate sang page khác — drawer/modal mở tại chỗ, UX nhanh hơn.

---

## 3️⃣ COMPONENTS — 1:1

### 3.1 DressCard (Hiển thị card trang phục)

| Feature | V1 `DressCard.tsx` | V2 `dress-card.tsx` |
|---------|:--:|:--:|
| Ảnh 3:4 aspect | ✅ | ✅ |
| Status badge | ✅ inline CSS | ✅ `Badge` component |
| Hover scale image | ✅ | ✅ |
| Edit button on hover | ✅ | ✅ |
| Category label | ✅ | ✅ |
| Name truncate | ✅ | ✅ |
| Code badge | ✅ | ✅ |
| Size + Color in card | ✅ bordered section | ✅ inline text |
| **Giá thuê** | ❌ Không hiển thị | ✅ Dưới size/color |
| Next.js Image `sizes` prop | ✅ responsive | ✅ responsive |
| `unoptimized` for blob/data | ✅ | ❌ Chưa có |
| 🔴 **Nút Đặt thuê / Trả váy** | ✅ `RentButton` footer | ❌ **THIẾU** |

### 3.2 DressModal / DressFormModal (Form tạo/sửa)

| Feature | V1 `DressModal.tsx` | V2 `dress-form-modal.tsx` |
|---------|:--:|:--:|
| ImageUpload | ✅ | ✅ |
| QRCodeLabel inline | ✅ (edit mode) | ❌ Không hiển thị QR trong form |
| Category chips | ✅ (6 icons khác nhau) | ✅ (1 icon Shirt cho tất cả) |
| Code field | ✅ Manual only | ✅ Manual + Auto-gen |
| Color field | ✅ | ✅ |
| Size field | ✅ | ✅ |
| Condition field | ❌ | ✅ SelectForm |
| Rental price | ✅ CurrencyInput | ✅ CurrencyInput |
| Purchase price | ❌ | ✅ CurrencyInput |
| Notes | ✅ | ✅ |
| Delete button | ✅ `window.confirm` | ✅ `ConfirmDialog` |
| Footer layout | ✅ 2-column balanced | ✅ `form-actions` |

### 3.3 RentButton (Đặt thuê nhanh)

| Feature | V1 `RentButton.tsx` | V2 |
|---------|:--:|:--:|
| Nút "Đặt thuê" trên card | ✅ | ❌ **KHÔNG CÓ** |
| Modal nhập: tên, SĐT, ngày, cọc | ✅ | ❌ |
| Nút "Trả váy" (status rented) | ✅ | ❌ (drawer có "Trả" nhưng ko trên card) |
| React Query invalidation | ✅ | — |

> [!WARNING]
> V1 `RentButton` dùng table `dress_rentals` riêng (standalone rent). V2 dùng `inventory_reservations` (linked to contracts). Đây là **architectural difference** — V2 KHÔNG nên port V1 RentButton nguyên bản vì data model khác. Thay vào đó, V2 cần expose `reserveDressForContract` trên card UI.

### 3.4 Toolbar / Filters

| Feature | V1 `DressesToolbar.tsx` | V2 `dresses-filters.tsx` + `dresses-list-client.tsx` |
|---------|:--:|:--:|
| Mobile filter: status dropdown | ✅ | ✅ TabsFilter |
| Mobile filter: category dropdown | ✅ | ✅ SelectPill |
| Desktop filter: FilterChips | ✅ (no count) | ✅ TabsFilter **(có count)** |
| Desktop: category dropdown | ✅ | ✅ |
| Desktop: scan button | ✅ (hidden input) | ✅ Camera modal **(tốt hơn)** |
| 🔴 Desktop: **"Xem lịch" button** | ✅ Link `/dresses/rentals` | ❌ **THIẾU** |
| Sort dropdown | ❌ | ✅ Mới nhất / Cũ nhất |
| Mobile scan button | ✅ inline | ✅ FAB area |

### 3.5 QR Label / Print

| Feature | V1 `QRCodeLabel.tsx` | V2 `dress-qr-modal.tsx` |
|---------|:--:|:--:|
| QR lib | `qrcode.react` (SVG) | `qr-code-styling` (canvas, đẹp hơn) |
| Print method | `window.open` + inject HTML | `window.print()` + CSS @media |
| Batch print | ❌ 1 cái/lần | ✅ Grid 2 cột, max 50 |
| Page size | `@page auto` | `80mm x 60mm` / `A4` |
| **Giá thuê trên nhãn** | ✅ `Giá: ${safePrice}` | ❌ **THIẾU** |
| XSS protection | ✅ `escapeHtml()` | ✅ (React auto-escape) |
| QR embedded in form | ✅ (DressModal edit mode) | ❌ Chỉ ở modal riêng |

### 3.6 Detail View

| Feature | V1 `/dresses/[id]` | V2 Drawer |
|---------|:--:|:--:|
| Load method | Full page navigate + fetch | ✅ Drawer (0ms, data from list) |
| ImageUpload edit | ✅ | ❌ (chỉ view, edit phải mở form modal) |
| QRCodeLabel inline | ✅ | ❌ (chỉ qua QR button) |
| Reservations list | ❌ | ✅ Lazy SWR + "Trả" button |
| Link to contract | ❌ | ✅ Link `/contracts/{id}` |
| "View all" rentals | ❌ | ✅ Link `/dresses/rentals?item_id=X` |
| Delete button | ✅ | ❌ (phải mở form modal) |

### 3.7 Rental History Page

| Feature | V1 `rentals/page.tsx` | V2 `rental-history-client.tsx` |
|---------|:--:|:--:|
| Component type | Server (SSR) | Client (SWR) |
| Filter tabs | ❌ | ✅ TabsFilter (Tất cả/Đã đặt/Đang thuê/Đã trả) |
| URL state | ❌ | ✅ searchParams |
| Mobile layout | ✅ Card | ✅ Card **(compact hơn)** |
| Desktop layout | ✅ Table | ✅ Table |
| Pagination | ✅ | ✅ |
| Breadcrumb | ❌ | ✅ |
| Stats summary | ❌ | ✅ Count by status |
| Link to contract | ✅ | ✅ |
| Dress image in row | ✅ | ❌ (chỉ show code + name) |
| **Rental price column** | ✅ `rental_price` | ✅ `rental_price` |

### 3.8 ImageUpload

| Feature | V1 `ui/ImageUpload.tsx` | V2 `ui/image-upload.tsx` |
|---------|:--:|:--:|
| Auth | `createClient()` anon key | ✅ `uploadDressImage()` withAuth |
| Client-side validation | ❌ | ✅ type + 5MB limit |
| Server-side validation | ❌ | ✅ type + 5MB limit |
| Old file cleanup | ❌ Orphan files in storage | ✅ Delete old before upload |
| Preview | `createObjectURL` | ✅ + `revokeObjectURL` |
| Upload spinner | ✅ (border pulse) | ✅ Loader2 overlay |
| Hover edit overlay | ❌ | ✅ Pencil icon overlay |

---

## 4️⃣ PERFORMANCE — 1:1

| Config | V1 | V2 | 
|--------|:--:|:--:|
| Next.js Image WebP/AVIF | ✅ | ✅ |
| minimumCacheTTL 1 year | ✅ | ✅ |
| deviceSizes responsive | ✅ | ✅ |
| remotePatterns *.supabase.co | ✅ | ✅ |
| PWA cache supabase-images | ✅ | ✅ |
| React Compiler | ❌ | ✅ |
| Turbopack (dev) | ❌ | ✅ |
| Bundle Analyzer | ❌ | ✅ |
| `reloadOnOnline` PWA | ❌ | ✅ |

---

## 5️⃣ DATABASE — 1:1

| Aspect | V1 | V2 |
|--------|----|----|
| Table | `wedding_dresses` | `inventory_items` (unified) |
| Rentals table | `dress_rentals` (standalone) | `inventory_reservations` (linked to contracts) |
| Schema validation | ❌ | ✅ Zod schemas |
| Auto item_code | ❌ Manual only | ✅ MAX() parse auto-gen |
| Optimistic locking | ❌ | ✅ `updated_at` check |

---

## 📋 FINAL GAP SUMMARY

### 🔴 Critical (PHẢI SỬA — ảnh hưởng UX chính)

| # | Gap | Mô tả | Effort |
|---|-----|-------|--------|
| C1 | **Nút "Đặt thuê" trên card** | V1 có RentButton, V2 không. Nhưng **KHÔNG port nguyên bản** — phải adapt sang `reserveDressForContract` hoặc tạo quick-rent flow mới | ~1.5h |
| C2 | **Link "Xem lịch"** trên toolbar desktop | V1 DressesToolbar L167-173, V2 thiếu (trang rental đã có) | ~10 min |

### 🟡 Warning (NÊN SỬA — polish UX)

| # | Gap | Mô tả | Effort |
|---|-----|-------|--------|
| W1 | **Giá thuê trên QR nhãn** | V1 QRCodeLabel có `Giá: ${price}`, V2 QRLabel thiếu | ~5 min |
| W2 | **Category icons đa dạng** | V1 mỗi loại có icon riêng (6 icons), V2 dùng 1 Shirt | ~15 min |
| W3 | **QR in form modal** | V1 DressModal có QRCodeLabel inline (edit mode), V2 ko | ~20 min |

### 🟢 Suggestions (TÙY CHỌN — micro improvements)

| # | Gap | Mô tả | Effort |
|---|-----|-------|--------|
| S1 | `unoptimized` prop for blob/data URLs | V1 card có, V2 card thiếu → ảnh blob/data URL bị warning | ~2 min |
| S2 | Dress image in rental history row | V1 rentals có mini thumbnail, V2 chỉ text | ~15 min |
| S3 | Console fix: manifest.json + logo sizes | Console warnings | ~10 min |

---

## ✅ V2 THẮNG (Không cần thay đổi — 15 điểm)

| # | Feature | Lý do V2 tốt hơn |
|---|---------|-------------------|
| 1 | Server actions auth | `withAuth` + `fireAuditLog` |
| 2 | Zod validation | Tất cả mutations validated |
| 3 | Optimistic locking | `updated_at` check |
| 4 | Item code auto-gen | MAX parse strategy |
| 5 | Drawer vs detail page | 0ms load, no navigation |
| 6 | Reservations in drawer | Lazy SWR + release button |
| 7 | Stats bar | Compact, responsive |
| 8 | Filter with count | TabsFilter `(N)` |
| 9 | Sort | SelectPill |
| 10 | Batch QR print | Grid 2 cột, A4 + 80×60mm |
| 11 | Camera scanner | Real camera vs hidden input |
| 12 | ConfirmDialog | vs `window.confirm` |
| 13 | ImageUpload auth + cleanup | vs anon key + orphan files |
| 14 | Rental history filters | TabsFilter + URL state |
| 15 | Condition + purchase_price fields | Extra data V1 không có |

---

## 🎯 BRIEF — Kết luận

**V2 kiến trúc vượt trội V1** ở backend, data integrity, UX patterns (drawer, filters, batch print).

**V2 chỉ thiếu 2 tính năng user-facing quan trọng** (C1, C2) + 3 polish items (W1-W3).

**Tổng effort port: ~2.5h**

> [!IMPORTANT]
> C1 (RentButton) cần **thiết kế lại**, KHÔNG port nguyên bản. V1 dùng table `dress_rentals` (standalone), V2 dùng `inventory_reservations` (linked contracts). Cần quyết định: Quick rent (standalone) hay Contract-linked reservation?

```
📋 Anh muốn làm gì tiếp theo?

1️⃣ /plan — Lên kế hoạch port 5 gaps (C1, C2, W1, W2, W3)
2️⃣ /code — Fix ngay C2 + W1 (nhanh, 15 phút)
3️⃣ /save-brain — Lưu audit report
4️⃣ Thảo luận C1 (RentButton) — quick rent vs contract-linked?
```
