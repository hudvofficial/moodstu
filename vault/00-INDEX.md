---
title: "INDEX — bản đồ vault"
tags: [meta, moc]
cap-nhat: 2026-09-10
trang-thai: da-kiem-2026-09-10
---

# INDEX — mood-studio

SaaS quản trị studio ảnh cưới. Next.js 16 (App Router) + Supabase, deploy Vercel region `sin1`, domain `stu.moodwedding.com`.
Xem [[README]] để biết cách dùng vault.

## Con số

⚠️ **Bảng dưới là ảnh chụp 2026-08-07 — phần lớn đã cũ.** Số sống lấy ở:
`npm run vault:db-truth` (DB) · [`agent/SYSTEM_MAP.md`](../agent/SYSTEM_MAP.md) phụ lục (code).
Đo lại 31/08: **93 bảng · 180 hàm DB · 217 RLS policy · 81 trigger · 16 enum · 61 trang · 26 API route · 85 file action · 203 migration · 5 vai trò**.

### Ảnh chụp 2026-08-07 (giữ để tra lịch sử)

| | |
|---|---:|
| Trang (`page.tsx`) | 60 |
| API route | 25 |
| File server action | 91 |
| File TS/TSX trong `app`+`components`+`lib` | 992 |
| Bảng DB (schema `public`) | 98 |
| Hàm Postgres (RPC) | 144 |
| Migration | 186 |
| Hợp đồng thật | 54 (~14–19/tháng) |
| Gallery / ảnh | 76 gallery / 17.704 ảnh (lớn nhất 780 ảnh) |

Chi tiết + xu hướng: [[so-lieu-van-hanh]]

## Chương trình tối ưu doanh nghiệp (02/09/2026 → 12 tuần) — sống ở `agent/`, không ở vault
- [`agent/PHUONG-AN.md`](../agent/PHUONG-AN.md) — 4 giai đoạn (Nền móng → Xương → Modules → Vận hành), cổng G1/G2/G3, 32 bước.
- [`agent/GOALS.yaml`](../agent/GOALS.yaml) — **sổ 32 bước, nguồn chân lý tiến độ**; thi hành bằng lệnh `/buoc` (`.claude/skills/buoc/SKILL.md`). Luật: không có trong sổ → không làm; vận hành ≠ việc tay cho chủ.
- [[quyet-dinh-C0-C9]] — 10 luật nghiệp vụ chủ đã chốt 02/09 (ngưỡng vàng/đỏ, sale rời CRM, không chặn chồng lịch, 6 số dashboard…).
- [`agent/inventory/00-lech-thiet-ke.md`](../agent/inventory/00-lech-thiet-ke.md) — sổ đối chiếu thiết kế ↔ thực tế (🔴/🟡/⬛), mọi phát hiện mới ghi vào đây trước.
- [`agent/DB-CHANGELOG.md`](../agent/DB-CHANGELOG.md) — mọi thay đổi DB prod (kể cả dọn rác) có dòng **trước** khi áp. `agent/HANDOFFS/T-*.spec.md` — spec từng bước, §6 là bằng chứng.
- [`agent/RUNBOOK-SU-CO.md`](../agent/RUNBOOK-SU-CO.md) · [`agent/V0-LOG.md`](../agent/V0-LOG.md) — sự cố & thước tuần.
- Đã xong tới 10/09: S1 backup/restore · S3 cờ ghi prod + hook · V0 ×2 · #8 dashboard 3 số · #12 R2 · #13 R1 · #22 role-gate · #30a bảng HĐ. Đang chờ: G1 (V0 mốc 3, 15/09) → GĐ2.

## Sự thật DB — sinh tự động, đừng sửa tay

Ba file dưới sinh từ database production bằng `npm run vault:db-truth`. Khi nghi tài liệu viết tay đã cũ, **tin ba file này**.

- [[rls-va-quyen]] — nội dung đầy đủ 217 policy + grant từng bảng. RLS chỉ là cổng cho anon key; server action dùng service-role nên bỏ qua RLS.
- [[ham-mo-coi]] — hàm DB không được code gọi, tách theo lý do (trigger / gọi bởi SQL / ứng viên chết).
- `30-du-lieu/than-ham/<nhóm>.md` — **thân đầy đủ** của 149 hàm ứng dụng, chia theo 12 vùng. 92 hàm là `SECURITY DEFINER` (bỏ qua RLS, phải tự kiểm quyền bên trong).

Lược đồ bảng/cột/FK/index: `npm run vault:schema` sinh `30-du-lieu/luoc-do-*.md`.

## Nền tảng

- [[kien-truc-tong-quan]] — tầng, luồng dữ liệu, vì sao không có client-direct
- [[xac-thuc-phan-quyen]] — 5 vai trò, ma trận quyền, `withAuth`/`requireXAccess`
- [[bao-mat-du-lieu-rls]] — RLS, grant, anon, service-role; vì sao REVOKE > policy
- [[cache-va-realtime]] — SWR/React Query/RSC, `revalidatePath`, Signal≠Data
- [[responsive-3-tier]] — Phone/Tablet/Desktop, breakpoint chuẩn
- [[tich-hop-ngoai]] — Google Drive/OAuth, Gemini, Sentry, push, Vercel
- [[quy-uoc-code]] — đặt tên, cấu trúc thư mục, style, toast, optimistic

## Module nghiệp vụ

| Module | Nội dung | Lược đồ DB |
|---|---|---|
| [[hop-dong]] | Trung tâm hệ thống — hợp đồng, hạng mục, sự kiện, checklist | [[luoc-do-hop-dong]] |
| [[gallery]] | Album ảnh giao khách, chọn ảnh, thả tim, lọc về Drive | [[luoc-do-gallery]] |
| [[tai-chinh]] | Thu chi, phiếu, kế hoạch thanh toán, công nợ, khóa sổ | [[luoc-do-tai-chinh]] |
| [[khach-hang-crm]] | Lead → khách hàng | [[luoc-do-khach-hang-crm]] |
| [[dich-vu]] | Gói dịch vụ, báo giá, bảng giá | [[luoc-do-dich-vu]] |
| [[nhan-su]] | Nhân sự, lương, phân công, năng suất | [[luoc-do-nhan-su]] |
| [[in-an-lab]] | Đơn in, lab đối tác, công nợ lab | [[luoc-do-in-an-lab]] |
| [[vat-tu]] | Vật tư, nhập/xuất kho | [[luoc-do-vat-tu]] |
| [[vay-cuoi]] | Váy cưới, cho thuê, đặt giữ | [[luoc-do-vay-cuoi]] |
| [[nha-cung-cap]] | Vendor, chi phí thuê ngoài | [[luoc-do-nha-cung-cap]] |
| [[moodie-ai]] | Trợ lý AI (chat, giọng nói, agent, memory) | [[luoc-do-moodie-ai]] |
| [[he-thong]] | Dashboard, lịch, báo cáo, cài đặt, audit, thông báo | [[luoc-do-he-thong]] |

## Luồng xuyên module

- [[vong-doi-hop-dong]] — từ lead tới đóng sổ, ai đổi trạng thái ở đâu
- [[luong-tien]] — tiền vào/ra chảy qua bảng nào, số nào là chân lý
- [[luong-gallery]] — upload → khách xem → chọn → lọc về Drive → hậu kỳ

## Bản đồ code (sinh tự động)

- [[ban-do-route]] — 85 route: dùng action nào, chạm bảng nào
- [[ban-do-server-action]] — 91 file action → bảng/RPC
- [[bang-doc-ghi]] — **bảng → ai đọc/ai ghi**; tra trước khi lo chuyện đồng thời
- [[rpc-va-enum]] — 144 hàm Postgres + enum
- [[canh-bao-schema]] — cách giữ `database.types.ts` khớp DB + hai chỗ types không phủ được

## Bẫy & quyết định

- [[bay-du-lieu]] — cache, optimistic, phân trang, cột lệch
- [[bay-ui-react]] — React Compiler, hooks, layout, ảnh
- [[bay-trien-khai]] — lockfile, migration, dev server, verify
- [[adr-index]] — 13 ADR đã chốt

## Vận hành

- [[trien-khai-va-verify]] — deploy, script verify, CI
- [[so-lieu-van-hanh]] — quy mô thật, dùng để quyết định tối ưu
