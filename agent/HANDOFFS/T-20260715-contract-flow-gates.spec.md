# SPEC — T-20260715-contract-flow-gates

- **Ngày:** 2026-07-15 · **User duyệt:** "triển đi" (ưu tiên 1+2 của đề xuất flow) · **Owner:** claude (code trực tiếp theo chỉ thị user)

## Nghiệp vụ chốt
- Trạng thái HĐ là kết quả của chuỗi: ký → chụp → album → khách chọn → hậu kỳ → giao → hoàn thành.
- **"Hoàn thành" = cảnh báo MỀM** khi còn nợ/việc dở (KHÔNG cấm cứng — tôn trọng quyết định cũ ghi trong contract-mutations.ts: studio có thể hoàn thành độc lập với tài chính). Nhưng cảnh báo phải do **SERVER** quyết (số tươi từ DB) và **mọi UI** đều phải hiện confirm — hết cửa lách ở trang detail.
- Drawer phải hiện mắt xích album (ảnh/chọn/tim) — admin liếc biết cần nhắc khách chọn hay đẩy hậu kỳ.

## Thay đổi
### 1. `app/actions/contract-mutations.ts` — updateContractStatus
- Thêm param 4: `confirmedWarnings = false`.
- Fetch thêm `remaining_amount` cùng status.
- Khi `newStatus === "hoan_thanh"` && !adminOverride && !confirmedWarnings: đếm work_tasks chưa xong (status not in hoan_thanh/da_huy) + debt = remaining_amount. Nếu debt>0 || tasks>0 → `return { needsConfirmation: true, debt, unfinishedTasks }` (KHÔNG update DB).
- confirmedWarnings=true → bỏ qua bước trên, update như cũ.

### 2. `lib/contracts/update-contract-status-ui.ts` — handleContractStatusUpdate
- Thêm param `confirm?: (msg: string) => Promise<boolean>` (fallback `window.confirm`).
- Nếu result.data.needsConfirmation → build msg cảnh báo (wording giữ y drawer cũ) → confirm → yes: gọi lại action với confirmedWarnings=true → xử lý như thường; no: onFailure + return false.

### 3. `components/contracts/contract-drawer.tsx` — ContractStatusBadge
- BỎ pre-check client (debt/tasks từ list JOIN — data cũ, đã có server check tươi); giữ ConfirmDialog, truyền `confirm: showConfirm` vào handler. Bỏ props remainingAmount/unfinishedTasksCount (cả nơi truyền).

### 4. `components/contracts/detail/top-action-bar.tsx` — KHÔNG SỬA
- Tự hưởng gate qua handler chung (fallback window.confirm). Polish dialog đẹp = đợt sau.

### 5. `components/contracts/drawer-tab-content.tsx` — card Album
- Component nội bộ `AlbumStatusCard({contractId})`: `useGalleriesQuery(contractId)` (tái dùng — đã có heartCount từ task sáng nay). galleries rỗng → null. Render card link → `/contracts/[id]/gallery`: tổng `N ảnh · ✓ x chọn · ❤️ y tim` (segment ẩn khi 0). Chèn giữa OperationsTabs và DrawerNotes.

## Verify
- eslint file đổi 0 lỗi mới; npm run build pass.
- Prod: drawer HĐ-2026-0042 hiện `95 ảnh · ✓ 1 chọn · ❤️ 4 tim`(±tim mới); đổi status hoan_thanh từ DETAIL khi nợ → hiện confirm (trước: đi thẳng); từ drawer → dialog như cũ; xác nhận → đổi thành công; huỷ → giữ nguyên.
