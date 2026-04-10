# Phase 01: Cải thiện Error Handler
Status: ⬜ Pending
Dependencies: None

## Objective
Hiện tại `auth_utils.ts` đang ép cứng `err instanceof Error`. Tuy nhiên `PostgrestError` từ Supabase là một object JSON tĩnh nên check này trả về `false`, khiến server lúc nào cũng ném ra chữ `"Loi server"` vô dụng. Cần sửa để nó có thể bóc lớp message thật ra.

## Requirements
### Functional
- [ ] Cập nhật `withAuth` và `withAdmin` trong `auth_utils.ts`.
- [ ] Nhận diện được object có chứa field `message`.
- [ ] Đảm bảo fallback "Loi server" chỉ diễn ra khi thực sự `err` rỗng/null, tránh nuốt chửng `err.message` từ Supabase.

### Non-Functional
- [ ] Maintainability: Không làm hỏng các nơi đang xài `withAuth`.

## Implementation Steps
1. [ ] Mở file `lib/auth_utils.ts`.
2. [ ] Sửa lại logic gán biến `message` trong block `catch` của `withAuth`.
3. [ ] Làm tương tự với `withAdmin`.

## Files to Create/Modify
- `lib/auth_utils.ts` - Fix lại điều kiện ternary check error

## Test Criteria
- [ ] Nếu quăng ra Exception string, nó phải log string.
- [ ] Nếu truy vấn rớt (Ambiguous FK), giao diện SWR phải nhận được dòng "Could not embed because more than one relationship was found..."

---
Next Phase: phase-02-lead-actions-fk-disambiguation.md
