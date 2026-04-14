# 💡 BRIEF: Chi tiết Phiếu Thu (Receipt Detail & Print View)

**Ngày tạo:** 2026-04-14
**Nguồn tham khảo:** Bản gốc V1 (`C:\Users\Admin\Desktop\Ai\0Moodstudio\webapp\app\(protected)\finance\receipts\[id]\page.tsx`)

---

## 1. VẤN ĐỀ & MỤC TIÊU
- Kế toán và bộ phận tài chính cần một trang chi tiết để xem lại chính xác thông tin của một phiếu thu (phiếu cọc, phiếu thanh toán...).
- Cần màn hình này để **In (Print)** ra giấy A5 hoặc xuất PDF gửi cho khách hàng (thay vì biên lai viết tay).

## 2. ĐỐI TƯỢNG SỬ DỤNG
- **Kế toán / Quản lý:** Kiểm tra lại nguồn tiền, đối soát giao dịch.
- **Khách hàng (Gián tiếp):** Nhận bản in A5/PDF của màn hình này làm bằng chứng thanh toán.

## 3. PHÂN TÍCH V1 -> ĐIỂM CHUYỂN GIAO (V2)

### Kế thừa từ V1 (Cần giữ lại):
- **Layout Giấy tờ (Document Card):** Giao diện mô phỏng "Mẫu số 01-tt" (TT số 200/2014/TT-BTC) chuẩn kế toán Việt Nam.
- **Tính năng Print-friendly:** Ẩn các nút bấm, breadcrumbs khi in bằng `@media print { @page { size: A5 landscape } }`.
- **Thông tin liên kết:** Pull tên khách hàng, mã hợp đồng từ table `contracts`.
- **Đọc số tiền bằng chữ:** Sử dụng hàm `readMoney()` để dịch số ra chữ (ví dụ: "Năm triệu đồng chẵn").
- **Khu vực chữ ký ảo:** Chữ ký đóng dấu ("Đã thu"), chữ ký khách hàng.
- **Studio Branding:** Lấy logo và thông tin từ bảng `studio_info`.

### Cải tiến cho V2 (Technical & Design Optimization):
- **Tối ưu Server Performance (Parallel Data Fetching):** Thay vì fetch tuần tự (lấy `studio_info` xong mới lấy `receipts`), V2 sẽ dùng `Promise.all` để lấy đồng thời cả hai, giảm 50% thời gian load TTFB.
- **Next.js Native Error Handling:** Thay vì render một UI lỗi (404) custom lồng bên trong page như V1, V2 sẽ gọi hàm `notFound()` chuẩn của Next.js App Router hoặc `error.tsx` để tối ưu SEO và cấu trúc.
- **SSOT Components:** Thay vì hardcode định dạng tiền và thẻ badge, V2 sẽ tái sử dụng triệt để `formatVnd`, `financeStatusVariant` từ `finance-format.tsx` đúng chuẩn Gold Standard.
- **Print CSS bằng Tailwind Utilities:** Gỡ bỏ thẻ `<style>` lồng trong JSX của V1, chuyển toàn bộ rules in ấn thành các class `print:*` (vd: `print:shadow-none`, `print:p-0`) của Tailwind để giữ file TSX cực kỳ clean.
- **SSR Client Bóc Tách:** Bóc tách phần nút bấm In (`PrintActions`) thành Client Component riêng biệt, trong khi core layout giữ hoàn toàn ở Server Component.

## 4. TÍNH NĂNG (SCOPE)

### 🚀 MVP (Bắt buộc có):
- [ ] Giao diện "Mẫu biên lai" có đầy đủ thông tin: Người nộp, Nội dung, Số tiền (Số + Chữ), Hình thức.
- [ ] Logic fetch data từ `receipts` + Tàu ngầm join `contracts` & `studio_info`.
- [ ] Giao diện chia 3 cột chữ ký ở cuối trang.
- [ ] Component `<PrintActions />` xử lý gọi lệnh `window.print()`.
- [ ] Tích hợp CSS `@media print` chuẩn form A5 ngang (Landscape).

### 🎁 Phase 2 / Nice-to-have:
- [ ] Nút "Gửi Zalo" (Share hình ảnh biên lai trực tiếp).
- [ ] Nhúng QR Code thanh toán nếu phiếu này chưa được thanh toán đủ (Status = Pending).

## 5. ƯỚC TÍNH SƠ BỘ
- **Độ phức tạp:** 🟢 Đơn giản (Chỉ là Read-only Document Component, không có Form/Mutation logic phức tạp).
- **Rủi ro:** Cần căn chỉnh kĩ `@media print` vì giao diện In thường dễ bị vỡ trang hoặc mất nền trên các trình duyệt khác nhau.

## 6. BƯỚC TIẾP THEO
→ User duyệt Brief và gõ `/plan` để AI thiết kế kiến trúc Component cho V2.
