/audit Audit chuyên sâu header spacing mobile — Mood Studio V2

## Bối cảnh

V2 hiện có Dashboard + Contract module. Module khác chưa triển khai — KHÔNG audit.
Header system: header.tsx (SSOT), HeaderSlotsContext cho detail pages.

## Gợi ý (từ session trước — CẦN VERIFY lại bằng code)

- Header mobile cao 56px (--header-mobile-h: 3.5rem)
- Main padding normal: px-2 py-4
- /contracts/create match FULLPAGE_PATTERNS → header ẩn, main padding ""
- /gallery match NO_PADDING_PATTERNS → main chỉ pb-28
- /contracts/create có gap thừa ~45px phía trên — đã biết lỗi

## Phạm vi (5 trang)

1. /dashboard
2. /contracts
3. /contracts
4. /contracts/[id] (dùng HĐ thật — navigate từ /contracts click HĐ đầu tiên)
5. /contracts/[id]/gallery (thêm /gallery vào URL detail)

## Phương pháp (3 bước, PHẢI theo thứ tự)

### Bước 1: Đọc code — lấy giá trị chính xác

Đọc 4 file, ghi ra giá trị CHÍNH XÁC:

1. components/layout/app-shell.tsx
   - FULLPAGE_PATTERNS → trang nào match?
   - NO_PADDING_PATTERNS → trang nào match?
   - Main padding class cho từng case (normal, fullpage, noPadding) → convert ra px

2. components/layout/header.tsx
   - Height: class/token nào quy định? → px chính xác
   - isFullpageForm logic (line ~96) → ảnh hưởng gì?
   - Scroll hide/show logic

3. app/styles/utilities.css
   - --header-mobile-h, --header-desktop-h → giá trị
   - .mobile-header-spacer → có được dùng ở đâu không? (grep)

4. Grep tìm file render /contracts/create
   - Header giả render ở đâu? Component nào?
   - Padding/margin của form wrapper?

Tổng hợp thành bảng:
| Trang | Header visible? | Header height | Main padding class | Padding px | Total gap kỳ vọng |

### Bước 2: Mở browser verify (mobile 375px)

Với MỖI trang trong bảng Bước 1:
1. Screenshot trạng thái ban đầu
2. So visual gap vs bảng kỳ vọng — KHỚP hay LỆCH?
3. Scroll xuống 300px → cuộn lên: header ẩn/hiện mượt không? Content giật không?

### Bước 3: Cross-reference → Report

Bảng kết quả CUỐI CÙNG:
| Trang | Code gap (px) | Visual match? | Scroll OK? | Đánh giá | Vấn đề |

Đánh giá: ✅ Đạt | ⚠️ Lệch nhẹ | ❌ Lỗi

## Quy tắc

- KHÔNG FIX GÌ — chỉ audit + report + trình duyệt
- Nếu visual LỆCH vs code → ghi rõ lệch gì, có thể do CSS override nào
- Nếu phát hiện vấn đề ngoài scope (không liên quan spacing) → ghi note riêng, không audit thêm
