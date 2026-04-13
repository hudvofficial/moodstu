# Phase 01: Database Schema & Types
Status: ✅ Complete
Dependencies: None

## Objective
Mở rộng Database RPC và Types của V2 để có khả năng bóc tách doanh thu (Package vs Addon) và GIẢM GIÁ (Discount) để giải quyết sai số tính toán lợi nhuận.

## Requirements
### Functional
- [x] Tính được Doanh thu gói (Package) và Doanh thu phát sinh (Addon) dựa trên bảng `contract_details` (Subtotal).
- [x] Trả về thêm field `discount` từ bảng `contracts` để cộng trừ khớp tới từng đồng với `total_amount`.
- [x] Ràng buộc Type chặt chẽ chuẩn Gold Standard cho `ContractProfitRow` và Model Drawer.

## Implementation Steps
1. [x] Cập nhật `types/finance-dashboard.ts`:
   - Extend `ContractProfitRow` (thêm packgeRevenue, addonRevenue, discount).
   - Định nghĩa Interface `ContractProfitDetailData` (Dữ liệu trả về chi tiết 4 block cho Drawer).
2. [x] Viết file SQL script update RPC `finance_contract_profit_report`:
   - Join thêm vào bảng `contract_details` để bóc tách Package vs Addon.
   - Thêm select cột `discount` từ bảng contracts gốc.

## Files to Create/Modify
- `types/finance-dashboard.ts`
- `supabase/migrations/xxxx_update_finance_rpc_profit_report.sql`

---
Next Phase: phase-02-backend.md
