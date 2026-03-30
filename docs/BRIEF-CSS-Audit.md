# 💡 BRIEF: Tổng kiểm tra Component Services (Phục hồi cấu trúc Token hệ thống)

**Ngày cập nhật:** 30/03/2026
**Tài liệu lõi (SSOT):** `docs/design-tokens-cheatsheet.md`

## 1. VẤN ĐỀ CẦN TIÊU DIỆT (ROOT CAUSE)
- **Tình trạng:** Sửa mù (vi phạm V-Gate V1, V3) dẫn đến code rác. Cụ thể là dùng mặc định Tailwind (px-4, py-2, w-4.5) và inline logic thay vì thừa kế `.btn-interactive`, `.tab-pill` hay `.btn-icon` từ kho CSS Token chuẩn.
- **Bug hệ quả:** Nút search mobile (mang class `.btn-icon` với `display: inline-flex`) ghi đè luôn `lg:hidden` của Tailwind, hiển thị lỗi lòi ra ở màn hình Desktop (Lesson #57).

## 2. KẾ HOẠCH BÀI TRỪ "TAILWIND RÁC" (The Token Mapping)

### Component 1: `service-filters.tsx`
| Element | Thực trạng (Dirty) | Token Kế Thừa (Theo Cheat Sheet) |
|---------|-------------------------|--------------------------------|
| Search Box (Mobile) | `<button className="lg:hidden btn-icon ...">` | `<div className="lg:hidden"><button className="btn-icon">` |
| Search Box (Desktop) | Inline input padding, gap tự chế | Giữ `.section-search-inline` nhưng làm sạch các class text thừa. |
| Toggle View (Segmented) | `<div className="p-1.5 rounded-md... bg-bg-card">` | Chuyển hẳn sang cấu trúc `.tab-pill` hoặc reset lại wrapper sạch sẽ đồng bộ HIG. |

### Component 2: `services-list-client.tsx`
| Element | Thực trạng (Dirty) | Token Kế Thừa (Theo Cheat Sheet) |
|---------|-------------------------|--------------------------------|
| Header Container | `<div className="flex items-center justify-between">` | Giữ nguyên (bố cục flex). |
| Button Thêm mới | Vẫn còn tàn dư text/icon alignment hoặc rủi ro vỡ CSS | Reset cứng `<button className="btn btn-interactive">` |

## 3. SCOPE TRIỂN KHAI `/code`
1. Đọc lại thẻ rác trong `service-filters.tsx` & `services-list-client.tsx`.
2. Clean triệt để và gán class thẳng từ file `design-tokens-cheatsheet.md`.
3. Lưu ý Lesson #57: bọc tag `lg:hidden` ở ngoài, không gắn chung với class có display tĩnh của SSOT.

## 4. NEXT STEP
Đợi User gõ `/plan` để xác nhận Brief. 🚀
