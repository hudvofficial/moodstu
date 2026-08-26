---
title: "Số liệu vận hành thật"
tags: [van-hanh, so-lieu]
cap-nhat: 2026-08-07
---

# Số liệu vận hành thật

Đo từ DB production ngày **2026-08-07**. Dùng để quyết định *có đáng tối ưu không* — trước khi giả định quy mô, đọc trang này.

## Người dùng

**1 admin + 1 kinh doanh có đăng nhập.** Nhân sự khác chưa được cấp tài khoản.
Thiết bị: **PC, mobile, iPad** — cả ba đều dùng thật.

→ Hệ quả: các kịch bản đa-người-dùng đồng thời **gần như không xảy ra**. Đừng thiết kế cho chúng khi chưa có yêu cầu.
→ Nhưng responsive thì phải đủ 3 tầng, không tầng nào phụ. → [[responsive-3-tier]]

## Nghiệp vụ

| | |
|---|---:|
| Hợp đồng (chưa xoá) | 54 |
| — 05/2026 | 14 hợp đồng · 49,85 tr |
| — 06/2026 | 19 hợp đồng · 98,80 tr |
| — 07/2026 | 16 hợp đồng · 76,83 tr |
| — 08/2026 (tới ngày 7) | 3 hợp đồng · 6,80 tr |
| Khách hàng | 55 |
| Lead CRM | 4 |
| Dịch vụ | 18 (7 danh mục) |
| Nhân sự | 7 |
| Đơn in | 29 |
| Vendor | 8 |
| Vật tư | 3 |
| Váy | 2 |

**~14–19 hợp đồng/tháng.** Đây là quy mô thật — bảng danh sách hợp đồng sẽ **không bao giờ** cần ảo hoá.

## Dữ liệu

| Bảng | Dòng |
|---|---:|
| `gallery_images` | **17.704** |
| `audit_logs` | 10.798 |
| `moodie_voice_events` | 3.279 |
| `gallery_reactions` | 1.228 |
| `ai_messages` | 367 |
| `contract_checklists` | 281 |
| `gallery_share_links` | 219 |
| `payment_plans` | 200 |
| `contract_events` | 185 |
| `gallery_comments` | 169 |
| `work_tasks` | 143 |
| `galleries` | 76 |
| còn lại | < 75 |

**Chỉ 2 bảng vượt 10.000 dòng.** Mọi vấn đề hiệu năng thật của hệ thống nằm ở **gallery** và **audit log**, không ở đâu khác.

## Gallery — nơi duy nhất cần lo quy mô

| | |
|---|---:|
| Gallery | 76 |
| Ảnh | 17.704 (trung bình ~233/gallery) |
| Album lớn nhất | **780 ảnh** |
| Top 8 album | 517–780 ảnh |

→ **Vượt giới hạn 1000 dòng của PostgREST là chuyện đã xảy ra, không phải giả định.** Mọi thao tác đếm/lấy toàn bộ ảnh phải phân trang. → [[bay-du-lieu]]
→ 780 ảnh × ~500 tim tiềm năng cũng vượt giới hạn header 16KB của `.in()`.

## Bảng rỗng — tính năng đã dựng, chưa dùng

`service_bundles` · `service_relations` · `price_rules` · `promotions` · `budgets` · `financial_goals` · `goal_contributions` · `fixed_costs` · `debts` · `investments` · `finance_close_tasks` · `salary_adjustments` · `attendance` · `work_shifts` · `evaluations` · `requests` · `equipment` · `documents` · `notifications` · `push_subscriptions` · `dress_rentals` · `dress_reservations` · `gallery_albums` · `gallery_selection_batches` · `gallery_filter_jobs` (`inventory_reservations` · `order_payments` đã drop ADR-017)

**Rỗng ≠ bỏ.** Người dùng đã xác nhận **toàn bộ hệ thống giữ lại vì đều cần**. Đừng đề xuất xoá.
Nhưng khi ước lượng rủi ro: mã đường này chưa chạy trên dữ liệu thật bao giờ.

## Cấu trúc code

| | |
|---|---:|
| Trang | 60 |
| API route | 25 |
| File server action | 91 |
| File TS/TSX (`app`+`components`+`lib`) | 992 |
| File chạm DB | 134 |
| Bảng | 98 |
| Hàm Postgres | 144 |
| Migration | 186 |
| ADR | 12 |

## Cách đo lại

```bash
node scripts/db-q.mjs "SELECT relname, n_live_tup FROM pg_stat_user_tables WHERE schemaname='public' ORDER BY n_live_tup DESC"
node scripts/db-q.mjs "SELECT to_char(created_at,'YYYY-MM') m, count(*), sum(total_amount)::bigint FROM contracts WHERE deleted_at IS NULL GROUP BY 1 ORDER BY 1 DESC"
node scripts/vault-gen-schema.mjs
node scripts/vault-gen-codemap.mjs
```

## Liên quan

[[gallery]] · [[bay-du-lieu]] · [[adr-index]] · [[trien-khai-va-verify]]
