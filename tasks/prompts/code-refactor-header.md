/code Refactor FullpageFormShell → HeaderSlotsContext (Option B)

## Plan đã duyệt

Tách `isFullpage` thành `FORM_PAGE_PATTERNS` — HIỆN Header (qua HeaderSlotsContext), ẨN BottomNav (form có footer riêng). 5 files sửa, 4 phases.

## Phase 1: app-shell.tsx — Tách pattern

File: components/layout/app-shell.tsx

1. FULLPAGE_PATTERNS (L16-19): chuyển /create + /edit → FORM_PAGE_PATTERNS mới
2. Thêm biến isFormPage = FORM_PAGE_PATTERNS.some(p => p.test(pathname))
3. Header: giữ {!isFullpage && <Header />} — không đổi (isFullpage giờ = [])
4. BottomNav (L106): đổi {!isFullpage && <BottomNav />} → {!(isFullpage || isFormPage) && <BottomNav />}
5. Main padding (L94-101): thêm case isFormPage → "px-2 py-4 lg:px-6 lg:py-6" (no pb-28 vì form footer xử lý)

## Phase 2: form/index.tsx — Thêm HeaderSlotsContext

File: components/contracts/form/index.tsx

1. Import useSetHeaderSlots từ @/contexts/header-slots-context
2. Import Link từ next/link, ArrowLeft từ lucide-react (nếu chưa có)
3. Thêm useEffect giống pattern contract-detail-client.tsx L91-112:
   - leftSlot: <Link href="/contracts"><ArrowLeft /></Link> (lg:hidden)
   - titleOverride: mode === "create" ? "Tạo hợp đồng mới" : "Sửa hợp đồng"
   - hideSearch: true
   - rightSlot: HĐ badge code (nếu có)
   - cleanup: return () => setHeaderSlots({})
4. Xóa breadcrumb + headerRight props truyền cho FullpageFormShell

## Phase 3: fullpage-form-shell.tsx — Xóa header riêng

File: components/layout/fullpage-form-shell.tsx

1. Xóa props: breadcrumb, headerRight
2. Xóa toàn bộ <header> block (L47-59) — không render header riêng nữa
3. Xóa imports không còn dùng: useScrollDirection, useScrollContainer, cn (nếu)
4. Giữ body layout 2 cột (detail-grid + detail-main + detail-sidebar)
5. Giữ rightPanel prop cho desktop panel

## Phase 4: Cleanup

### header.tsx
File: components/layout/header.tsx
- Xóa isFullpageForm logic (L96) + mọi references đến nó

### utilities.css
File: app/styles/utilities.css
- Xóa .mobile-header-spacer class (L51-58)

## Files tham khảo (ĐỌC pattern trước khi code)

- components/contracts/detail/contract-detail-client.tsx L91-112 — PATTERN MẪU useSetHeaderSlots
- components/contracts/gallery/gallery-full-page.tsx L42-58 — PATTERN MẪU đơn giản hơn

## Gate trước khi code

1. Đọc tasks/pre-code-checklist.md
2. Đọc tasks/lessons.md (đặc biệt #64 no border, #63 max-lg, #62 no tự ý sửa)
3. Đọc tasks/gates/before-edit.md
4. Mở browser mobile 375px xem /contracts/create TRƯỚC KHI sửa

## Verification sau khi code

1. Mobile 375px — /contracts/create:
   - System header sticky (← + "Tạo hợp đồng mới")
   - BottomNav ẨN
   - FormActions footer hiện (Hủy / Lưu nháp / Tạo HĐ)
   - Gap header→content = 16px
2. Desktop 1440px — /contracts/create:
   - Layout 2 cột hoạt động
   - System header đúng
3. Các trang khác KHÔNG bị ảnh hưởng:
   - /dashboard, /contracts, /contracts/[id], /contracts/[id]/gallery
4. npm run build pass

## LƯU Ý QUAN TRỌNG
- KHÔNG sửa file ngoài 5 files trong plan
- KHÔNG thêm feature mới
- Sau mỗi phase: verify build không lỗi
- Kill port 3000 + run dev lại sau build
