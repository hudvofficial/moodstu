# Plan: Contract Module — Fix & Chuẩn Hóa
Created: 2026-03-20 12:38  
Updated: 2026-03-20 12:45
Status: ✅ All Phases Complete

## Context (Brainstorm Session)
- V2 hiện tại CHỈ triển khai module `/contracts`
- Module `employees` CHƯA build (phase tiếp theo)
- `/contracts` phải hoàn thiện tối ưu → trở thành GOLD STANDARD
- Shared components, tokens, patterns từ module này → nhân bản cho toàn hệ thống V2

## Issues Found (Full Audit)

### 🔴 CRITICAL
| ID | Issue | Root Cause |
|----|-------|-----------|
| BUG-C1 | 22 FK constraints trên 15 bảng trỏ `employees.id` rỗng | V1 schema dùng FK → employees, nhưng employees chưa triển khai |

### 🟡 MEDIUM  
| ID | Issue | Location |
|----|-------|----------|
| BUG-M1 | Mã HĐ hiển thị trùng (header badge + form body) | ContractInfoSection.tsx line 96-107 |
| BUG-M2 | Desktop Edit header dư thừa (3 dòng = 1 ý) | form/index.tsx line 152-161 |

### 🟢 LOW
| ID | Issue | Location |
|----|-------|----------|
| CQ-1 | form/index.tsx = 272 lines (vượt 250) | form/index.tsx |
| CQ-2 | assigned_to = free-text input | ContractInfoSection.tsx line 84-92 |
| CQ-3 | OperationsTabs thiếu type safety | contract-drawer.tsx |

## Quyết định đã chốt (Brainstorm 2026-03-20)
- ✅ FK `*_by` đổi thành → `auth.users(id)` thay vì `employees(id)`
- ✅ Lý do: auth.users luôn tồn tại, khi build employees sau → JOIN qua `auth_user_id`
- ✅ 1 migration duy nhất fix toàn bộ 22 constraints
- ✅ Code actions KHÔNG cần thay đổi (đã dùng `user.id` từ auth)
- ✅ Lessons #72, #73, #74 đã ghi nhận

---

## Phases

| Phase | Name | Status | Priority |
|-------|------|--------|----------|
| 01 | DB Migration — FK → auth.users(id) | ✅ Complete | 🔴 Critical |
| 02 | Verify all actions work | ✅ Complete | 🔴 Critical |
| 03 | UI: Ẩn mã HĐ trùng + compact header | ✅ Complete | 🟡 Medium |

---

## Phase 01: DB Migration — FK → auth.users(id)

### Objective
Đổi tất cả 22 FK constraints từ `employees(id)` → `auth.users(id)` trong 1 migration duy nhất.

### Tasks
- [ ] 1.1 Viết migration SQL: DROP FK cũ + ADD FK mới cho tất cả 15 bảng
- [ ] 1.2 Apply migration qua Supabase MCP
- [ ] 1.3 Verify: query FK constraints confirm tất cả trỏ auth.users

### Bảng cần đổi (22 constraints / 15 bảng)
```
contracts:        created_by, updated_by, cancelled_by
contract_items:   added_by
payments:         created_by, approved_by
customers:        created_by
crm_leads:        created_by
printing_orders:  created_by
debts:            created_by
documents:        created_by
employee_salaries: created_by
equipment:        created_by
evaluations:      created_by
expenses:         created_by, approved_by
fixed_costs:      created_by
galleries:        created_by
monthly_salaries: created_by
requests:         created_by
work_shifts:      created_by
work_tasks:       created_by
```

---

## Phase 02: Verify Actions Work

### Tasks
- [ ] 2.1 Test: Tạo hợp đồng mới (submitContract create)
- [ ] 2.2 Test: Sửa hợp đồng (submitContract update)
- [ ] 2.3 Test: Thêm ghi chú (addContractNote)
- [ ] 2.4 Test: Tạo thanh toán (createPayment)
- [ ] 2.5 Test: Cancel/Delete/Reactivate contract

---

## Phase 03: UI Fixes — Edit Page

### Tasks
- [ ] 3.1 Ẩn "Mã hợp đồng" trong form body khi edit mode trên desktop (header badge đã hiện)
- [ ] 3.2 Compact header: gộp title vào breadcrumb, bỏ subtitle
- [ ] 3.3 Verify desktop + mobile

### Files
- `components/contracts/form/ContractInfoSection.tsx` — ẩn mã HĐ
- `components/contracts/form/index.tsx` — compact header

---

## Quick Commands
- Start: `/code phase-01`
- Check progress: `/next`
