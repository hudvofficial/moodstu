# Plan: Event Timeline — Hoàn thiện nghiệp vụ V1 + V2 Standards
Created: 2026-03-21T02:21:00+07:00
Status: 🟡 In Progress

## Overview
Bổ sung toàn bộ logic nghiệp vụ event management mà V1 đã có nhưng V2 thiếu.
V2 = V1 logic + tối ưu (server actions, SSOT tokens, proper typing).

## Nguyên tắc
- **Logic nghiệp vụ:** V1 = source of truth, giữ nguyên 100%
- **Layer vỏ bọc:** V2 standards (withAuth, SSOT tokens, Lucide, proper types)

## Phases

| Phase | Name | Status | Effort |
|-------|------|--------|--------|
| 01 | Server Actions — Event CRUD | ✅ | 20 min |
| 02 | Modal Header — DatePicker + info pills | ✅ | 15 min |
| 03 | Auto Status — checkAndCompleteEvent | ✅ (đã có sẵn) | 0 min |
| 04 | Build + Browser Verify | ✅ (build pass, anh verify UI) | 0 min |

---
