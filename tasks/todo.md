# Plan: Services Module - V2 Final Polish & Normalization
Status: 🟡 Khởi tạo
Created: 2026-03-31

## Mở Đầu (The Why)
Sau khi UI đã đạt mức hoàn hảo 100% SSOT (Contracts Golden Standard), chúng ta cần giải quyết "phần chìm của tảng băng":
1. Dữ liệu cũ bị nhập thô (`"dich_vu"`) khiến UI xám xịt do sai Enum.
2. Code "rác" còn sót lại từ thời V1 sau những đợt đập đi xây lại.

## Các Giai Đoạn (Phases)

| Phase | Tên Phase | Mô tả công việc (What) |
|---|---|---|
| **Phase 02** | **"Làm Sạch Đáy Biển" (Chuẩn hóa Data)** | - [x] Viết SQL Script / Supabase Migration để convert các bản ghi bảng `services`.<br>- [x] **Mapping data:** Đổi `"dich_vu"` -> thành mảng Enum chuẩn (`studio`, `ngay_cuoi`, `combo`, v.v) dựa vào keyword trong tên dịch vụ, hoặc đưa về `khac` (Khác).<br>- [x] Test thử script trên local DB trước. |
| **Phase 03** | **"Quét Rác Cuối Ngày" (Clean Up)** | - [x] Dọn dẹp các hook, tệp component UI không còn được include do V2 thay thế (ví dụ check file `quote-preview.tsx` anh đang mở có rác không).<br>- [x] Xóa bỏ những utility Tailwind dư thừa. |

## Quick Commands
👉 Bước tiếp theo: Anh muốn đi vào code **`/code phase-02`** (sửa data DB cho bung lụa màu) hay **`/code phase-03`** (dọn dẹp code rác), hay tuần tự **`/code all-phases`** luôn ạ?
