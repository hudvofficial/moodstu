---
title: "Module Khách hàng & CRM"
tags: [module, crm]
cap-nhat: 2026-08-31
trang-thai: da-kiem-2026-08-31
doi-chieu: agent/system-map/04-crm-nhan-su.md · vault/30-du-lieu/than-ham/khach-hang-crm.md
---

# Module Khách hàng & CRM

Đường phễu: **lead → khách hàng → hợp đồng**. Quyền: admin, manager, sale.

Quy mô (**ảnh chụp**, số sống ở [[luoc-do-khach-hang-crm]]): 65 khách hàng, 4 lead. Phần CRM dùng còn nhẹ so với hợp đồng.

## Route

`/crm` (tổng quan) · `/crm/leads` (bảng kéo thả theo trạng thái) · `/crm/customers` · `/crm/customers/[id]`

## Trạng thái lead

`lead_status_enum`: `moi → da_lien_he → hen_gap → da_bao_gia → da_chot` (nhánh `huy`)
`lead_potential_enum`: `hot · warm · cold`

Chuyển đổi qua RPC **`convert_lead_to_customer`** — đừng insert `customers` tay từ lead. Nhật ký chăm sóc ghi bằng `append_care_log`.

## ⚠️ `created_by` chứa HAI loại id — và không chỉ ở `crm_leads`

`crm_leads.created_by` trỏ `employees.id`, **khác phần còn lại của hệ thống** (chỗ khác dùng auth user id). Ngoại lệ đã xác nhận — tài liệu cũ ghi quy tắc ngược, đừng tin.

**Vế nguy hiểm hơn, bản cũ thiếu:** `customers.created_by` cũng **nhận cả hai loại** — `employees.id` khi khách sinh qua RPC `convert_lead_to_customer` (`20260427030000_crm_rpc_hardening.sql:152`), nhưng auth user id khi tạo tay (`customer-actions.ts:168`). Không FK nào chặn. **Đừng join cột này** mà không biết dòng đó sinh từ đường nào.

## Mã khách hàng

Sinh bằng `nextval_customer_code` (server) → **không optimistic-patch**, mã chỉ biết sau khi server trả.

## Bảng & action

[[luoc-do-khach-hang-crm]] — `customers`, `crm_leads`

`lead-actions.ts` (`get_crm_lead_stats`) · `lead-lifecycle.ts` (`convert_lead_to_customer`, `append_care_log`) · `customer-actions.ts` (`nextval_customer_code`, `get_crm_customer_stats`)

## Kỹ thuật

- SWR (6 file) + 2 chỗ realtime, nhưng đi qua **`useRealtimeSignal`**, KHÔNG phải `postgres_changes` trực tiếp: `components/crm/lead-list-page.tsx:13,179` và `customer-list-client.tsx:12,101,105` đều nghe bảng tín hiệu `realtime_signals` (`hooks/use-realtime-signal.ts:6-12,32-41`). Việc `crm_leads`/`customers` **có** trong publication (`20260610120000…:33-34`) là đúng, nhưng app **không dùng đường đó**. → [[cache-va-realtime]]
- Bảng lead dùng `@dnd-kit` để kéo thả trạng thái.

## Bẫy đã tìm thấy

- **`updateCustomer` không chuẩn hoá SĐT như `createCustomer`** — `customer-actions.ts:230` chỉ `.trim()`, trong khi `:135` gọi `normalizePhone`. Sửa SĐT một khách có thể phá cả dedup lẫn khớp lead ↔ customer. Sửa ở đây phải sửa **cả hai** đường.
- **`crm_leads.pipeline_order` là cột chết ở tầng ghi** — chỉ có đường đọc (`lead-actions.ts:43`, `types/crm.ts:118`), không đường ghi nào trong repo → mọi lead giữ mặc định `0`, **thứ tự cột kéo-thả trên `pipeline-board` không được lưu**.
- **`get_customer_ltv(uuid[])`** tồn tại trên DB (tạo ở `…_crm_audit_followups.sql:6,110-122`) để gộp LTV bằng SQL, nhưng `getCustomers` vẫn fetch `contracts` rồi cộng ở JS (`customer-actions.ts:92-98`) → tối ưu **chưa được nối vào**; hàm nằm trong danh sách ứng viên chết của [[ham-mo-coi]].

## Liên quan

[[hop-dong]] · [[vong-doi-hop-dong]]
