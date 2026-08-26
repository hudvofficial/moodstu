---
title: "Module Hợp đồng"
tags: [module, hop-dong]
cap-nhat: 2026-08-07
---

# Module Hợp đồng

**Trung tâm của hệ thống.** Gần như mọi module khác treo vào `contracts`: gallery, tài chính, in ấn, váy cưới, nhân sự, lịch.

Quy mô thật: 54 hợp đồng, ~14–19 hợp đồng/tháng. → [[so-lieu-van-hanh]]

## Route

| Route | Việc |
|---|---|
| `/contracts` | Danh sách + lọc + thống kê |
| `/contracts/create` | Tạo mới |
| `/contracts/[id]` | Chi tiết (tab: sự kiện · checklist · nhân sự · thanh toán · ghi chú). Thao tác nhanh 7 ô: sự kiện · Drive · thu tiền · đặt in · **Thiệp** (M3b 26/08/2026 — mở modal Xuất kho của [[vat-tu]] sẵn HĐ: Bán thêm HĐ / Xuất HĐ) · trang phục · ghi chú |
| `/contracts/[id]/edit` | Sửa |
| `/contracts/[id]/print` | Bản in |
| `/contracts/[id]/gallery` | Gallery của hợp đồng → [[gallery]] |
| `/api/contracts/[id]/prefetch` | Nạp trước khi hover |

## Trạng thái

`ContractStatus` theo thứ tự (`CONTRACT_STATUS_ORDER`, `types/contract-constants.ts`):

```
cho_xu_ly → dang_thuc_hien → hoan_thanh
                                  da_huy (nhánh riêng)
```
Nhãn: Chờ xử lý · Đang thực hiện · Hoàn thành · Đã hủy.

Phân bố thật hôm nay: `hoan_thanh` 29 · `dang_thuc_hien` 16 · `cho_xu_ly` 7.

**Cổng trạng thái là cảnh báo mềm, không cấm cứng.** Server gác bằng số tươi; mọi UI phải đi qua `handleContractStatusUpdate`. `canMoveTo` (`lib/contracts/contract-workflow.ts`) chỉ so vị trí trong `CONTRACT_STATUS_ORDER`.

**Pill đổi trạng thái = `ContractStatusBadge`** (`components/contracts/contract-status-badge.tsx`, tách từ `contract-drawer.tsx` 26/08/2026): `SelectStatus variant="compact"` + `ConfirmDialog` cảnh báo nợ/việc dở + optimistic; dùng ở header drawer vận hành **và** drawer lợi nhuận (`profit-detail-drawer.tsx`, prop `onUpdated` → `mutate()` số drawer + `revalidateByPrefixes` các key `/finance` có trạng thái/lợi nhuận). Trang chi tiết (`detail/top-action-bar.tsx`) còn bản nội bộ riêng — chưa gộp.

Trạng thái thanh toán tách riêng: `chua_thanh_toan · da_coc · thanh_toan_mot_phan · da_thanh_toan · hoan_tien`.

## Bảng

Lược đồ đầy đủ: [[luoc-do-hop-dong]]

`contracts` · `contract_items` (hạng mục) · `contract_events` (sự kiện: chuẩn bị / ngày chụp / ngày tổ chức / hậu kỳ / giao sản phẩm) · `contract_checklists` + `checklist_templates` · `contract_notes` · `event_templates` · `addon_history` · `documents` · `approval_requests`

## Action

| File | Vai trò | RPC |
|---|---|---|
| `contract-queries.ts` | đọc list/detail/stats | `get_contract_list_v2`, `contract_stats` |
| `contract-mutations.ts` | tạo/sửa | **`save_contract_atomic`** |
| `contract-lifecycle.ts` | huỷ/xoá lan toả | `cancel_contract_cascade`, `delete_contract_cascade` |
| `payment-actions.ts` | ghi/huỷ thanh toán | `process_contract_payment_v2`, `void_contract_payment_v2` |
| `contract-refund-actions.ts` | hoàn tiền | |
| `contract-profit.ts` | lãi/lỗ từng hợp đồng | |
| `contract-event-actions.ts` · `checklist-actions.ts` · `addon-actions.ts` | sự kiện, checklist, phát sinh | |

## Ràng buộc phải nhớ

1. **Ghi qua RPC atomic, không ghi tay nhiều bảng.** `save_contract_atomic` gói hợp đồng + hạng mục + sự kiện + task trong một transaction. Chèn tay từng bảng sẽ phá toàn vẹn.
2. **Tổng tiền do `recalc_contract_totals` tính** → **không optimistic-patch**. Đóng modal + revalidate.
3. **Huỷ/xoá lan toả rất rộng** — `cancel_contract_cascade` chạm `dress_reservations`, `dresses`, `contract_items`, `work_tasks`, `payment_plans`, `printing_orders`. Đọc kỹ trước khi đổi.
4. **Module này dùng React Query**, không phải SWR như phần lớn app. → [[cache-va-realtime]]
5. **Bảng hợp đồng không có RLS scope** → cấm client-direct. → [[bao-mat-du-lieu-rls]]
6. Đây là nhóm bảng **duy nhất** dùng `postgres_changes` trực tiếp (9 bảng trong publication).

## Bẫy đã dẫm

- **Điều hướng từ drawer:** đừng gọi `onClose()` trước `router.push()` — drawer unmount nuốt lần navigate đầu, người dùng phải bấm 2 lần. Push thẳng, route mới tự unmount.
- **Drawer hiện skeleton dù list đã có data:** seed `placeholderData` cho `useQuery` từ data list, đừng fetch + skeleton lại.
- **RPC thay thế (v2 → v3):** phải deep-compare output với bản đang chạy trên data thật (`scripts/test-rpc-v3.mjs`) **trước** khi bật cờ. `get_contract_detail_v3` từng tái sinh đúng bug `labs.name` mà v2 đã fix. Grep các migration `fix_*` của bản cũ.
- **Thêm `service_type` = sửa 4 chỗ**, compiler không bắt hết. → [[quy-uoc-code]]

## Liên quan

[[vong-doi-hop-dong]] · [[luong-tien]] · [[tai-chinh]] · [[gallery]] · [[nhan-su]]
