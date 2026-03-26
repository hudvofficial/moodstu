# Plan: reserveDressForContract + Fix Reservation Column Bugs
Created: 2026-03-26T16:09:00+07:00
Status: ✅ Complete

## Overview
Fix hệ thống đặt trang phục cho hợp đồng:
- Tạo `reserveDressForContract` đúng Gold Standard (thay V1 legacy bị lỗi)
- Fix sai tên cột DB trong `fetchRentalHistory`
- Migrate UI form → action mới
- Cleanup dead code

## Audit Findings
- 🔴 4 Critical (sai tên cột DB, duplicate action)
- 🟡 3 Warning (thiếu audit log, thiếu Zod, thiếu customer_id)
- ✅ 2 OK (releaseReservation, getDressAvailability)

## Phases

| Phase | Name | Status | Tasks |
|-------|------|--------|-------|
| 01 | Backend — Zod + Server Action | ✅ Complete | 4 |
| 02 | Fix Column Bugs | ✅ Complete | 2 |
| 03 | UI Migration + Cleanup | ✅ Complete | 3 |
| 04 | Verification | ✅ Complete | 3 |

**Tổng:** 12 tasks | Ước tính: 1 session

## Quick Commands
- Start: `/code phase-01`
- Check progress: `/next`
