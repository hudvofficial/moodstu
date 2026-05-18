# Plan: Optimize Checklist UX (Optimistic UI)
Created: 2026-05-09T14:06:00
Status: 🟡 In Progress

## Overview
Cải thiện trải nghiệm người dùng (UX) khi thao tác với Checklist trong hợp đồng. Hiện tại, mỗi lần tick chọn một mục trong Checklist, hệ thống gọi hàm `revalidateContractCaches`, làm mới toàn bộ danh sách hợp đồng (List) và báo cáo (Stats), gây ra hiện tượng giật lag, chớp nháy UI liên tục.

Giải pháp:
1. **Cô lập Cache Invalidation**: Thay vì gọi `revalidateContractCaches` (làm mới toàn bộ), chỉ gọi `revalidateContractDetailCaches` (chỉ làm mới chi tiết hợp đồng đó).
2. **Optimistic List Update**: Tự động cập nhật (mutate) bộ nhớ đệm SWR của danh sách hợp đồng (list) ở phía Client thay vì ép SWR phải tải lại từ Server.
3. **Mute Realtime/Debounce (Tùy chọn)**: Đảm bảo Realtime channel không bắt danh sách tải lại mỗi lần có thay đổi ở bảng `contract_checklists`.

## Tech Stack
- Frontend: React (SWR, Optimistic UI mutation)
- Backend: Supabase Server Actions

## Phases

| Phase | Name | Status | Progress |
|-------|------|--------|----------|
| 01 | Targeted Cache Invalidation | ✅ Done | 100% |
| 02 | Optimistic List SWR Update | ✅ Done | 100% |
| 03 | Realtime Event Filtering | ✅ Done | 100% |
| 04 | Testing & Verification | ✅ Done | 100% |
