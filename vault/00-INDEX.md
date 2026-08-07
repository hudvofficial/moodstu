---
title: "INDEX — bản đồ vault"
tags: [meta, moc]
cap-nhat: 2026-08-07
---

# INDEX — mood-studio

SaaS quản trị studio ảnh cưới. Next.js 16 (App Router) + Supabase, deploy Vercel region `sin1`, domain `stu.moodwedding.com`.
Xem [[README]] để biết cách dùng vault.

## Con số (đo 2026-08-07)

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
- [[adr-index]] — 12 ADR đã chốt

## Vận hành

- [[trien-khai-va-verify]] — deploy, script verify, CI
- [[so-lieu-van-hanh]] — quy mô thật, dùng để quyết định tối ưu
