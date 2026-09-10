---
title: "Luồng — Vòng đời hợp đồng"
tags: [luong, hop-dong]
cap-nhat: 2026-08-31
trang-thai: da-kiem-2026-08-31
doi-chieu: agent/system-map/02-hop-dong.md · agent/system-map/03-in-kho-vay.md · vault/30-du-lieu/than-ham/hop-dong.md
---

# Vòng đời hợp đồng

Luồng xuyên module. Mỗi bước ghi rõ **bảng nào đổi** và **RPC nào chạy** — dùng để khoanh vùng ảnh hưởng trước khi sửa.

```
LEAD ──convert_lead_to_customer──► KHÁCH HÀNG ──► HỢP ĐỒNG
                                                    │
   ┌────────────────────────────────────────────────┤
   ▼                ▼              ▼                ▼
SỰ KIỆN        THANH TOÁN      VÁY CƯỚI        HẠNG MỤC
   │                │                            │
   ▼                ▼                            ▼
CÔNG VIỆC      PHIẾU THU                    VẬT TƯ / IN ẤN
   │
   ▼
GALLERY ──► khách chọn ──► HẬU KỲ ──► IN ẤN ──► GIAO ──► HOÀN THÀNH
```

⚠️ Sơ đồ trên là **trình tự nghiệp vụ**, không phải ràng buộc kỹ thuật. Xem mục cuối.

## 1. Lead → Khách hàng

`crm_leads` (`moi → da_lien_he → hen_gap → da_bao_gia → da_chot`)
→ RPC **`convert_lead_to_customer`** → `customers` (mã sinh bằng `nextval_customer_code`)

⚠️ **`customers.created_by` chứa HAI loại id.** `createCustomer` ghi auth user id (`customer-actions.ts:168`); `convert_lead_to_customer` ghi `employees.id` (`20260427030000:152`). Cột **không có FK** nên DB không chặn → mọi truy vấn join cột này sai một phần số dòng.

> ⚠️ CHƯA KIỂM (2026-08-31): `crm_leads.created_by` trỏ `employees.id` hay auth user id — chuỗi trạng thái lead cũng chưa mở file đối chiếu (`agent/system-map/02-hop-dong.md` §8.5).

## 2. Tạo hợp đồng — ranh giới atomic hẹp hơn tưởng

RPC **`save_contract_atomic`** (`20260714213000:7-300`) — một transaction, ghi **đúng ba bảng**:
`customers` (gương tên/SĐT/số đo) + `contracts` + `contract_items` — cộng `payment_plans`/`payments` qua hai RPC con gọi bên trong (`create_default_payment_schedule_v2`, và `process_contract_payment_v2` nếu có cọc > 0).

**KHÔNG có câu nào chạm `contract_events` hay `work_tasks` trong transaction này.** Chúng sinh **ngoài** transaction, ở `contract-mutations.ts:236-286` (một phần trong `after()`):

| Bước ngoài transaction | Ghi vào |
|---|---|
| `_reconcileContractScheduleInternal` / `_generateContractEventsInternal` | `contract_events` |
| `_generateChecklistsInternal` (từ `checklist_templates`) | `contract_checklists` |
| `syncDressReservationsForContract` | `dress_reservations`, `dresses` |
| `upsertAddonHistoryItems` | `addon_history` |
| `syncContractEventsToGoogle` | `google_sync_queue` |

⚠️ **RPC OK mà bước sau lỗi → hợp đồng vẫn tồn tại**, chỉ đẩy message vào `warnings` (`runPostSaveTask`) hoặc log (`schedulePostSaveTask`). Đừng giả định "tạo HĐ xong là chắc chắn có đủ sự kiện".

⚠️ **`work_tasks` KHÔNG còn sinh tự động.** `getDefaultWorkTypes` trả `[]` → `generateWorkTasksForContract` là no-op (`work-task-actions.ts:22-28`).

Trạng thái mở đầu `cho_xu_ly`.

**Mã hợp đồng:** **không có `nextval_contract_code`.** Preview `HĐ-<năm>-<4 số>` ở `contract-queries.ts:251-275`, chốt + chống trùng bằng vòng retry `unique_violation` (tối đa 4 lần, tự +1 hậu tố) trong chính RPC (`20260714213000:114-178`). Chỉ tồn tại `nextval_customer_code`, `nextval_printing_order_code`, `nextval_inventory_code`.

**Tổng tiền:** `total_amount` do **client** tính (`useContractFinancials.ts:34-37`) và gửi thẳng vào RPC. `recalc_contract_totals` **chỉ** chạy trên đường trang phục (`dress-mutations.ts:437,553`). Kết luận **"không patch số tiền phía client" vẫn đúng**, nhưng lý do là **trigger `trg_contract_payment_status_v2`** tính lại `paid/remaining/payment_status`, không phải `recalc_contract_totals`.

**Sửa HĐ:** `SELECT … FOR UPDATE` + so `p_expected_updated_at` → người khác vừa sửa thì RAISE. `contract_items` bị **xoá mềm hết rồi INSERT lại toàn bộ**.

## 3. Sự kiện & phân công

`contract_events` (`chuan_bi · ngay_chup · ngay_to_chuc · hau_ky · giao_san_pham` — enum DB `event_type_enum`)
- on-set (`ngay_chup`, `ngay_to_chuc`) dùng `event_date`; non-on-set (`hau_ky`, `giao_san_pham`) dùng `deadline = ngày gốc + default_days_offset`.

`work_tasks` giao nhân sự (13 `work_type`, enum DB `work_type_enum`), kiểm chồng lịch.
→ `addTask` đặt `status='dang_lam'` nếu có `assigned_to`|`vendor_id`, ngược lại `'chua_lam'`.
→ Ngay sau đó `checkAndCompleteEvent` tổng hợp ngược lên `contract_events.status`: mọi task `hoan_thanh` → event `hoan_thanh`; có ≥1 `dang_lam` → `dang_lam`; còn lại / 0 task → `chua_lam`.

❌ **KHÔNG còn `upsert_vendor_expense`.** Hàm đã DROP ở ADR-016 (`20260825200000:177`). Giao ngoài **không sinh chi phí trích trước**: chi phí thợ là **cam kết** nằm ở `work_tasks.cost`, phiếu chi (`expenses`) chỉ sinh khi **tiền thật rời két** (`work-task-actions.ts:308-310`). → [[luong-tien]]

→ `calendar_month_events` gom lên `/calendar`, đồng bộ Google qua `google_sync_queue`.

`contract_checklists` sinh từ `checklist_templates`.

⚠️ **DB không chặn giá trị lạ** cho `work_tasks.status` và `contract_events.status` — cả hai là cột `text` nullable, **không có `task_status_enum`** (dù `types/contract-constants.ts:104` chú thích là có). Lỗi chính tả enum ở đây im lặng. → [[bay-du-lieu]]

## 4. Váy & vật tư

- Váy: `validateDressAvailability` (throw nếu trùng lịch) → `save_contract_atomic` → `syncDressReservationsForContract` → `dress_reservations`, `dresses.status`
- Vật tư bán kèm: `create_contract_inventory_addon_sale_atomic` → `inventory_transactions` + `receipts`
- Phát sinh: `addon_history` (`makeup · trang_phuc · phu_kien · them_gio · khac`)

## 5. Thanh toán

RPC **`process_contract_payment_v2`** → `payments` + `payment_plan_allocations` + cập nhật `payment_plans.status` (`pending → partial → paid`, hoặc `cancelled`).
Huỷ: `void_contract_payment_v2` (xoá mềm phiếu, **XOÁ** allocation, sync lại). Hoàn tiền: `contract-refund-actions.ts` → `expenses` — chỉ mở sau khi HĐ đã `da_huy`.

**RPC chặn cứng (RAISE):** kỳ kế toán đã khoá · HĐ `da_huy` · thu quá `remaining` · phát sinh tăng khi còn nợ (bắt buộc `remaining = 0` + lý do ≥ 5 ký tự).

Trạng thái thanh toán hiển thị (`contract_payment_status_v2`) **tách khỏi** trạng thái hợp đồng — chỉ 3 giá trị, không bao giờ là `da_coc`/`hoan_tien`.
Nhãn đợt do `payment_stage_display_label_v2` / `payment_stage_key_v2` sinh — có verify riêng: `npm run verify:payment-stage-key`.

⚠️ **Hợp đồng KHÔNG tự chuyển `dang_thuc_hien` khi thu tiền** — phải người bấm (`02-hop-dong.md` §4[5]).

> ⚠️ CHƯA KIỂM (2026-08-31): thân thật của `process_contract_payment_v2` trên production. File migration mới nhất theo tên (`20260527120000`) **nghèo hơn** bản đang chạy — không ghi `payment_plan_allocations`, không tạo đợt `outside`. `agent/DECISIONS.md:144` chốt "tin DB, không tin file" (đo 51/51 phiếu thu có phân bổ). Muốn chốt: `SELECT prosrc FROM pg_proc WHERE proname='process_contract_payment_v2'`.

## 6. Gallery → khách chọn

Chi tiết: [[luong-gallery]]. Tóm tắt: import từ Drive → `galleries` + `gallery_images` → chia sẻ link (`prepare_gallery_share`) → khách xem tự do, **chọn ảnh cần mật khẩu** → `is_selected` → lọc về Drive cho hậu kỳ.

## 7. In ấn — vòng đời đã rút gọn từ ADR-014

`create_printing_order_atomic` → `printing_orders` (`status='cho_xu_ly'`, `payment_status='chua_thanh_toan'`)

```
cho_xu_ly ──► dang_in ──► da_in ──► hoan_thanh   (terminal)
     └──────────┴──────────┴──► huy_don | gap_su_co
                    gap_su_co ──► quay lại 4 bước trên, hoặc huy_don
Legacy chỉ đọc, KHÔNG ghi mới:  da_nhan · da_huy
```

❌ **`dat_coc` và `da_giao` đã bị xoá khỏi từ vựng** (ADR-014, 24/08/2026) — quan hệ Mood↔Lab không có khái niệm cọc, và việc giao khách thuộc `contract_events.giao_san_pham`. CHECK constraint DB chỉ nhận 6 giá trị `cho_xu_ly · dang_in · da_in · hoan_thanh · huy_don · gap_su_co` (áp cho dòng `deleted_at IS NULL`).
⚠️ `da_nhan` là **nhánh chết**: không transition nào tới nó, nên `received_date` chưa từng được ghi.

Mỗi bước ghi `printing_order_status_history`. Tiền trả lab = `expenses` (`payee_type='lab'`) + `expense_allocations(printing_order)` (ADR-016). **Không có kho cho đơn in** (ADR-014/017).
Hủy đơn: **một đường** `updatePrintingOrderStatus` ghi `status='huy_don'` + `cancelled_at` + `cancellation_reason` + dòng lịch sử (ADR-017).

⚠️ Đơn `huy_don` bị loại khỏi công nợ lab (`payable_items`), **nhưng `payment_status` không được tính lại khi huỷ** → đơn đã huỷ có thể mang nhãn `chua_thanh_toan` vĩnh viễn (`03-in-kho-vay.md` BB-4).

## 8. Giao & đóng

Sự kiện `giao_san_pham` `hoan_thanh` → người dùng **bấm tay** pill trạng thái → `updateContractStatus(id, 'hoan_thanh')`.

**Lãi/lỗ hợp đồng** = `contract_financials(uuid[])` — nguồn duy nhất cho `finance_contract_profit_report`, `get_contract_list_v2`, drawer lợi nhuận. Trừ **bốn** khoản:

```
total_amount
  − Σ work_tasks.cost                (MỌI task ≠ 'da_huy' — cả ekip nội bộ, không chỉ thợ ngoài)
  − Σ printing_orders.total_amount   (đơn không huỷ)
  − Σ giá vốn xuất kho gắn HĐ        (stock_out)
  − Σ expenses payee_type='other' gắn HĐ   (chi trực tiếp)
```

⚠️ Bản cũ của trang này ghi *"doanh thu − chi phí vendor − in ấn − vật tư"* — **thiếu khoản chi trực tiếp** và gọi sai "vendor" (thực tế là mọi task). Đừng tự cộng tay. → [[luong-tien]]

Cuối tháng: `finance_monthly_closes` khoá kỳ `YYYY-MM`, kiểm bằng `is_period_locked`.

## Huỷ / xoá — cẩn thận

| | RPC | Chạm |
|---|---|---|
| Huỷ | `cancel_contract_cascade` | `contracts.status='da_huy'` · `work_tasks`→`da_huy` (trừ đã xong) · `printing_orders` · `dress_reservations`→`cancelled` + `refresh_dress_status` · `payment_plans`→`cancelled` |
| Xoá | `delete_contract_cascade` | xoá mềm con→cha: `contract_items` · `contract_events` · `work_tasks` (→`da_huy`; bảng **không có** `deleted_at`) · `dress_reservations` · `printing_orders` · `payment_plans` · `contracts` cuối cùng |

- Huỷ **idempotent**: đã `da_huy` thì RETURN ngay. `contracts` / `contract_items` / `contract_events` / `payments` **không** bị xoá mềm.
- Xoá **chặn cứng** nếu tồn tại phiếu thu còn sống: *"Hop dong da co phieu thu, chi duoc huy thay vi xoa"*.
- Xoá **giữ nguyên `contracts.status`** (không đổi thành `da_huy`) — chỉ set `deleted_at`.
- `reactivateContract` đảo huỷ nhưng **KHÔNG atomic** (5 UPDATE rời).

🔴 **RỦI RO ĐÃ ĐO (31/08/2026) — huỷ hợp đồng có đơn in sẽ FAIL toàn bộ transaction.**
`cancel_contract_cascade` ghi `printing_orders.status='da_huy'`, nhưng CHECK constraint sau ADR-014 chỉ cho 6 giá trị **không gồm `da_huy`** → lỗi `23514`, rollback cả transaction.
Đo trên DB 31/08: **5 hợp đồng không huỷ được** · 33 đơn in đang sống · **0** đơn mang `da_huy` (⇒ hàm chưa từng ghi thành công kể từ 24/08) · **0** hợp đồng `da_huy` (⇒ chưa ai chạm tới).
Sửa = đổi `'da_huy'` → `'huy_don'` trong nhánh đó, tức **sửa hàm trên DB production** ⇒ cần cổng người + ADR. → `agent/SYSTEM_MAP.md` §6 R1.

Cần `requireContractDestructiveAccess` (admin/manager). **Đọc kỹ RPC trước khi đổi bất cứ thứ gì trong chuỗi này.**

## Cổng nào ép cứng, cổng nào chỉ cảnh báo

Bản cũ của trang này viết *"cổng trạng thái là **cảnh báo mềm**"* và nhắc hàm `canMoveTo`. **Cả hai đều sai.**

- **`VALID_TRANSITIONS` chặn cứng bằng `throw`** (`contract-mutations.ts:321-326,354-362`) — ví dụ `hoan_thanh → cho_xu_ly` và `hoan_thanh → da_huy` bị từ chối thẳng.
- **Không tồn tại hàm `canMoveTo`** trong repo. Hàm gần nhất là `isContractStatusForwardTransition` (`lib/contracts/contract-workflow.ts:39`), và nó **không có caller nào**.

| Ràng buộc | Ép cứng | Chỉ cảnh báo |
|---|---|---|
| Chuyển trạng thái HĐ | `VALID_TRANSITIONS` throw | — |
| Hoàn thành khi còn nợ / còn việc dở | — | `needsConfirmation` → `window.confirm` |
| Thu quá số còn lại · phát sinh khi còn nợ · kỳ đã khoá · thu tiền HĐ đã huỷ | RPC RAISE | — |
| Xoá HĐ đã có phiếu thu · hoàn tiền khi HĐ chưa huỷ | RAISE / action throw | — |
| Trùng lịch trang phục · sửa HĐ khi người khác vừa sửa | throw / RAISE | — |
| **Thứ tự nghiệp vụ (chụp → in → giao)** | **KHÔNG có ràng buộc nào** | — |
| Ngày HĐ ≤ ngày chụp ≤ ngày giao | CHECK constraint **`NOT VALID`** — dòng cũ không bị soi | — |

⇒ Câu duy nhất còn đúng của mục cũ: **thứ tự nghiệp vụ là *thực hành*, không phải *ràng buộc kỹ thuật*.** Bỏ bước vẫn đi tiếp được. Nhưng **trạng thái** thì bị chặn cứng.

## Liên quan

[[hop-dong]] · [[luong-tien]] · [[luong-gallery]] · [[tai-chinh]] · [[bay-du-lieu]] · [[adr-index]]
