---
title: "Luồng — Vòng đời hợp đồng"
tags: [luong, hop-dong]
cap-nhat: 2026-08-07
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

## 1. Lead → Khách hàng

`crm_leads` (`moi → da_lien_he → hen_gap → da_bao_gia → da_chot`)
→ RPC **`convert_lead_to_customer`** → `customers` (mã sinh bằng `nextval_customer_code`)

⚠️ `crm_leads.created_by` trỏ `employees.id`, không phải auth user id.

## 2. Tạo hợp đồng

RPC **`save_contract_atomic`** — một transaction ghi:
`contracts` + `contract_items` + `contract_events` + `work_tasks`

Trạng thái mở đầu `cho_xu_ly`. Tổng tiền do `recalc_contract_totals` tính → **không patch phía client**.

Cùng lúc `create_default_payment_schedule_v2` dựng `payment_plans` (đợt cọc / đợt còn lại).

## 3. Sự kiện & phân công

`contract_events` (`chuan_bi · ngay_chup · ngay_to_chuc · hau_ky · giao_san_pham`)
→ `work_tasks` giao nhân sự (13 `work_type`), kiểm chồng lịch.
→ Giao ngoài thì `upsert_vendor_expense` sinh chi phí trích trước ở `expenses`.
→ `calendar_month_events` gom lên `/calendar`, đồng bộ Google qua `google_sync_queue`.

`contract_checklists` sinh từ `checklist_templates`.

## 4. Váy & vật tư

- Váy: `create_dress_contract_reservation_atomic` → `dress_reservations`, `dresses.status`
- Vật tư bán kèm: `create_contract_inventory_addon_sale_atomic` → `inventory_transactions` + `receipts`
- Phát sinh: `addon_history` (`makeup · trang_phuc · phu_kien · them_gio · khac`)

## 5. Thanh toán

RPC **`process_contract_payment_v2`** → `payments` + `payment_plan_allocations` + cập nhật `payment_plans.status` (`pending → partial → paid`, hoặc `cancelled`).
Huỷ: `void_contract_payment_v2`. Hoàn tiền: `contract-refund-actions.ts` → `expenses`.

Trạng thái thanh toán hiển thị (`contract_payment_status_v2`) **tách khỏi** trạng thái hợp đồng.
Nhãn đợt do `payment_stage_display_label_v2` / `payment_stage_key_v2` sinh — có verify riêng: `npm run verify:payment-stage-key`.

Hợp đồng chuyển `dang_thuc_hien`.

## 6. Gallery → khách chọn

Chi tiết: [[luong-gallery]]. Tóm tắt: upload từ Drive → `galleries` + `gallery_images` → chia sẻ link (`prepare_gallery_share`) → khách xem tự do, **chọn ảnh cần mật khẩu** → `is_selected` → lọc về Drive cho hậu kỳ.

## 7. In ấn

`create_printing_order_atomic` → `printing_orders`
Trạng thái: `cho_xu_ly → dat_coc → dang_in → da_in → da_nhan → hoan_thanh` (hoặc `huy_don`), mỗi bước ghi `printing_order_status_history`.
Kéo theo `printing_order_status_history`; tiền trả lab = `expenses` (`payee_type='lab'`) + `expense_allocations(printing_order)` (ADR-016). Không có kho cho đơn in (ADR-014/017). Hủy đơn: một đường `updatePrintingOrderStatus` ghi `status='huy_don'` + `cancelled_at` + `cancellation_reason` + dòng lịch sử.

## 8. Giao & đóng

Sự kiện `giao_san_pham` → hợp đồng `hoan_thanh`.
Lãi/lỗ: `finance_contract_profit_report` (doanh thu − chi phí vendor − in ấn − vật tư).
Cuối tháng: `finance_monthly_closes` khoá kỳ `YYYY-MM`, kiểm bằng `is_period_locked`.

## Huỷ / xoá — cẩn thận

| | RPC | Chạm |
|---|---|---|
| Huỷ | `cancel_contract_cascade` | `dress_reservations`, `dresses`, `contract_items`, `work_tasks`, `payment_plans`, `printing_orders` |
| Xoá | `delete_contract_cascade` | như trên, sâu hơn |

Cần `requireContractDestructiveAccess` (admin/manager). **Đọc kỹ RPC trước khi đổi bất cứ thứ gì trong chuỗi này.**

## Chỗ hệ thống KHÔNG ép

Cổng trạng thái là **cảnh báo mềm** — bỏ bước vẫn đi tiếp được. Không có ràng buộc DB nào bắt phải chụp xong mới in. Chuỗi trên là *thực hành*, không phải *ràng buộc kỹ thuật*.

## Liên quan

[[hop-dong]] · [[luong-tien]] · [[luong-gallery]] · [[tai-chinh]]
