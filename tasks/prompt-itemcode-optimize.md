@[/plan]Lên kế hoạch tối ưu item_code auto-gen trong Dresses module

## Bối cảnh
- File: app/actions/dress-mutations.ts, function createDress (L26-41 auto-gen, L58-82 error handling)
- Hiện tại dùng COUNT(active items) + 1 để gen mã trang phục tự động
- BUG: khi xóa mềm 1 item → COUNT giảm → gen mã TRÙNG với item đã tồn tại
- VD: tạo VC-001, VC-002, VC-003 → xóa mềm VC-002 → COUNT=2 → gen VC-003 → TRÙNG

## Approach đã brainstorm + duyệt: MAX() parse
- Thay COUNT bằng query MAX(item_code) theo category (KHÔNG filter deleted_at → lấy số lớn nhất từng tồn tại)
- Parse số cuối: "VC-003" → 3
- Gen: prefix + (max + 1) → "VC-004"
- Giữ retry 23505 làm safety net cho race condition
- Retry cũng dùng parse thay vì count+2

## Scope
- CHỈ sửa 1 file: app/actions/dress-mutations.ts
- CHỈ sửa 1 function: createDress
- 2 block thay thế: auto-gen (L26-41) + retry (L60-62)
- Xóa biến `count` không còn cần
- Không thêm migration, không thêm RPC, không đổi DB schema

## Yêu cầu plan
1. Liệt kê chính xác block code cũ cần xóa (line numbers)
2. Viết block code mới thay thế
3. Verification: tsc --noEmit + test scenario (tạo → xóa mềm → tạo lại → mã không trùng)
