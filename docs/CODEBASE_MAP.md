# Mood Studio Codebase Map

> ## ⚠️ LỖI THỜI — giữ để tra lịch sử
>
> **Thay bằng bản đồ sinh tự động:** [`vault/20-ban-do-code/`](../vault/20-ban-do-code/) —
> [`ban-do-route.md`](../vault/20-ban-do-code/ban-do-route.md) (route → action → bảng) ·
> [`ban-do-server-action.md`](../vault/20-ban-do-code/ban-do-server-action.md) ·
> [`bang-doc-ghi.md`](../vault/20-ban-do-code/bang-doc-ghi.md) (bảng → ai đọc/ghi).
>
> Bản đồ trong vault đi theo import graph thật và sinh lại được bằng `node scripts/vault-gen-codemap.mjs`. File này viết tay, đã cũ. Mâu thuẫn → **tin vault**.

Tài liệu này tổng hợp kết quả Batch 1 và Batch 2 thành một bản đồ mã nguồn ngắn gọn, dễ quét, ưu tiên theo module và trách nhiệm.

## 1. Infrastructure

### App shell, routing, auth
```text
app/
├── layout.tsx
├── (dashboard)/
├── (protected)/
│   ├── dashboard/
│   ├── contracts/
│   ├── crm/
│   ├── finance/
│   ├── dresses/
│   ├── inventory/
│   ├── printing/
│   ├── moodie/
│   ├── reports/
│   ├── services/
│   ├── settings/
│   └── employees/
├── auth/
├── login/
├── forgot-password/
├── reset-password/
└── api/
```
- `app/layout.tsx`: root layout, providers, app bootstrap.
- `app/(protected)/...`: toàn bộ khu vực cần đăng nhập, chia theo business domain.
- `app/api/*`: route handlers cho auth, calendar sync, gallery download, push, OG, monitoring.
- `app/actions/*`: server actions chính của hệ thống; đây là lớp mutation/query nghiệp vụ quan trọng nhất.

### Shared UI, providers, app framework
```text
components/
├── layout/
├── providers/
├── theme/
└── ui/
contexts/
hooks/
```
- `components/ui/`: primitive UI dùng lại toàn app.
- `components/layout/`: shell, sidebar, header, bottom-nav, offline states.
- `components/providers/`: SWR, query provider, modal renderer.
- `contexts/`: header slots, pull-to-refresh, scroll container.
- `hooks/`: realtime, infinite scroll, mobile, network quality, filter hooks.

### Core libraries & platform utilities
```text
lib/
├── supabase/
├── api/
├── services/
├── hooks/
├── utils/
├── validations/
├── context/
└── moodie/
```
- `lib/supabase/`: Supabase client/server/middleware.
- `lib/validations/`: schema validation theo domain.
- `lib/services/`: service layer đồng bộ/phụ trợ nghiệp vụ.
- `lib/utils/`: helper dùng chung cho export, file system, printing grouping...
- `lib/hooks/`: domain hooks cấp thư viện.

## 2. Core Business

### Contracts
```text
app/(protected)/contracts/
components/contracts/
app/actions/contract-*.ts
lib/contracts/
```
- Quản lý hợp đồng, timeline sự kiện, checklist, notes, payment plan, refund, profit.
- Có route chi tiết, edit, gallery và print gắn theo từng contract.

### CRM
```text
app/(protected)/crm/
components/crm/
app/actions/lead-*.ts
app/actions/customer-actions.ts
```
- Quản lý leads, customers, pipeline, care log, risk flags.
- CRM là đầu vào vận hành; lead có thể convert sang customer/contract.

### Finance
```text
app/(protected)/finance/
components/finance/
app/actions/finance-*.ts
app/actions/expense-actions.ts
app/actions/receipt-actions.ts
app/actions/debt-actions.ts
app/actions/payment-actions.ts
```
- Quản lý receipts, expenses, debts, salaries, goals, investments, cashflow, dashboard, closes.
- Có cơ chế close period để khóa dữ liệu kế toán đã chốt.

### Dresses
```text
app/(protected)/dresses/
components/dresses/
app/actions/dress-*.ts
app/actions/rental-*.ts
```
- Quản lý váy, trạng thái, QR scan, lịch sử thuê, standalone rentals, return flow.

### Inventory
```text
app/(protected)/inventory/
components/inventory/
app/actions/inventory-*.ts
```
- Quản lý vật tư, stock in/out, transaction history, approval requests, order details.

### Printing
```text
app/(protected)/printing/
components/printing/
app/actions/printing-*.ts
```
- Theo dõi đơn in, nhóm đơn, payment history, deposit/final payment, workflow lab/production.

### Gallery
```text
app/gallery/
app/api/gallery-download/
app/api/gallery-download-batch/
components/gallery/
app/actions/gallery-*.ts
lib/gallery-*.ts
```
- Gallery public/private cho khách hàng.
- Tối ưu download batch, selection, masonry layout, reactions, cursor loading.

### Employees, Productivity, Services, Reports
- `app/(protected)/employees/`, `components/employees/`: hồ sơ nhân sự, notes, stats.
- `app/(protected)/productivity/`, `components/productivity/`: năng suất cá nhân/đội nhóm.
- `app/(protected)/services/`, `components/services/`: quản lý dịch vụ và category.
- `app/(protected)/reports/`, `components/reports/`: báo cáo tổng hợp, export.

## 3. Services & Data

### Moodie AI
```text
app/(protected)/moodie/
components/moodie/
lib/moodie/
app/actions/moodie-queries.ts
app/actions/moodie-mutations.ts
```
- Trợ lý AI nội bộ có conversation UI, tool catalog, engine, model prompt, records.
- Tool-calling được gắn với quyền truy cập thực tế của user.

### Settings & administration
```text
app/(protected)/settings/
components/settings/
app/actions/settings-*.ts
app/actions/user-management.ts
app/actions/audit-log-actions.ts
```
- Cấu hình studio, profile, thành viên, notification prefs, Google Calendar, Moodie AI card, audit logs.

### Data/config/static
```text
data/
constants/
memory/
docs/
```
- `data/`: changelog, batches và dữ liệu tĩnh hỗ trợ app.
- `constants/`: service colors, work statuses.
- `memory/`: workspace memory nội bộ.
- `docs/`: tài liệu vận hành/kỹ thuật.

## 4. Kết luận kiến trúc
- Trục chính của hệ thống là `app/actions/*` + `components/<domain>/*` + `app/(protected)/<domain>`.
- Supabase là data backbone; hooks/realtime/providers là lớp trải nghiệm.
- Business domains được tách khá rõ: CRM → Contracts → Finance/Printing/Gallery và các module hỗ trợ như Dresses, Inventory, Productivity, Settings, Moodie.
