# Phase 09: Calendar

**Status:** 🟡 Stitch Done (2/2 screens)
**Dependencies:** Phase 08 (Team Media), Phase 04 (Contracts)
**Est.:** 1 day

## Objective

Lịch chụp dạng calendar view. Assign team media theo ngày, check conflict member, color-coded theo loại DV.

## Implementation Steps

- [ ] DB: Bảng `schedules` (date, contract_id, team_members[], location, notes, type)
- [ ] Calendar view (month/week/day toggle)
- [ ] Color-coded events theo loại DV (Cưới=hồng, Baby=xanh, Concept=tím...)
- [ ] Assign team members vào schedule
- [ ] Conflict check: 1 member không nhận 2 lịch cùng thời điểm
- [ ] Quick create schedule từ contract detail
- [ ] Mobile: swipe giữa ngày, tap = xem chi tiết

## V1 Lessons
- v1 tích hợp Google Calendar — v2 để Backlog, chỉ làm internal calendar trước
- Date navigation cần pre-fetch data tháng trước/sau

## Test Criteria
- [ ] Calendar hiển thị đúng events
- [ ] Conflict check chặn duplicate member + thời gian
- [ ] Color mapping đúng theo loại DV
- [ ] Mobile swipe mượt

---
**Next Phase:** → Phase 10 (Services Catalog)
