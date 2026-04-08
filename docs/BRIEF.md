# 💡 BRIEF: Đồng bộ màu sắc sự kiện Google Calendar lên giao diện Mood Studio

**Ngày tạo:** 08/04/2026
**Workflow:** /brainstorm
**Tình trạng:** Đang thảo luận ý tưởng

---

## 1. VẤN ĐỀ CẦN GIẢI QUYẾT
Hiện tại, trên Lưới Lịch (Calendar Grid) của Mood Studio, mọi sự kiện kéo từ Google về đều bị "ép" chung một màu vàng hổ phách (`bg-amber-50`), có kèm logo "G". Mặc dù điều này giúp dễ phân biệt với sự kiện chuẩn của Mood, nó lại đánh mất **mã màu gốc** mà sếp đã phân bổ cẩn thận bên Google Calendar (ví dụ màu Húng quế, Trái chuối, Oải hương...). Điều này gây khó khăn khi sếp muốn dùng màu sắc để phân loại dự án một cách trực quan trên lịch.

## 2. GIẢI PHÁP ĐỀ XUẤT
**Bê nguyên bảng màu (Color Tokens) của Google Calendar đập thẳng vào thẻ sự kiện (Event Card) trên Mood Studio!**

Khi hệ thống tải sự kiện từ API của Google về:
- Đọc mã `colorId` của Google (từ 1 đến 11).
- Chuyển thành đúng chuẩn Token Hex Code tương ứng.
- Sơn lại thẻ sự kiện bằng màu nguyên bản thay vì dùng màu fake `bg-amber-50`.

## 3. INVENTORY: TÀI SẢN TOKEN ĐANG CÓ
Dạ thưa sếp, em **CÓ SẴN** toàn bộ 11 token màu gốc của hệ thống Google Event Color API. Em check trong kho `lib/utils/calendar-utils.ts` thì đây là bảng quy chiếu:

| ID | Nhãn Google (Label) | Hex Code (Tailwind) | Trực quan màu |
|:---|:---|:---|:---|
| 1 | Lavender (Hoa oải hương) | `#7986cb` | Tím pastel |
| 2 | Sage (Cây xô thơm) | `#33b679` | Xanh lục nhạt |
| 3 | Grape (Quả nho) | `#8e24aa` | Tím đậm |
| 4 | Flamingo (Hồng hạc) | `#e67c73` | Hồng cam |
| 5 | Banana (Trái chuối) | `#f6bf26` | Vàng nghệ (Trong ảnh sếp gửi là màu này) |
| 6 | Tangerine (Quýt) | `#f4511e` | Cam đậm |
| 7 | Peacock (Con công) | `#039be5` | Xanh da trời đậm |
| 8 | Graphite (Than chì) | `#616161` | Xám tối (Màu của sự kiện Sara MC) |
| 9 | Blueberry (Việt quất) | `#3f51b5` | Xanh dương đậm |
| 10 | Basil (Húng quế) | `#0b8043` | Xanh lá đậm |
| 11 | Tomato (Cà chua) | `#d50000` | Đỏ |

## 4. TÙY CHỌN HIỂN THỊ (SẾP QUYẾT ĐỊNH)

Lúc đưa các màu này ra Lưới Lịch, sếp muốn theo Style nào?

1️⃣ **Style "Solid" (Giống y hệt Google Calendar sếp vừa chụp):**
   - Background đậm màu (Solid Hex).
   - Chữ màu Trắng (`#ffffff`).
   - *Ưu điểm:* Cực kỳ nổi bật, nhìn phát biết ngay event Google. Giữ độ nguyên bản 100%.

2️⃣ **Style "Pastel / Soft" (Giống giao diện Mood hiện tại):**
   - Lấy mã màu Google nhưng làm mờ đi một chút (Opacity ~15% làm Background).
   - Chữ xài lại màu đậm của Google.
   - *Ưu điểm:* Đồng bộ với sự mềm mại của phần còn lại của Mood Studio (Hợp đồng, Task...). Không bị chói mắt.

## 5. BƯỚC TIẾP THEO
Sếp chốt cho em:
- **Có muốn làm vụ đồng bộ màu này không?**
- Nếu làm, sếp chọn **Style Solid** mạnh mẽ y hệt Google hay **Style Pastel** cho hợp mắt Mood?

Chốt xong sếp hô `/plan` là em lên bản vẽ kiến trúc ngay!
