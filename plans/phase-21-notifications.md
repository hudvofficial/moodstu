# Phase 21: Notifications

**Status:** ⬜ Backlog
**Dependencies:** Phase 01 (Foundation), Phase 04 (Contracts)
**Est.:** 1 day

## Objective

In-app notifications: nhắc thanh toán, deadline task, assign job, system alerts.

## Implementation Steps

- [ ] DB: Bảng `notifications` (employee_id, title, content, type ENUM, is_read, link_url)
- [ ] Notification bell trên header (unread count badge)
- [ ] Notification dropdown list
- [ ] Mark as read (single + mark all)
- [ ] Auto-generate notifications:
  - Payment due soon (3 ngày trước due_date)
  - Task assigned
  - Contract status changed
  - Request approved/rejected
- [ ] Realtime: useRealtime('notifications') → live update bell count
- [ ] Filter: All / Unread

## Test Criteria
- [ ] Auto-notify khi assign task OK
- [ ] Bell count update realtime
- [ ] Mark as read works
- [ ] Click notification → navigate to link_url

---
**Next Phase:** → Phase 22 (Settings)
