# Phase 04: Fix TypeScript Errors

Status: ⬜ Pending | 🟡 In Progress | ✅ Complete
Dependencies: None (Can be run parallel)

## Objective

Dọn dẹp các cảnh báo TypeScript đang ngầm diễn ra để nâng cao điểm Stability của Code Base.

## Implementation Steps

1. [ ] Chạy lệnh `npx tsc --noEmit` để định vị và hứng lỗi.
2. [ ] Sửa nhanh các lỗi liên quan cấu trúc Params, Promise, Props thiếu thuộc tính.
3. [ ] Bổ sung các `type`/`interface` nếu thiếu.

## Test Criteria

- [ ] Lệnh `npx tsc --noEmit` chạy trơn tru, trả về Exit Code 0.

---

Next Phase: phase-05-test.md
