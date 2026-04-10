# Phase 01: Chuẩn hóa Type Safety (LTV)
Status: ✅ Complete
Dependencies: Báo Cáo Audit CRM

## Objective
Gỡ bỏ lỗi ép kiểu cực đoan (Type Casting) `as` liên quan đến thuộc tính `ltv` trong Component `customer-table.tsx` bằng cách khai báo rõ ràng trên Type Definition gốc.

## Requirements
### Functional
- [x] Mở rộng interface `Customer` (hoặc `CrmCustomer`) tại `types/crm.ts` để chứa trường `ltv?: number`.
- [x] Đảm bảo TypeScript không báo lỗi khi truy cập `customer.ltv` ở bất kỳ component nào.

### Non-Functional
- [x] Tuân thủ nguyên tắc `Strict TypeScript`. Tuyệt đối không dùng `as` để đè type.

## Implementation Steps
1. [x] Update file `types/crm.ts` - Tìm định nghĩa `Customer` và thêm `ltv?: number;`.
2. [x] Update `components/crm/customer-table.tsx` - Sửa đoạn map để bỏ qua phép typecast: `(customer as Customer & { ltv?: number }).ltv`.

## Files to Create/Modify
- `types/crm.ts` - [Update Type]
- `components/crm/customer-table.tsx` - [Remove Typecast]

## Test Criteria
- [x] Code compile chạy mượt không có Type Error.
- [x] Số LTV trên UI hiển thị chính xác như cũ.

---
Next Phase: [Phase 02](phase-02-sync-ux-leads.md)
