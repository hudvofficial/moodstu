# Plan: Calendar V2 Optimization

Created: 2026-04-04
Updated: 2026-04-04 14:45 (Post Visual+UX Audit V1 Production)
Status: ✅ Complete
Audit Sources:

- `docs/reports/deep_audit_calendar_v1_vs_v2_20260404.md` (code-level)
- Browser audit V2 localhost + V1 production (visual + UX interactions)

> **Triết lý:** V2 = V1 + Tối Ưu. KHÔNG copy/paste V1. Tận dụng SSOT tokens, SWR, RBAC, DnD đã có.

## V1 UX Patterns đã xác nhận (Browser Audit)

| Pattern                        | V1 Implementation                                                     | V2 Current                 | Priority |
| ------------------------------ | --------------------------------------------------------------------- | -------------------------- | -------- |
| Ngày âm lịch trên grid         | Số nhỏ cạnh ngày dương                                                | ❌ Không có                | 🟡       |
| Mùng 1 ÂL highlight đỏ         | `1/3` đỏ, `1/11` đỏ                                                   | ❌                         | 🟡       |
| Today = tròn xanh lá           | Circle highlight rõ ràng                                              | ⚠️ Yếu                     | 🟡       |
| View tabs (5 tabs)             | `Hôm nay\|Ngày\|Tuần\|Tháng\|Board`                                   | ❌ Không có                | 🔴       |
| Grid overflow control          | Max 2-3 events/ô, compact                                             | ❌ Vỡ grid (8 events)      | 🔴       |
| Event label đẹp                | "Sara MC", "Retouch"                                                  | ❌ Raw `chup_anh`          | 🔴       |
| Click event → Detail Drawer    | Bottom sheet: title + GOOGLE badge + time + customer + notes + 4 CTAs | ❌ Chỉ có basic form       | 🔴       |
| 4 CTAs trong Detail Drawer     | Google Calendar / Tạo HĐ từ lịch / Sửa / Xóa                          | ❌                         | 🔴       |
| Click ô trống → không phản hồi | Đúng UX (tránh mở form nhầm)                                          | ❌ V2 mở thẳng EventForm   | 🔴       |
| "+" FAB → Thêm lịch drawer     | Bottom drawer with full form                                          | ✅ Có nút "Tạo lịch trình" | ⚠️       |
| Filter icon → dropdown         | Panel filter                                                          | ✅ SelectPill filters      | ✅       |
| Board view = Kanban            | 4 cột: Chờ làm/Đang làm/Chờ duyệt/Hoàn thành                          | ❌                         | 🟢 Defer |
| Month switcher = URL nav       | Chevrons < > thay đổi URL                                             | ✅                         | ✅       |
| Không swipe gesture            | Không có mobile swipe                                                 | —                          | —        |
| Scroll = main container        | Grid không scroll riêng                                               | ✅                         | ✅       |
| Google badge "GOOGLE"          | Badge xanh on event card                                              | ❌                         | 🟡       |
| Week View compact              | 7 cột, dates + event names                                            | ❌                         | 🔴       |

## Nguyên tắc xuyên suốt

| Rule                          | Enforcement                                                           |
| ----------------------------- | --------------------------------------------------------------------- |
| Max 250 lines/file            | Split nếu vượt                                                        |
| SSOT tokens only              | Dùng `design-system.css`, `calendar-utils.ts`, `getEventColorToken()` |
| SWR only (Lesson #5)          | Không manual fetch/polling — extend `use-calendar-data.ts`            |
| No border, shadow only (#64)  | Cards dùng `shadow-soft`                                              |
| No inline styles (#67, #92)   | Dùng CSS classes từ `app/styles/*.css`                                |
| RBAC (#97)                    | `editable`/`draggable` flags từ server, ownership check               |
| Best-effort Google sync (#98) | Warning field + toast feedback                                        |
| withAuth pattern (#59)        | Server actions dùng `withAuth()`                                      |
| Work type labels (#60)        | `getWorkTypeLabel()` cho display, không raw DB values                 |

## Phases (Updated)

| Phase | Name                            | Status | Scope                                          |
| ----- | ------------------------------- | ------ | ---------------------------------------------- |
| 01    | Data Layer + Server Actions     | ✅     | Backend logic + label mapping                  |
| 02    | Views + Grid Fix + Click Flow   | ✅     | Week/Day views + "+N more" + click UX          |
| 03    | EventFormDrawer + Detail Drawer | ✅     | 3-type handling + CTAs + integrations          |
| 04    | UX Polish + Performance         | ✅     | Lunar, Google badge, today highlight, keyboard |

## Quick Commands

- Start Phase 1: `/code phase-01`
- Check progress: `/next`
