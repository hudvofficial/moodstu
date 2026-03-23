/plan Refactor FullpageFormShell → HeaderSlotsContext (Option B)

## Bối cảnh

Mood Studio V2 hiện chỉ có Dashboard + Contract module. Đây là thời điểm tối ưu để chuẩn hóa header system trước khi mở rộng thêm module.

Audit 23/03/2026: 4/5 trang mobile đạt chuẩn header spacing. Chỉ /contracts/create có lỗi:
- Gap thừa ~45px
- Header không sticky mobile
- border-b vi phạm lesson #64 (V2 chỉ shadow)

## Quyết định: Option B — Chuyển sang HeaderSlotsContext

Mục tiêu: MỌI trang V2 dùng chung system header (header.tsx SSOT) thông qua HeaderSlotsContext — header đồng nhất, sticky, ẩn/hiện khi scroll.

## Hiện trạng code (đã verify)

### Header system hoạt động tốt trên:
- /dashboard — system header mặc định
- /contracts — system header mặc định
- /contracts/[id] — system header + HeaderSlotsContext (Back + mã HĐ + Actions)
- /contracts/[id]/gallery — system header + HeaderSlotsContext (Back + "Gallery" + Bell)

### /contracts/create hiện tại:
- app-shell.tsx L16-19: FULLPAGE_PATTERNS match /create → Header + BottomNav ẨN hoàn toàn
- FullpageFormShell (fullpage-form-shell.tsx) render header RIÊNG (h-16 = 64px, border-b, backdrop-blur)
- ContractForm (form/index.tsx) pass breadcrumb + headerRight vào FullpageFormShell
- Bottom bar riêng: FormActions variant="fixed" (Hủy / Lưu nháp / Tạo HĐ)

## Scope thay đổi

### 1. app-shell.tsx
- Xóa /contracts/create khỏi FULLPAGE_PATTERNS → system header hiện lại
- Giữ /edit nếu cần (hoặc xóa luôn nếu edit cũng dùng FullpageFormShell)

### 2. fullpage-form-shell.tsx
- Xóa phần <header> riêng (L47-59) → không render header nữa
- Giữ body layout 2 cột (detail-grid) — đây vẫn cần
- Fix border-b → shadow nếu còn separator cần

### 3. form/index.tsx (ContractForm)
- Chuyển breadcrumb + headerRight từ FullpageFormShell props → useSetHeaderSlots()
- Pattern tham khảo: contract-detail-client.tsx hoặc gallery-full-page.tsx (đã dùng HeaderSlotsContext)
- Bottom bar: FormActions variant="fixed" giữ nguyên (nằm ngoài AppShell main)

### 4. header.tsx
- Xóa isFullpageForm logic (L96) — redundant

### 5. utilities.css
- Xóa .mobile-header-spacer (L51-58) — dead code

## Files tham khảo (ĐỌC TRƯỚC KHI PLAN)

| File | Tại sao đọc |
|------|------------|
| components/layout/header.tsx | SSOT header, hiểu slots render |
| components/layout/app-shell.tsx | FULLPAGE_PATTERNS, main padding logic |
| components/layout/fullpage-form-shell.tsx | Code cần refactor |
| components/contracts/form/index.tsx | Nơi dùng FullpageFormShell |
| contexts/header-slots-context.tsx | Hook useSetHeaderSlots |
| components/contracts/detail/contract-detail-client.tsx | PATTERN MẪU HeaderSlotsContext |
| components/contracts/gallery/gallery-full-page.tsx | PATTERN MẪU HeaderSlotsContext |
| app/styles/utilities.css | Dead code cần xóa |
| tasks/lessons.md | Lesson #64 (no border), #63 (max-lg), #82 (transform none) |
| tasks/gates/before-edit.md | Gate bắt buộc trước khi edit |

## Yêu cầu

1. Đọc tasks/pre-code-checklist.md + tasks/lessons.md + tasks/gates/before-edit.md
2. Đọc 2 file PATTERN MẪU (contract-detail-client.tsx + gallery-full-page.tsx) để hiểu cách dùng useSetHeaderSlots
3. Mở browser mobile 375px xem /contracts/create hiện tại TRƯỚC khi plan
4. Viết plan chi tiết: file → dòng → sửa gì / xóa gì / thêm gì, kèm diff
5. Đặc biệt lưu ý: BottomNav sẽ hiện lại khi xóa FULLPAGE_PATTERNS → FormActions fixed bottom có bị chồng BottomNav không?
6. Trình plan cho anh duyệt, KHÔNG CODE
