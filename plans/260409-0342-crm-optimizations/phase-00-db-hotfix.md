# Phase 00: Database Schema Hotfix
Status: ✅ Complete

## Objective
Xử lý dứt điểm lỗi "Could not find a relationship between 'crm_leads' and 'employees'" trên giao diện (Chi tiết Lead) do bảng `crm_leads` đang bị thiếu ràng buộc khóa ngoại (Foreign Key) trên database.

## Requirements
### Functional
- [x] Bổ sung Foreign Key cho cột `assigned_to` trỏ về `employees(id)`.
- [x] Bổ sung Foreign Key cho cột `created_by` trỏ về `employees(id)` (để đảm bảo không bị lỗi tương tự nếu query tới).
- [x] Báo cho Supabase / PostgREST reload lại schema cache.

## Implementation Steps
1. [x] Thực thi câu lệnh SQL trực tiếp trên Supabase:
   ```sql
   ALTER TABLE crm_leads 
   ADD CONSTRAINT crm_leads_assigned_to_fkey FOREIGN KEY (assigned_to) REFERENCES employees(id) ON DELETE SET NULL;

   ALTER TABLE crm_leads 
   ADD CONSTRAINT crm_leads_created_by_fkey FOREIGN KEY (created_by) REFERENCES employees(id) ON DELETE SET NULL;
   
   NOTIFY pgrst, 'reload schema';
   ```

## Test Criteria
- [ ] Tải lại trang (Refresh) và mở "Chi tiết Lead", UI render thành công, hết lỗi mối quan hệ.

---
Next Phase: [Phase 01: Database Stats (RPC)](./phase-01-database-stats.md)
