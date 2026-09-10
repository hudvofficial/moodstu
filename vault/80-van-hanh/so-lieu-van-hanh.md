---
title: "Số liệu vận hành thật"
tags: [van-hanh, so-lieu]
cap-nhat: 2026-08-31
trang-thai: da-kiem-2026-08-31
doi-chieu: agent/SYSTEM_MAP.md (phụ lục + §6) · vault/30-du-lieu/luoc-do-*.md · vault/30-du-lieu/ham-mo-coi.md
---

# Số liệu vận hành thật

Dùng để quyết định *có đáng tối ưu không* — trước khi giả định quy mô, đọc trang này.

⚠️ **Mỗi con số dưới đây là một ẢNH CHỤP có ngày.** Trang này từng ghi mọi thứ như thể cùng một thời điểm; giờ mỗi bảng nói rõ đo ngày nào. Ba mốc đang có:

| Mốc | Nguồn | Đo gì |
|---|---|---|
| **07/08/2026** | lần introspect đầu | nghiệp vụ theo tháng, người dùng, cấu trúc code cũ |
| **~27/08/2026** | `30-du-lieu/luoc-do-*.md` (frontmatter còn ghi 07/08 — **sai**, xem `agent/system-map/01-tien.md` §7 #9) | số dòng từng bảng |
| **31/08/2026** | `agent/SYSTEM_MAP.md` phụ lục + `30-du-lieu/ham-mo-coi.md` (`pg_proc` thật) | cấu trúc code, số hàm DB, rủi ro đã đo |

Không chắc số nào của mốc nào → chạy lại: `node scripts/db-q.mjs`, `npm run vault:db-truth`.

## Người dùng — đo 07/08/2026

**1 admin + 1 kinh doanh có đăng nhập.** Nhân sự khác chưa được cấp tài khoản.
Thiết bị: **PC, mobile, iPad** — cả ba đều dùng thật.

→ Hệ quả: các kịch bản đa-người-dùng đồng thời **gần như không xảy ra**. Đừng thiết kế cho chúng khi chưa có yêu cầu.
→ Nhưng responsive thì phải đủ 3 tầng, không tầng nào phụ. → [[responsive-3-tier]]

⚠️ "Không có tác nhân thứ hai" **không** còn suy được từ chỗ này cho mọi bảng — Moodie ghi được vào `gallery_images` sau khi user duyệt. → [[bay-du-lieu]] #13

## Nghiệp vụ — hợp đồng theo tháng đo 07/08/2026

| | |
|---|---:|
| — 05/2026 | 14 hợp đồng · 49,85 tr |
| — 06/2026 | 19 hợp đồng · 98,80 tr |
| — 07/2026 | 16 hợp đồng · 76,83 tr |
| — 08/2026 (tới ngày 7) | 3 hợp đồng · 6,80 tr |

**~14–19 hợp đồng/tháng.** Đây là quy mô thật — bảng danh sách hợp đồng sẽ **không bao giờ** cần ảo hoá.

Số tổng, đo ~27/08/2026 (`luoc-do-*.md`):

| | 07/08 | ~27/08 |
|---|---:|---:|
| Hợp đồng (chưa xoá) | 54 | **64** |
| Khách hàng | 55 | **65** |
| Lead CRM | 4 | 4 |
| Dịch vụ | 18 (7 danh mục) | 18 |
| Nhân sự | 7 | **12** |
| Đơn in | 29 | **35** (33 đang sống, đo 31/08) |
| Vendor | 8 | **10** |
| Vật tư | 3 | 3 |
| Váy | 2 | 2 |

## Dữ liệu — số dòng đo ~27/08/2026

| Bảng | 07/08 | ~27/08 |
|---|---:|---:|
| `gallery_images` | 17.704 | **20.719** |
| `audit_logs` | 10.798 | **14.226** |
| `moodie_voice_events` | 3.279 | **3.436** |
| `gallery_reactions` | 1.228 | **1.672** |
| `ai_messages` | 367 | 373 |
| `contract_checklists` | 281 | 333 |
| `gallery_share_links` | 219 | 258 |
| `contract_events` | 185 | 217 |
| `gallery_comments` | 169 | 201 |
| `realtime_signals` | — | 176 |
| `work_tasks` | 143 | 166 |
| `payment_plans` | 200 | **121** (M4 xoá 119 dòng Đợt 1/2 rỗng) |
| `galleries` | 76 | 89 |
| `contract_items` | — | 84 |
| `expenses` | — | 81 |
| `printing_order_status_history` | — | 66 |
| `payments` · `payment_plan_allocations` | — | 51 · 51 |
| `expense_allocations` | — | 40 (bảng mới, ADR-016 M1) |
| còn lại | < 75 | < 65 |

**Chỉ 2 bảng vượt 10.000 dòng.** Mọi vấn đề hiệu năng thật của hệ thống nằm ở **gallery** và **audit log**, không ở đâu khác.

## Gallery — nơi duy nhất cần lo quy mô

| | 07/08 | ~27/08 |
|---|---:|---:|
| Gallery | 76 | **89** |
| Ảnh | 17.704 (~233/gallery) | **20.719** (~233/gallery) |
| Album lớn nhất | **780 ảnh** | — |
| Top 8 album | 517–780 ảnh | — |

→ **Vượt giới hạn 1000 dòng của PostgREST là chuyện đã xảy ra, không phải giả định.** Mọi thao tác đếm/lấy toàn bộ ảnh phải phân trang. → [[bay-du-lieu]] #1
→ 780 ảnh × ~500 tim tiềm năng cũng vượt giới hạn header 16KB của `.in()`. Nợ ở đường lọc Drive **đã trả**; nợ phân trang còn ở 5 hàm đọc reaction/comment.

> ⚠️ CHƯA KIỂM (2026-08-31): kích thước album lớn nhất sau khi gallery lên 89 — số 780 là của 07/08.

## Bảng rỗng — tính năng đã dựng, chưa dùng (đo ~27/08/2026)

`service_bundles` · `service_relations` · `price_rules` · `promotions` · `budgets` · `financial_goals` · `goal_contributions` · `fixed_costs` · `debts` · `investments` · `finance_close_tasks` · **`finance_monthly_closes`** · `salary_adjustments` · `attendance` · `work_shifts` · `evaluations` · `requests` · `equipment` · `documents` · `notifications` · `push_subscriptions` · `dress_rentals` · `dress_reservations` · `gallery_albums` · `gallery_selection_batches`
*(`inventory_reservations` · `order_payments` · `lab_payments` · `vendor_payments` + 2 bảng phân bổ đã DROP — ADR-016 M2b / ADR-017)*

**Đã hết rỗng:** `gallery_filter_jobs` (7 dòng) · `employee_salaries` (2 dòng, sinh từ M5).

**Rỗng ≠ bỏ.** Người dùng đã xác nhận **toàn bộ hệ thống giữ lại vì đều cần**. Đừng đề xuất xoá.
Nhưng khi ước lượng rủi ro: mã đường này chưa chạy trên dữ liệu thật bao giờ.

⚠️ `finance_monthly_closes` **0 dòng** — nghĩa là **chưa kỳ nào từng được khoá sổ**. Mọi luật `is_period_locked` chưa từng chặn ai. [[tai-chinh]] có chỗ ghi "1 dòng" — sai.

## Cấu trúc code

| | 07/08 | **31/08** |
|---|---:|---:|
| Trang | 60 | **61** (54 protected · 7 công khai) |
| API route | 25 | **27** |
| File server action | 91 | **85** |
| File TS/TSX (`app`+`components`+`lib`) | 992 | — |
| File chạm DB | 134 | — |
| Bảng | 98 | **93** |
| View | 4 | **2** (`employees_public`, `payment_plan_states`) |
| **Hàm Postgres thật trên DB** | 144 | **149** — trong đó 92 là `SECURITY DEFINER`, 30 không được code nào gọi |
| Hàm trong `types/database.types.ts` | 130 | **124** (lệch chữ ký đúng **1** hàm) |
| RPC được code gọi | — | **107** |
| Enum | 16 | 16 |
| Migration | 186 | **203** |
| ADR | 12 | **18** |
| Bảng gắn trigger `emit_realtime_signal` | — | **35** |
| Bảng trong publication realtime | — | **1** (`realtime_signals`) |

Thân đầy đủ 149 hàm: `30-du-lieu/than-ham/<nhóm>.md`. Hàm không ai gọi: [[ham-mo-coi]].

## Rủi ro đã đo trên DB — 31/08/2026

| | Số |
|---|---:|
| 🔴 Hợp đồng **không huỷ được** (`cancel_contract_cascade` ghi `printing_orders.status='da_huy'` → CHECK 23514) | **5** |
| Đơn in mang `da_huy` | 0 ⇒ hàm chưa từng ghi thành công kể từ 24/08 |
| Hợp đồng `da_huy` hiện có | 0 ⇒ chưa ai chạm tới |
| 🟡 Phiếu hoàn tiền HĐ đã huỷ (làm lệch lãi/lỗ) | 0đ — **nổ cùng lúc** với dòng trên |

Chi tiết + cách sửa: `agent/SYSTEM_MAP.md` §6 · [[vong-doi-hop-dong]] · [[luong-tien]].

## Cách đo lại

```bash
node scripts/db-q.mjs "SELECT relname, n_live_tup FROM pg_stat_user_tables WHERE schemaname='public' ORDER BY n_live_tup DESC"
node scripts/db-q.mjs "SELECT to_char(created_at,'YYYY-MM') m, count(*), sum(total_amount)::bigint FROM contracts WHERE deleted_at IS NULL GROUP BY 1 ORDER BY 1 DESC"
npm run vault:db-truth              # thân hàm + RLS + hàm mồ côi, từ DB thật
node scripts/vault-gen-schema.mjs   # lược đồ bảng/cột/FK/index
node scripts/vault-gen-codemap.mjs  # bản đồ route/action
```

**Đo xong thì sửa luôn ngày ở đầu trang này.** Số không có ngày là số không dùng được.

## Liên quan

[[gallery]] · [[bay-du-lieu]] · [[adr-index]] · [[trien-khai-va-verify]] · [[ham-mo-coi]]
