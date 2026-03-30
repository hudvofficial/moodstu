# Phase 02: Database Schema (ABC Framework)
Status: ⬜ Pending
Dependencies: Phase 01

## Objective
Thực thi di chuyển dữ liệu (Migration) cho bảng `services` để đáp ứng kiến trúc V2 (ABC Framework: Bỏ ENUM, dùng VARCHAR + TS Validation) đồng thời bổ sung các cột Tracking bảo mật dữ liệu.

## Requirements
### Functional
- [ ] Chuyển `service_type` từ cấu trúc ENUM DB cứng ngắc (`service_type_enum`) sang kiểu chữ thuần (`TEXT`/`VARCHAR(50)`).
- [ ] Bổ sung các cột lưu thông tin biến thể UI: `unit` và `fulfillment_type`.

### Non-Functional (Security & Audit)
- [ ] Bổ sung các cột Tracking bảo vệ: `created_by`, `updated_by` để truy cứu dấu vết thao tác của nhân sự.
- [ ] Bổ sung cơ chế Xóa Mềm: Thêm cột `deleted_at` (TIMESTAMP WITH TIME ZONE) để ngăn chặn Hard Delete gây lỗi dính chùm tới bảng Hợp đồng.

## Implementation Steps
1. [x] Cấu hình file Supabase Migration SQL mới (`..._update_services_abc_framework.sql`).
2. [x] Viết lệnh SQL `ALTER TABLE services ALTER COLUMN service_type TYPE TEXT`.
3. [x] Viết lệnh SQL `ALTER TABLE services ADD COLUMN IF NOT EXISTS ...` cho 5 cột còn thiếu: `unit`, `fulfillment_type`, `created_by`, `updated_by`, `deleted_at`.
4. [x] Khớp (Sync) dữ liệu cũ: Set default `unit = 'dich_vu'` và `fulfillment_type = 'single'` cho các bản ghi đã có.

## Files to Create/Modify
- `supabase_update_services_abc_framework.sql` - [Tạo DB Migration Script]

## Test Criteria
- [x] Câu lệnh SQL chạy thành công trên Supabase mà không báo lỗi Type Casting.

---
Next Phase: [Phase 03: Backend API & Types Update]
