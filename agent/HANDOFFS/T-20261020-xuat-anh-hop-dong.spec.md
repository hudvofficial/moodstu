# T-20261020-xuat-anh-hop-dong — Lưu hợp đồng dạng HÌNH ẢNH song song với PDF

**Owner:** claude · **Trạng thái:** chủ yêu cầu triển khai trực tiếp 20/10 ("triển khai lưu hợp đồng dạng hình ảnh song song vs lưu pdf") · **DB:** không · **ADR:** không (UI, không thêm thư viện, không đổi data-flow) · **Liên quan:** `lib/contracts/pdf-export.ts` (commit `2ee162f9`), trang `/contracts/[id]/print?isExportMode=true`.

## Mục tiêu
Trên trang xuất hợp đồng, ngoài "Lưu / chia sẻ PDF" có thêm nút **lưu ảnh**. Trên iPhone, chia sẻ file ảnh mở bảng chia sẻ có "Lưu hình ảnh" (vào Ảnh) và gửi Zalo/Messenger dạng ảnh xem được ngay.

## Quyết định mặc định (chủ đổi được)
- **Định dạng JPG**, chất lượng 0,92 — cùng thông số ảnh nhúng trong PDF hiện tại; nhẹ hơn PNG nhiều lần.
- **Một ảnh cho cả hợp đồng** (không cắt trang). Hợp đồng A5 thường 1 trang.
- **Độ phân giải = PDF** (scale 2 ≈ 192dpi trên khổ A5) — đủ rõ điều khoản chữ nhỏ.
- **Dựng một lần cho cả hai:** dựng canvas một lần rồi lấy ra cả PDF lẫn ảnh (`html2pdf` có sẵn: `toCanvas()` → `get('canvas')` → `toPdf()` dùng lại canvas đó). **Không thêm thư viện**, không import `html2canvas` trực tiếp (là phụ thuộc gián tiếp; Vercel cài bằng pnpm nên import gián tiếp dễ vỡ).
- Tên file: `HOP-DONG-<mã>.pdf` / `HOP-DONG-<mã>.jpg`.

## Phạm vi
1. `lib/contracts/pdf-export.ts`: hàm `renderContractExports(element, { filename, scale })` → `{ pdf: Blob, image: Blob }` (một lần dựng); tổng quát `deliverPdf` thành `deliverFile(blob, filename, { mimeType, preferShare })` và giữ `deliverPdf` gọi lại hàm chung (không chép logic). Unit test cho file ảnh.
2. `components/contracts/print/print-contract-client.tsx`: dựng sẵn cả hai; thêm nút "Lưu ảnh" cạnh nút PDF; cùng luật thao tác chạm như PDF (điện thoại: bấm khi file đã sẵn sàng mới chia sẻ; bấm sớm chỉ dựng). Máy tính: PDF vẫn tự tải như cũ, ảnh tải khi bấm.

## Verify
jest `pdf-export` (thêm ca ảnh) · eslint/tsc/build · pane mobile @375: dựng 1 lần ra cả 2 file (đo loại/kích thước/số pixel ảnh), nút ảnh chia sẻ đúng `image/jpeg`; desktop: PDF tự tải, nút ảnh tải `.jpg` · đo thời gian dựng trước/sau (không được gấp đôi).

## Kết quả (20/10/2026) — code + test + verify xong, CHƯA commit/push
**File đổi:** `lib/contracts/pdf-export.ts` (`renderContractExports` thay `renderContractPdfBlob`; `deliverFile` chung, `deliverPdf` gọi lại nó), `components/contracts/print/print-contract-client.tsx` (nút "Lưu ảnh"/"Tải ảnh (JPG)" cạnh nút PDF; dựng sẵn cả hai; nút Quay lại chỉ còn icon trên điện thoại để vừa 3 nút), `tests/unit/pdf-export.test.ts` (+3 ca ảnh).

| Kiểm | Kết quả |
|---|---|
| jest `pdf-export` | 14/14 |
| jest toàn bộ `tests/unit` | 621 pass; 4 suite fail có sẵn (gallery-note-download, moodie-*) + `ledger-fallback-sort` chập chờn khi chạy chung (chạy riêng 2 lần đều 5/5) |
| eslint 3 file | 0 lỗi (1 cảnh báo có sẵn từ trước ở print-contract-client) · `tsc` sạch · `npm run build` sạch |
| Pane mobile @375 (Web Share giả lập) | nút "Lưu ảnh" → file `HOP-DONG-HĐ-2026-0075.jpg`, `image/jpeg`, mã đầu `ffd8ffe0` (JPEG thật), **1120×1588 px**, 186.851 byte; nút "Lưu PDF" → `.pdf`, mã đầu `%PDF`, 190.196 byte (bằng đúng bản trước → PDF không đổi). "Không dựng 2 lần" dựa trên **mã** html2pdf (`toPdf()` dùng lại `prop.canvas` có sẵn), chưa đo riêng thời gian dựng; không tràn ngang (`scrollWidth` 375) |
| Pane desktop | PDF vẫn tự tải khi mở trang; bấm "Tải ảnh (JPG)" → tải ngay `.jpg` 186.851 byte (dùng lại bản đã dựng, ~0,8s) |

Chưa kiểm: iPhone thật (bảng chia sẻ có "Lưu hình ảnh" là hành vi iOS, chưa thấy tận mắt).
