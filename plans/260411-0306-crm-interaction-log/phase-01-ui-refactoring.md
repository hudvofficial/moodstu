# Phase 01: Cấu trúc lại UI Component
Status: ⬜ Pending

## Objective
Gom cụm Dropdown chọn loại và Textarea nội dung vào duy nhất 1 Hộp nhập liệu (Editor Component) theo trường phái thiết kế tối giản, triệt tiêu lỗi vỡ layout khi Focus và giảm thiểu độ ồn thị giác (nhiều viền).

## Requirements
### Functional
- [ ] Giữ nguyên khả năng gõ chữ và chọn loại tương tác nhưng trong giao diện "mô phỏng" Editor Box tích hợp.
- [ ] Thêm `onMouseDown={(e) => e.preventDefault()}` cho nút Submit để loại bỏ hoàn toàn `setTimeout` chắp vá trong Blur.

### Design (Apple HIG / Stripe Component)
- [ ] Xóa class `input-base` ra khỏi `Textarea`, bổ sung `border-none focus:ring-0 focus-visible:ring-0 resize-none`. Textarea bây giờ sẽ là vô hình, mượn khung của Container ngoài làm viền.
- [ ] Đẩy `SelectForm` (chọn 'Gọi điện', 'Gặp mặt', v.v.) xuống phần Footer của Box này. Thiết lập nó nằm góc trái dưới cùng, nhỏ gọn.
- [ ] Nút Save (Lưu) đặt bên góc phải dưới cùng, đối lưng với Select. Layout Footer bọc chúng sẽ là `flex justify-between items-center bg-bg-muted/30 p-2 border-t border-border/30` nếu cần ngăn cách, hoặc nền trong suốt (p-2).

## Implementation Steps
1. [ ] **Tháo kén:** Bọc lại Textarea + Select + Button trong thẻ `<div className="relative flex flex-col bg-bg-base border border-border/50 rounded-xl shadow-xs transition-colors focus-within:border-primary focus-within:ring-1 focus-within:ring-primary overflow-hidden">`
2. [ ] **Tuốt lại Textarea:** Dùng `className="w-full border-none focus-visible:ring-0 focus:ring-0 min-h-[80px] p-3 text-sm bg-transparent resize-none"`
3. [ ] **Thanh Toolbar Footer:** Đặt Dropdown và Nút Gửi nằm chung một dòng: 
       ```tsx 
       <div className="flex justify-between items-center px-1 pb-1 pt-0">
           <SelectForm className="border-none bg-transparent shadow-none w-[110px]"... />
           <Button>Lưu</Button>
       </div>
       ```
4. [ ] **Clean Code logic:** Xóa bỏ delay `setTimeout()` ở `onBlur`. Chỉnh `onMouseDown={e => e.preventDefault()}` ở Nút Lưu.

## Files to Modify
- `components/crm/lead-care-log.tsx`

---
Tiến hành với câu lệnh: `/code phase-01`
