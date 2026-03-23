@[/plan] Di chuyển badge mã HĐ từ header xuống body form

## Bối cảnh

Sau refactor HeaderSlotsContext, badge mã hợp đồng (HĐ-2026-0009) đang nằm trong header rightSlot. Trên mobile 375px header bị chật — title "Tạo hợp đồng mới" chồng lên badge dù đã thêm max-width.

## Tham khảo V1

V1 đặt mã HĐ ở bên phải section title (cùng dòng với "1. Hợp đồng & Khách hàng"):
```
📋 1. Hợp đồng & Khách hàng          Mã Hợp đồng
                                      HĐ-2026-0017 📋
```

## Mục tiêu

1. **Header mobile** chỉ còn: ← Back + "Tạo hợp đồng mới" (KHÔNG badge)
2. **Badge mã HĐ** di chuyển vào body form — cùng dòng với title "1. Thông tin hợp đồng" (bên phải)
3. Header clean, không chồng, không cần max-width hack

## Câu hỏi cần trả lời

1. Badge mã HĐ nên ở vị trí nào chính xác trong form body?
   - Option A: Cùng line với "1. Thông tin hợp đồng" (align right) — giống V1
   - Option B: Dưới breadcrumb, trên section 1 — standalone row
   
2. Badge style giữ nguyên (outline + icon) hay đổi theo V1 (text + mã bên dưới)?

3. Có rollback max-width hack trên header.tsx L154 không? (vì không cần nữa khi badge đã di chuyển)

## Files liên quan

- components/contracts/form/index.tsx — L77-94 (useSetHeaderSlots, nơi set rightSlot badge)
- components/layout/header.tsx — L154 (max-width hack có thể rollback)
- Section "1. Thông tin hợp đồng" — cần xác định file nào render section này

## Yêu cầu

1. Mở browser 375px /contracts/create — screenshot hiện tại
2. Đề xuất 2 options layout cho badge trong body
3. So sánh visual với V1 reference
4. Chờ anh duyệt plan trước khi code
