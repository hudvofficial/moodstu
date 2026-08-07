---
title: "Module Khách hàng & CRM"
tags: [module, crm]
cap-nhat: 2026-08-07
---

# Module Khách hàng & CRM

Đường phễu: **lead → khách hàng → hợp đồng**. Quyền: admin, manager, sale.

Quy mô thật: 55 khách hàng, 4 lead. Phần CRM dùng còn nhẹ so với hợp đồng.

## Route

`/crm` (tổng quan) · `/crm/leads` (bảng kéo thả theo trạng thái) · `/crm/customers` · `/crm/customers/[id]`

## Trạng thái lead

`lead_status_enum`: `moi → da_lien_he → hen_gap → da_bao_gia → da_chot` (nhánh `huy`)
`lead_potential_enum`: `hot · warm · cold`

Chuyển đổi qua RPC **`convert_lead_to_customer`** — đừng insert `customers` tay từ lead. Nhật ký chăm sóc ghi bằng `append_care_log`.

## ⚠️ `crm_leads.created_by` trỏ `employees.id`

**Khác phần còn lại của hệ thống** (chỗ khác dùng auth user id). Đây là ngoại lệ đã xác nhận — có tài liệu cũ ghi quy tắc ngược, đừng tin.

## Mã khách hàng

Sinh bằng `nextval_customer_code` (server) → **không optimistic-patch**, mã chỉ biết sau khi server trả.

## Bảng & action

[[luoc-do-khach-hang-crm]] — `customers`, `crm_leads`

`lead-actions.ts` (`get_crm_lead_stats`) · `lead-lifecycle.ts` (`convert_lead_to_customer`, `append_care_log`) · `customer-actions.ts` (`nextval_customer_code`, `get_crm_customer_stats`)

## Kỹ thuật

- SWR (6 file) + 2 chỗ realtime. `crm_leads` và `customers` **có** trong publication `supabase_realtime` (đủ RLS + grant) → dùng `postgres_changes` trực tiếp.
- Bảng lead dùng `@dnd-kit` để kéo thả trạng thái.

## Liên quan

[[hop-dong]] · [[vong-doi-hop-dong]]
