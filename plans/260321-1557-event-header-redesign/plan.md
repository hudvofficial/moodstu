# Plan: Event Timeline Header Redesign
Created: 2026-03-21 15:57
Status: 🟡 In Progress

## Overview
Redesign header "Lịch trình sự kiện" theo mockup mới:
- Calendar icon trong box bo góc nền nhạt
- Title lớn hơn + Badge tổng số (IN HOA) cạnh title
- Subtitle dòng dưới
- Button `+ Thêm lịch` dùng `btn btn-outline` token
- **100% SSOT tokens** — không dùng bất kỳ giá trị inline nào

## Design Reference (Mockup)
```
[📅-box]  Lịch trình sự kiện  [8 SỰ KIỆN]           [+ Thêm lịch]
          Dự án: Mood Studio · 2026
```

## Token Mapping
| Element          | Token sử dụng                              |
|------------------|-------------------------------------------|
| Icon box         | `icon-box` + `bg-[primary/10]` (xem note) |
| Title            | `text-body-sm font-bold text-text-primary` |
| Badge            | `badge badge-neutral` + uppercase          |
| Subtitle         | `text-caption`                             |
| Button           | `btn btn-outline`                          |
| Layout           | Flex + `gap-*` Tailwind tokens             |

> **Note icon-box:** Token `icon-box` đã có sẵn (40x40 rounded). Đổi size xuống 36x36 cho compact hơn.

## Assumptions (chờ anh confirm)
1. **Subtitle** = `"Dự án: Mood Studio · {năm}"` — cố định
2. **Badge** = tổng số events (VD: `8 SỰ KIỆN`), không hiện completion ratio ở header

## Phases

| Phase | Name                  | Status     | Progress | Est   |
|-------|-----------------------|------------|----------|-------|
| 01    | Fix Token Compliance  | ⬜ Pending | 0%       | 10min |
| 02    | Redesign Header       | ⬜ Pending | 0%       | 15min |

## Progress
- Phase 01: ✅ Backend actions (đã xong từ plan trước)
- Phase 02: ✅ Add Event Modal (đã xong từ plan trước)
- Phase 03: ✅ Wire UI (đã xong từ plan trước)
- **NEW** Phase: Header redesign (plan này)
