# /brainstorm — Tối ưu layout "Lịch trình sự kiện" trên mobile

## Vấn đề

Section "Lịch trình sự kiện" trên Contract Detail hiện hiển thị **1 cột** trên mobile → chiếm quá nhiều chiều dọc.

## Audit chi tiết

### DOM Chain (mobile 375px)

```
<main px-2>                           → 375 - 16 = 359px
  <div main-container padding 8px LR> → 359 - 16 = 343px
    <div card-base p-4>               → 343 - 32 = 311px  ← grid container
```

### Tại sao chỉ hiện 1 cột?

Code hiện tại (event-timeline.tsx L164):
```css
gridTemplateColumns: repeat(auto-fill, minmax(160px, 1fr))
```

2 cột cần: 160×2 + 8px gap = **328px**
Container thực tế: **311px**
→ **311 < 328 → chỉ fit 1 cột!** Thiếu 17px.

Comment trong code (L17-18) nói rõ ý đồ ban đầu **đã là 2 cột mobile** — đây là bug.

### Card content ở 151px — có fit không?

Nếu grid 2 cột: mỗi cột = (311 - 8) / 2 = **~151px**, trừ card padding p-3 → content width ~127px:

| Element | Width cần | Class bảo vệ | Fit? |
|---------|-----------|-------------|------|
| Badge "XONG" | ~50px | — | ✅ |
| Badge "ĐANG LÀM" | ~85px | — | ✅ |
| Title (dài) | auto | `line-clamp-2` | ✅ |
| Date + time | ~175px | `truncate` | ✅ (cắt bớt) |
| Location | ~100px | `truncate` | ✅ |
| Progress bar | flex | auto | ✅ |

→ **Tất cả content đã có truncate/line-clamp → 151px hoàn toàn fit.**

## Đề xuất fix

**Giảm minmax từ 160px → 140px** — giữ đúng ý đồ auto-fill ban đầu:

```tsx
// event-timeline.tsx L164
// TRƯỚC:
gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))"

// SAU:
gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))"
```

140×2 + 8 gap = **288px < 311px** → ✅ 2 cột mobile
140×3 + 16 gap = **436px** → tablet fit 3 cột
140×4 + 24 gap = **584px** → desktop fit 4+ cột

### Tại sao chọn auto-fill thay vì grid-cols-2 cứng?

- auto-fill tự responsive mà không cần breakpoint
- Đúng ý đồ ban đầu của code (comment L17-18)
- Trên tablet/desktop tự scale lên 3-4 cột mà không cần media query

## Constraint

- ✅ Nội dung card giữ nguyên 100%
- ✅ Chỉ thay 1 con số (160 → 140)
- ✅ Desktop/tablet tự auto-fill correct
- ❌ KHÔNG đổi logic, modal, data
