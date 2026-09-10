---
title: "Module Hợp đồng"
tags: [module, hop-dong]
cap-nhat: 2026-09-10
trang-thai: da-kiem-2026-09-10
doi-chieu: agent/system-map/02-hop-dong.md · vault/30-du-lieu/than-ham/hop-dong.md
---

# Module Hợp đồng

**Trung tâm của hệ thống.** Gần như mọi module khác treo vào `contracts`: gallery, tài chính, in ấn, váy cưới, nhân sự, lịch.

Quy mô (**ảnh chụp**): 64 hợp đồng ([[luoc-do-hop-dong]] — nguồn sinh tự động, lấy số ở đó), ~14–19 hợp đồng/tháng. → [[so-lieu-van-hanh]]

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

Phân bố `hoan_thanh` 29 · `dang_thuc_hien` 16 · `cho_xu_ly` 7 là **ảnh chụp 07/08/2026**, tổng không còn khớp số hợp đồng hiện tại — đừng dùng làm căn cứ, đếm lại khi cần.

**Cổng trạng thái CẤM CỨNG, không phải cảnh báo mềm.** `VALID_TRANSITIONS` (`app/actions/contract-mutations.ts:321-326`) chặn bằng `throw` ở `:354-362` — ví dụ `hoan_thanh → cho_xu_ly` và `hoan_thanh → da_huy` bị từ chối thẳng. Phần **mềm** duy nhất là cảnh báo nợ/việc dở khi chuyển sang `hoan_thanh` (`:364-383`). Mọi UI vẫn phải đi qua `handleContractStatusUpdate`.

**`canMoveTo` không tồn tại trong repo** — đừng đi tìm. Hàm gần nhất là `isContractStatusForwardTransition` (`lib/contracts/contract-workflow.ts:39`), và nó **không có caller nào**.

Thứ hệ thống *không* ép là **thứ tự nghiệp vụ** (chụp → in → giao): không tìm thấy ràng buộc nào.

**Pill đổi trạng thái = `ContractStatusBadge`** (`components/contracts/contract-status-badge.tsx`, tách từ `contract-drawer.tsx` 26/08/2026): `SelectStatus variant="compact"` + `ConfirmDialog` cảnh báo nợ/việc dở + optimistic; dùng ở header drawer vận hành **và** drawer lợi nhuận (`profit-detail-drawer.tsx`, prop `onUpdated` → `mutate()` số drawer + `revalidateByPrefixes` các key `/finance` có trạng thái/lợi nhuận). Trang chi tiết (`detail/top-action-bar.tsx`) còn bản nội bộ riêng — chưa gộp.

Trạng thái thanh toán tách riêng: `chua_thanh_toan · da_coc · thanh_toan_mot_phan · da_thanh_toan · hoan_tien`.

## Bảng

Lược đồ đầy đủ: [[luoc-do-hop-dong]]

`contracts` · `contract_items` (hạng mục) · `contract_events` (sự kiện: chuẩn bị / ngày chụp / ngày tổ chức / hậu kỳ / giao sản phẩm) · `contract_checklists` + `checklist_templates` · `contract_notes` · `event_templates` · `addon_history` · `documents` · `approval_requests`

**Lịch thu (`payment_plans`, M4 27/08/2026):** `create_default_payment_schedule_v2` sinh **2 đợt** — Cọc (số cọc lúc tạo, hạn = ngày ký) + Tất toán (còn lại, hạn = ngày chụp); thu ngoài lịch → `process_contract_payment_v2` tự tạo đợt `outside`; phân bổ phiếu thu ở `payment_plan_allocations` (SSOT trạng thái đợt qua `sync_payment_plan_statuses_v2`). Là **kế hoạch**, không phải tiền, **không phải nguồn "đến hạn"** — đến hạn = đã giao sản phẩm (xem [[luong-tien]]). Đợt 1/Đợt 2 cũ (0đ) đã bỏ; backup `docs/reports/backup_2026-08-27_payment_plans_installments.json`.

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

1. **Ghi qua RPC atomic, không ghi tay nhiều bảng** — nhưng phải biết đúng **ranh giới transaction**. `save_contract_atomic` chỉ ghi `customers` + `contracts` + `contract_items` (cộng `payment_plans`/`payments` qua 2 RPC con) — `20260714213000_fix_contract_schedule_customer_mirror.sql:7-300`, **không có câu nào chạm `contract_events` hay `work_tasks`**. Sự kiện sinh **ngoài** transaction ở `contract-mutations.ts:236-273` → `contract-event-actions.ts:231,300`; `work_tasks` **không còn sinh tự động** (`work-task-actions.ts:22-28` trả `[]`). Lời khuyên "chèn tay từng bảng sẽ phá toàn vẹn" vẫn đúng, chỉ là vùng atomic hẹp hơn bản cũ mô tả.
2. **Không optimistic-patch tổng tiền** — kết luận đúng, nhưng **lý do ở bản cũ sai**. Trên đường tạo/sửa HĐ, `total_amount` do **client** tính (`components/contracts/form/hooks/useContractFinancials.ts:34-37`) rồi gửi thẳng vào RPC (`contract-mutations.ts:114`). Thứ server tính lại là **trigger** `trg_contract_payment_status_v2` (`paid_amount`/`remaining_amount`/`payment_status`). `recalc_contract_totals` **chỉ** được gọi từ đường trang phục (`dress-mutations.ts:437,553`). Vẫn: đóng modal + revalidate.
3. **Huỷ/xoá lan toả rất rộng** — `cancel_contract_cascade` chạm `dress_reservations`, `dresses`, `contract_items`, `work_tasks`, `payment_plans`, `printing_orders`. Đọc kỹ trước khi đổi.

   ⚠️ **Nghi vấn nghiêm trọng (code ↔ code).** Bản định nghĩa mới nhất của `cancel_contract_cascade` (`20260422160000…:348-354`) đặt `printing_orders.status = 'da_huy'`, trong khi CHECK constraint thêm **sau đó** (`20260824120000_printing_workflow_redesign.sql:22-25`) chỉ cho phép `cho_xu_ly · dang_in · da_in · hoan_thanh · huy_don · gap_su_co` khi `deleted_at IS NULL`. Nếu constraint đang VALIDATED thì **huỷ một HĐ còn đơn in đang hoạt động sẽ làm fail cả transaction**, kéo theo `cancelContract` (`contract-lifecycle.ts:113`). Không có migration nào sửa hàm này sau 24/08.

   > ✅ ĐÃ ĐO trên prod (2026-08-31): `printing_orders_status_check.convalidated = true`, và hàm `cancel_contract_cascade` vẫn ghi `'da_huy'` (`prosrc` xác nhận). **5 hợp đồng hiện không huỷ được**; 33 đơn in đang sống, **0 đơn mang `da_huy`** và **0 hợp đồng ở trạng thái `da_huy`** ⇒ nhánh này chưa từng chạy thành công kể từ 24/08. Sửa: đổi `'da_huy'` → `'huy_don'` trong nhánh `printing_orders` của hàm.

   > ✅ **ĐÃ SỬA 07/09/2026 (#13, R1)** — `supabase/migrations/20260907100000_r1_cancel_cascade_huy_don.sql` (sinh từ thân hàm sống, đổi đúng 2 chữ), revert `agent/HANDOFFS/T-20260907-r1-cancel-cascade.revert.sql`. Tái hiện trên Postgres cục bộ: bản cũ `23514 check violation`, bản mới HĐ `da_huy` · đơn `huy_don` · task `da_huy`. Thân sống trong [[than-ham/hop-dong]]. Chưa có HĐ nào huỷ thật sau sửa (chủ quyết theo vận hành).
4. **Module này dùng React Query**, không phải SWR như phần lớn app. → [[cache-va-realtime]]
5. **Client-direct: đúng cho `contracts`, SAI cho các bảng con.** `lib/client-direct/contract-drawer.ts:29-72` đọc **thẳng từ trình duyệt** `contract_events`, `contract_checklists`, `work_tasks`, `payment_plans`, `payment_plan_allocations`, `contract_notes`, `employees_public` — dựa hạ tầng RLS dựng có chủ đích (`20260605000000_contracts_rls_hardening.sql`, `20260605020000_client_direct_rls_prereq.sql`), nối vào app tại `lib/hooks/use-contract-queries.ts:301` và `use-contract-notes.ts:25`. Riêng bảng `contracts` thì đúng là không đọc client-direct. → [[bao-mat-du-lieu-rls]]
6. **Không còn bảng nghiệp vụ nào dùng `postgres_changes` trực tiếp.** `20260714040000_realtime_signal_only_hardening.sql:8-42` gỡ 15 bảng (gồm `contracts`, `contract_events`, `contract_checklists`, `contract_notes`, `work_tasks`, `payment_plans`, `payments`) khỏi publication và gắn trigger STATEMENT `emit_realtime_signal`; `:48-59` để lại **duy nhất `realtime_signals`** trong publication. → [[cache-va-realtime]]

## Bẫy đã dẫm

- **Điều hướng từ drawer:** đừng gọi `onClose()` trước `router.push()` — drawer unmount nuốt lần navigate đầu, người dùng phải bấm 2 lần. Push thẳng, route mới tự unmount.
- **Drawer hiện skeleton dù list đã có data:** seed `placeholderData` cho `useQuery` từ data list, đừng fetch + skeleton lại.
- **RPC thay thế (v2 → v3):** phải deep-compare output với bản đang chạy trên data thật (`scripts/test-rpc-v3.mjs`) **trước** khi bật cờ. `get_contract_detail_v3` từng tái sinh đúng bug `labs.name` mà v2 đã fix. Grep các migration `fix_*` của bản cũ.
- **Thêm `service_type` = sửa 5 chỗ** (chỗ thứ 5 là `scripts/normalize-services.mjs:46`, đang sót `outsource` sẵn), compiler không bắt hết. → [[dich-vu]] · [[quy-uoc-code]]

## Liên quan

[[vong-doi-hop-dong]] · [[luong-tien]] · [[tai-chinh]] · [[gallery]] · [[nhan-su]]

## Danh sách hợp đồng — 3 tầng (cập nhật 07/09/2026, #30a)
- **Phone (<768):** card 8 hàng (`MobileCardList` trong `components/contracts/contracts-table.tsx`).
- **Tablet (768–1279, `TierSwitch desktopAt="xl"`):** `contracts-tablet-table.tsx` — 5 cột gộp, mã HĐ ghim trái 124px, nút "Đi" ghim phải, virtualizer.
- **Desktop (≥1280):** `DesktopTable` — `table-fixed`, **tự co theo bề rộng khung bảng** bằng Tailwind v4 container query (`TableWrapper containerQuery` — lần đầu dùng trong repo): < 880px 6 cột (ẩn Sự kiện) · 880–1079 **7 cột** · ≥ 1080 8 cột (thêm Lợi nhuận). Cột: Khách hàng (tên đậm · dịch vụ · **mã HĐ dòng phụ** · thiếu-checklist chỉ khi có) · Ngày chụp · **Trạng thái (cột 3)** · Sự kiện · Tiến độ · Còn nợ (+Tổng dòng 2) · Lợi nhuận · ›. HĐ `hoan_thanh`/`da_huy`: pill mảnh 1 dòng "✓ Hoàn tất · n/n" (hàng 48px). Lợi nhuận khi `total_cost = 0` → "— chưa ghi chi phí" (cả 3 tầng).
- **Mặc định** vào `/contracts` = tab **Đang thực hiện** (đổi cả `page.tsx` lẫn `CONTRACT_FILTER_DEFAULTS` — nuqs `clearOnDefault`); "Tất cả" vẫn là tab.
- Bằng chứng: `tests/e2e/contracts-table-desktop.spec.ts` (tràn 0 ở 1280/1366/1440/1536/1920, cột rộng nhất ≤ 40% khung). Trước 07/09: 11 cột 1.727px, khung 912px → mất 47% kể cả cột Trạng thái, thanh cuộn bị ẩn.
