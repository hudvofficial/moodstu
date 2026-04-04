# Plan: Printing Module UI & Performance Protocol (V2 Gold Standard)

Created: 260404-1049
Status: 🟡 In Progress

## Overview

Dự án nhằm mục tiêu Audit và đồng bộ hoá toàn bộ module `/printing` về **V2 Gold Standard**. Thông qua Audit, phát hiện các Anti-pattern như sử dụng inline styling/hardcode background (`bg-primary/10`, `bg-bg-subtle/50`), cấu trúc thẻ lồng (nested `card-base` inside nested backgrounds), các class padding cứng trong Table, và Layout chưa được scale chuẩn Apple HIG / Stripe Style. Toàn bộ UI sẽ được làm gọn, làm nhẹ (flat ui, less-is-more) nhưng KHÔNG thay đổi logic nghiệp vụ.

## Tech Stack

- Frontend: Next.js (App Router), Tailwind V4
- Styling framework: SSOT Tokens (`bg-bg-card`, `<Badge>`, `text-xs`)

## Anti-Pattern Findings (Audit Result)

1. **`printing-mobile-grouped.tsx`**:
   - Đang dùng class `bg-primary/10 text-tiny`, `bg-success/10` cho các badges thay vì gọi Component `<Badge>` dùng chung.
   - Khi mở card group, block render orders bên trong đang xài `border-border/30 bg-bg-subtle/50 space-y-2` thủ công, ép các UI card con vào 1 container tạo cảm giác chật chội.
2. **`printing-card.tsx`**:
   - Hiện bị bọc bằng `card-base`, dẫn tới việc nếu render ở màn `/printing` thông qua group thì sinh ra "Card lồng Card" (Shadow lồng shadow rườm rà). Giống hệt lỗi vừa fix ở `/productivity`.
3. **`printing-list-page.tsx` & `printing-table.tsx`**:
   - Bố cục filter và toolbar trên Desktop / Mobile có thể chưa được rút gọn chung bằng `PrintingFiltersBar` một cách mượt mà nhất. Table đang xài padding hardcode `px-3 py-2.5` thay vì token class chuẩn.

## Phases

| Phase | Name                                    | Status     | Progress |
| ----- | --------------------------------------- | ---------- | -------- |
| 01    | Refactor Mobile Grouped & Badges        | ⬜ Pending | 0%       |
| 02    | Decouple Printing Card (Remove Nesting) | ⬜ Pending | 0%       |
| 03    | Desktop Table Padding Standardization   | ⬜ Pending | 0%       |
| 04    | Visual UI Check & Polish                | ⬜ Pending | 0%       |

## Quick Commands

- Start Phase 1: `/code phase-01`
- Check progress: `/next`
- Save context: `/save-brain`
