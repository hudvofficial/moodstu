---
title: "Kiểm kê — Script vận hành"
lat-cat: 16-scripts
cap-nhat: 2026-09-01
trang-thai: sinh-tu-dong
nguon: quét scripts/ + regex
---

> ⚙️ Sinh bởi `scripts/vault-gen-kiem-ke-code.mjs`. ĐỪNG sửa tay.

# Script vận hành

98 file. **60** chạm database (dev = prod!), trong đó **40** có lệnh GHI (regex, đếm cả `rpc(` đọc), **22** gắn cờ 🔒 `ALLOW_PROD_WRITE` (S3 #10 — đo thật 05/09: 22 script ghi).
Nhãn dựa trên regex — nhãn GHI nghĩa là *có khả năng ghi*, chạy hay không do người gọi. 🔒 = dừng nếu thiếu cờ.

| Script | Chạm DB | Mô tả (dòng chú thích đầu) |
|---|---|---|
| `analyze-batches-21-25.py` | cục bộ | !/usr/bin/env python3 |
| `apply-migration.mjs` | DB: đọc 🔒 cờ | !/usr/bin/env node |
| `audit-bottom-nav.mjs` | cục bộ | !/usr/bin/env node |
| `auto-migrate.mjs` | **DB: GHI** 🔒 cờ | !/usr/bin/env node |
| `backfill-all-galleries.mjs` | **DB: GHI** 🔒 cờ | !/usr/bin/env node |
| `backfill-blurhash.mjs` | **DB: GHI** 🔒 cờ | !/usr/bin/env node |
| `backfill-dimensions-sharp.mjs` | **DB: GHI** 🔒 cờ | !/usr/bin/env node |
| `backfill-image-dimensions.mjs` | **DB: GHI** 🔒 cờ | !/usr/bin/env node |
| `backfill-simple.mjs` | **DB: GHI** 🔒 cờ | !/usr/bin/env node |
| `backfill-single-gallery.mjs` | **DB: GHI** 🔒 cờ | !/usr/bin/env node |
| `backfill-this-gallery.mjs` | **DB: GHI** 🔒 cờ | !/usr/bin/env node |
| `backup-db.ps1` | DB: đọc | backup-db.ps1 — dump DB production Mood Studio ve o H moi dem (chuan S1, buoc #4) |
| `backup-install-task.ps1` | cục bộ | backup-install-task.ps1 — dang ky Task Scheduler chay backup-db.ps1 luc 02:00 moi dem |
| `build-code-index.mjs` | cục bộ | !/usr/bin/env node |
| `check-freelancer-salary.sql` | cục bộ | ═══════════════════════════════════════════════════════════ |
| `check-rls-policies.sql` | cục bộ | Check RLS policies for gallery_images table |
| `check-vendor-index.mjs` | cục bộ | — |
| `check-vendors-in-rpc.mjs` | **DB: GHI** | !/usr/bin/env node |
| `cleanup-e2e-data.mjs` | **DB: GHI** 🔒 cờ | — |
| `db-q.mjs` | DB: đọc | !/usr/bin/env node |
| `debug-gallery-images.mjs` | cục bộ | !/usr/bin/env node |
| `debug-gallery.mjs` | **DB: GHI** | !/usr/bin/env node |
| `fix-imports.js` | cục bộ | — |
| `fix-knowledge-graph.py` | cục bộ | !/usr/bin/env python3 |
| `fix.js` | cục bộ | Remove trailing null bytes / utf-16 artifacts |
| `full-diagnostic.mjs` | DB: đọc | !/usr/bin/env node |
| `inspect-service-types.mjs` | DB: đọc | Load from .env.local |
| `prod-guard.mjs` | cục bộ | — |
| `migrate-direct.mjs` | DB: đọc 🔒 cờ | !/usr/bin/env node |
| `migrate-vendors-pg.mjs` | DB: đọc | !/usr/bin/env node |
| `normalize-services.mjs` | **DB: GHI** 🔒 cờ | — |
| `perf-audit.mjs` | cục bộ | — |
| `perf-chunks.mjs` | cục bộ | Budget note: Turbopack emits flat-hashed chunk filenames (e.g. `17v9vbcfv8x5a.js`) |
| `perf-contract-detail.mjs` | **DB: GHI** | !/usr/bin/env node |
| `perf-operational-probe.mjs` | **DB: GHI** | — |
| `prepare-dev-sw.mjs` | cục bộ | — |
| `probe-anon-access.mjs` | **DB: GHI** 🔒 cờ | Test ANON đọc được gì THẬT (anon key, không sign-in) — kỷ luật A12: verify |
| `qa-contracts-tablet.mjs` | cục bộ | — |
| `refactor.js` | cục bộ | — |
| `release.mjs` | cục bộ | — |
| `restore-drill-compare.mjs` | DB: đọc | !/usr/bin/env node |
| `restore-drill.ps1` | cục bộ | restore-drill.ps1 — dien tap khoi phuc ban dump vao Postgres CUC BO (buoc #7, RUNBOOK-SU-CO §2) |
| `run-migration-vendors.mjs` | **DB: GHI** | !/usr/bin/env node |
| `run-migration.mjs` | **DB: GHI** 🔒 cờ | !/usr/bin/env node |
| `run-vendor-migrations.mjs` | **DB: GHI** 🔒 cờ | !/usr/bin/env node |
| `smoke-calendar.mjs` | **DB: GHI** 🔒 cờ | — |
| `smoke-contracts.mjs` | **DB: GHI** 🔒 cờ | — |
| `smoke-dashboard.mjs` | **DB: GHI** 🔒 cờ | — |
| `smoke-employees.mjs` | **DB: GHI** 🔒 cờ | — |
| `smoke-production-public.mjs` | cục bộ | — |
| `smoke-settings.mjs` | **DB: GHI** 🔒 cờ | — |
| `test-gallery-pagination.mjs` | **DB: GHI** | !/usr/bin/env node |
| `test-image-urls.mjs` | DB: đọc | !/usr/bin/env node |
| `test-pooler.mjs` | DB: đọc | !/usr/bin/env node |
| `test-rpc-migration.mjs` | cục bộ | !/usr/bin/env node |
| `test-rpc-v3.mjs` | **DB: GHI** | !/usr/bin/env node |
| `check-exact-query.js` | DB: đọc | — |
| `check-fk.js` | **DB: GHI** | — |
| `fetch_meta.js` | cục bộ | — |
| `test-bottom-nav.mjs` | cục bộ | !/usr/bin/env node |
| `test-google-direct.js` | **DB: GHI** | — |
| `test-query-2.mjs` | DB: đọc | Import the function directly, but since it's a Next.js Server Action, it might fail outside of Next.js context |
| `test-query.mjs` | DB: đọc | Import the function directly, but since it's a Next.js Server Action, it might fail outside of Next.js context |
| `test-splash-debug.mjs` | cục bộ | !/usr/bin/env node |
| `v0-snapshot.mjs` | DB: đọc | V0 — thước đo tuần của chương trình tối ưu (bước #5, chuẩn S4). |
| `vault-gen-codemap.mjs` | cục bộ | Sinh bản đồ code: route → component → server action → bảng/RPC. |
| `vault-gen-db-truth.mjs` | DB: đọc | Sinh "sự thật DB" vào vault/30-du-lieu/ — phần mà vault-gen-schema.mjs KHÔNG lấy: |
| `vault-gen-diff-db-repo.mjs` | cục bộ | Diff catalog DB (sự thật) ↔ repo (migrations) — trọng tài khi repo ≠ DB. |
| `vault-gen-kiem-ke-code.mjs` | **DB: GHI** | Kiểm kê CƠ HỌC phần mã nguồn chưa phủ: scripts/ + components/ + lib/ + hooks/ + service worker. |
| `vault-gen-kiem-ke.mjs` | DB: đọc | Sinh BẢNG KIỂM KÊ TOÀN HỆ THỐNG vào agent/inventory/ |
| `vault-gen-schema.mjs` | DB: đọc | Sinh note lược đồ DB theo module vào vault/30-du-lieu/ |
| `vendor-accrual-preview.mjs` | DB: đọc | !/usr/bin/env node |
| `vendor-expense-dupe-report.mjs` | DB: đọc | !/usr/bin/env node |
| `vendor-expense-dupe-scan.sql` | cục bộ | Read-only: đếm + tổng tiền các phiếu chi trùng (tạo lúc thanh toán, trước Phase 1) |
| `verify-calendar.mjs` | **DB: GHI** | — |
| `verify-contracts.mjs` | **DB: GHI** | — |
| `verify-dashboard.mjs` | **DB: GHI** | — |
| `verify-dresses.mjs` | **DB: GHI** | — |
| `verify-employees.mjs` | **DB: GHI** | — |
| `verify-inventory.mjs` | **DB: GHI** | — |
| `verify-moodie-chat-ui.mjs` | cục bộ | — |
| `verify-moodie-runtime-policy.mjs` | cục bộ | — |
| `verify-payment-stage-key.mjs` | cục bộ | — |
| `verify-performance-release.mjs` | cục bộ | — |
| `verify-printing.mjs` | **DB: GHI** | — |
| `verify-privileged-entrypoints.mjs` | cục bộ | — |
| `verify-productivity.mjs` | **DB: GHI** | — |
| `verify-pwa-build-artifact.mjs` | cục bộ | — |
| `verify-pwa-cache-policy.mjs` | cục bộ | — |
| `verify-realtime-client-surface.mjs` | cục bộ | — |
| `verify-realtime-publication.mjs` | **DB: GHI** 🔒 cờ | Verify E2E migration 20260610120000: 5 bảng mới trong supabase_realtime |
| `verify-realtime-signals.mjs` | **DB: GHI** 🔒 cờ | Verify E2E migration 20260610130000 (realtime_signals — pattern Signal ≠ Data): |
| `verify-reports.mjs` | **DB: GHI** | — |
| `verify-rpc-params.sql` | cục bộ | Check current RPC signature in production |
| `verify-services.mjs` | **DB: GHI** | — |
| `verify-settings-realtime.mjs` | DB: đọc | !/usr/bin/env node |
| `verify-settings.mjs` | cục bộ | — |
| `verify-utf8-mojibake.mjs` | cục bộ | — |
