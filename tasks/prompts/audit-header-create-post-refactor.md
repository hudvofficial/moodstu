@[/debug] Header /contracts/create bị lỗi hiển thị sau refactor

## Bối cảnh

Vừa refactor xong 4 phases: /contracts/create chuyển từ FullpageFormShell header riêng sang system header (HeaderSlotsContext). Build pass nhưng UI mobile bị lỗi.

## Screenshot lỗi

Trên mobile 375px /contracts/create:
- Title "Tạo hợp đồng mới" bị CHỒNG lên badge "HĐ-0009" — text đè lên nhau
- Chuông notification (NotificationBell) vẫn hiện — nên ẩn cho form page
- Badge bị cắt, không hiện hết

## Root cause (đã phân tích sơ bộ)

### header.tsx L154: Center title dùng absolute positioning
```tsx
<div className="absolute left-1/2 -translate-x-1/2 lg:static lg:translate-x-0 ...">
  <h1>{titleOverride || currentModule.label}</h1>
</div>
```
→ `absolute` trên mobile → title KHÔNG biết rightSlot chiếm bao nhiêu chỗ → đè lên

### header.tsx L219: NotificationBell luôn render
```tsx
{/* Notification bell */}
<NotificationBell />   // ← KHÔNG có lg:hidden hay conditional
```
→ Bell hiện trên mobile kể cả khi rightSlot đã set → chiếm thêm chỗ

### header.tsx L174-175: rightSlot đã lg:hidden đúng
```tsx
{rightSlot ? (
  <div className="lg:hidden flex items-center gap-1">{rightSlot}</div>
) : ( ... )}
```
→ rightSlot đúng nhưng bell vẫn hiện → tổng width RIGHT vượt quá → title absolute bị đè

## So sánh: /contracts/[id] (ĐÚNG) vs /contracts/create (SAI)

Trang detail dùng cùng HeaderSlotsContext nhưng KHÔNG bị lỗi. Audit cần so sánh:
- /contracts/[id] — rightSlot = ContractActionsMenu (nhỏ hơn?)
- /contracts/create — rightSlot = badge HĐ code (dài hơn?)

## Files cần audit

1. **components/layout/header.tsx** — L154 (center absolute), L170-220 (right section + bell)
2. **components/contracts/form/index.tsx** — L77-97 (useSetHeaderSlots config)
3. **components/contracts/detail/contract-detail-client.tsx** — useSetHeaderSlots (pattern mẫu ĐÚNG)

## Yêu cầu

1. Mở browser 375px xem /contracts/create + /contracts/[id] — so sánh header 2 trang
2. Xác định root cause chính xác: absolute positioning? bell? width?
3. Đề xuất fix (KHÔNG fix luôn) — chờ anh duyệt
4. Fix phải KHÔNG ảnh hưởng 4 trang đã đạt chuẩn: /dashboard, /contracts, /contracts/[id], /contracts/[id]/gallery
