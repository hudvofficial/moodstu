# V0-LOG — thước đo tuần (chuẩn S4)

Sinh bởi `node scripts/v0-snapshot.mjs` mỗi thứ Hai. Chỉ đọc. Ngưỡng theo C0: vàng >26 ngày, đỏ >43 ngày kể từ ngày chụp.
Đích 90 ngày (G3): tiền kẹt ≤46tr · đỏ ≤5 · thu-đủ-chưa-đóng = 0 · nợ lab khớp thực tế.

| Ngày | HĐ đang chạy | …thiếu ngày chụp | Tiền kẹt (đ) | Vàng >26d | Đỏ >43d | Già nhất (ngày) | Thu đủ chưa đóng | Phải thu (RPC) | Nợ lab (RPC) | HĐ có đơn in đang mở |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| 2026-09-02 | 29 | 4 | 92.575.000 | 17 | 13 | 119 | 9 | 92.575.000 | 1.905.000 | 5 |
| 2026-09-06 ¹ | 29 | 4 | 92.575.000 | 17 | 14 | 122 | 9 | 92.575.000 | 1.905.000 | 5 |

¹ Chạy sớm 4 ngày theo lệnh chủ (`/buoc #11`, 06/09 06:00) thay cho thứ Hai 08/09; script ghi nhầm 05/09 vì lấy ngày UTC — đã sửa sang giờ VN. **Đọc số:** so 02/09 không thay đổi vận hành nào — 5 HĐ #6 vẫn `paid = 0`, 9 HĐ thu-đủ-chưa-đóng vẫn 9; chỉ tuổi tăng theo lịch (đỏ 13→14, già nhất 119→122). Tiền kẹt 92,575tr gồm cả cọc có thể thu ngoài sổ (16 HĐ paid = 0) — khi chủ ghi cọc (#6), số này giảm do **ghi đúng**, không phải thu thêm. Sổ T8 `cash_out` đã bớt 1,7tr phiếu chi E2E giả (dọn 05/09) — không ảnh hưởng cột nào ở đây.

² 06/09 07:36 — sau khi chủ đóng 7 HĐ thu đủ: **thu-đủ-chưa-đóng 9 → 2** (còn 0003, 0008 mở có chủ đích). Ghi ngoài nhịp để V0 lần 3 (15/09) có mốc so.
