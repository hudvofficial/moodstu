# Phase 01: V-GATE — Screenshot + Compare
Status: ✅ Complete

## Results

### Current Code (dress-drawer-content.tsx)
- **InfoSection (L36-100):** Stack DỌC — image `max-w-[200px]` riêng 1 block → `form-grid-2col` phía dưới
- **Actions (L239):** `flex flex-col gap-2` — buttons XẾP DỌC, mỗi button `w-full`
- **Notes (L91):** plain text, không có bg card
- **Prices:** nằm trong grid 2col chung với metadata (ko tách riêng)

### Stitch Target (HTML L123-179)
- **InfoSection:** `flex gap-5` — image `w-1/3` + info `w-2/3` CÙNG HÀNG
- **Actions:** `flex flex-col gap-3` (Stitch stack) → User override: **1 hàng ngang**
- **Notes:** `bg-surface-container-low p-4 rounded-xl` (card tonal)
- **Prices:** tách riêng, `border-t` ngăn, giá thuê `text-lg font-bold`

### 7 Sai lệch Visual

| # | Element | Hiện tại | Stitch Target |
|---|---------|----------|---------------|
| 1 | Image+Info | Stack dọc | Flex row (w-1/3 + w-2/3) |
| 2 | Badges | Mã trong grid | Badges inline ở đầu info |
| 3 | Metadata | `form-grid-2col` (6 items) | `grid-cols-2` (3 items: cat/size/color) |
| 4 | Prices | Trong grid chung | Tách riêng, giá thuê `text-lg bold` |
| 5 | Notes | Plain text | Card tonal bg `rounded-xl` |
| 6 | Buttons | Stack dọc | 1 hàng ngang (user feedback) |
| 7 | Condition | Trong grid | Badge inline cạnh mã |

### Screenshots
- Grid page: `dress_grid_current_1774545212909.png` ✅
- Drawer: Không chụp được (browser EOF) — dùng code analysis thay thế

---
Next Phase: [phase-02-refactor-layout.md](./phase-02-refactor-layout.md)
