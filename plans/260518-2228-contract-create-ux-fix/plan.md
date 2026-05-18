# Plan: Contract Create — UX Optimization

Created: 2026-05-18T22:28  
Status: ✅ Complete  
Origin: Audit report `/contracts/create` (7.83/10)

## Overview

3 thay đổi nhỏ cho form tạo hợp đồng, tập trung fix vấn đề Progressive Disclosure + UI redundancy. Không rewrite, chỉ restructure existing components.

**Nguyên tắc**: Impact cao, effort thấp, zero logic change, zero hook change.

## Audit Findings (Tóm tắt)

| Vấn đề | Severity | Root Cause |
|---|---|---|
| 10 empty couple fields hiện khi chưa chọn KH | 🔴 High | `showCoupleFields` chỉ check `service_type`, không check `selectedCustomer` |
| Nút "Tạo KH mới" xuất hiện 2 nơi (button + dropdown) | 🟡 Medium | Redundant affordance |
| Section 6 "Ghi chú" tách card riêng cuối form | 🟢 Low | Thừa 1 section cho 1 textarea |

## Phases

| Phase | Name | Status | Files | LOC Change |
|---|---|---|---|---|
| 01 | Progressive Disclosure: Couple Fields | ✅ Done | 1 file | ~1 dòng sửa |
| 02 | Remove Redundant "Tạo KH" Button | ✅ Done | 1 file | ~10 dòng xóa |
| 03 | Merge S6 Notes vào S1 | ✅ Done | 2 files | ~20 dòng move |

**Tổng**: ~30 LOC | 2 files affected | Ước tính: 1 session

## Files Affected

- `components/contracts/form/ContractCustomerSection.tsx` (Phase 01 + 02)
- `components/contracts/form/index.tsx` (Phase 03)
- `components/contracts/form/ContractInfoSection.tsx` (Phase 03)

## NOT Changing (Giữ nguyên 100%)

- Hooks: `useContractForm`, `useContractCustomer`, `useContractItems`, `useContractFinancials`
- Modals: `ItemModal`, `CreateServiceModal`, `CustomerFormModal`
- Actions: `contract-mutations.ts`, `contract-queries.ts`
- Layout: `FullpageFormShell`, `FormActions`
- Types: `contract-form.ts`
- Financial sections: `ContractFinancialSummary`, `ContractPaymentSection`

## Verification Plan

### Automated
- `npm run build` — no type errors

### Manual (Browser)
- [ ] Mở `/contracts/create` → CoupleDetailFields KHÔNG hiện
- [ ] Chọn KH (search + select) → CoupleDetailFields HIỆN, auto-filled
- [ ] Tạo KH mới (dropdown → modal) → CoupleDetailFields HIỆN sau khi save
- [ ] Nút "Tạo KH mới" standalone đã biến mất
- [ ] Section 6 không còn → notes nằm trong S1
- [ ] Mobile: flow tương tự, fixed footer vẫn hoạt động
- [ ] Edit mode: load contract → CoupleDetailFields hiện đúng với data

## Quick Commands
- Start: `/code phase-01`
- Check progress: xem plan.md
