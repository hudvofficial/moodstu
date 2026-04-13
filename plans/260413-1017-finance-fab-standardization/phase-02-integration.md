# Phase 02: Tích hợp Layout & Cleanup code thừa
Status: ✅ Complete

## Objective
Đấu nối \`<FAB>\` SSOT và \`<FinanceActionDrawer>\` vào hệ thống, sau đó tiêu diệt component lỗi thời \`finance-fab.tsx\`.

## Implementation Steps
1. [ ] Thay đổi \`app/(protected)/finance/layout.tsx\`. 
2. [ ] Khai báo state \`isDrawerOpen\` tại layout.
3. [ ] Ráp \`<FAB>\` chuẩn từ \`components/ui/fab.tsx\` có \`onClick={() => setIsDrawerOpen(true)}\`.
4. [ ] Ráp \`<FinanceActionDrawer>\`.
5. [ ] **Xóa hoàn toàn** \`components/finance/finance-fab.tsx\`.

## Files to Create/Modify
- [MODIFY] \`app/(protected)/finance/layout.tsx\`
- [DELETE] \`components/finance/finance-fab.tsx\`
