# 09 — BÁO CÁO · CÀI ĐẶT · ADMIN · NHẬT KÝ (mood-studio)

> Bổ sung 4 khu bị bỏ sót khỏi bản đồ 6 miền (`agent/system-map/01..06`).
> Quy ước: mọi khẳng định kèm `file:dòng`. Migration = **lịch sử**, file mới nhất thắng.
> Không chạm DB trong phiên này — số dòng bảng lấy từ `vault/30-du-lieu/luoc-do-he-thong.md` (ảnh chụp 2026-08-07, xem §7–§8).

---

## 1. Bảng dữ liệu

### 1.1 Bảng thuộc miền này

| Bảng | Số dòng (vault) | RLS / policy (vault) | Ai ghi | Bằng chứng |
|---|---:|---|---|---|
| `audit_logs` | 14 226 | ✅ / **2 policy** | `lib/audit.ts:66` (service role) + `app/actions/moodie-benchmark-actions.ts:77` (insert thẳng) | `vault/30-du-lieu/luoc-do-he-thong.md:16,28-30` |
| `system_settings` | 23 | ✅ / **0 policy** | 3 file action, tất cả `withAdmin` — xem §1.3 | `luoc-do-he-thong.md:17,66-68`; policy bị DROP ở `20260429142000_settings_security_hardening.sql:6` |
| `studio_info` | 1 | ✅ / 4 policy | `settings-mutations.ts` (3 hàm) + `api/auth/google/callback` + **`lib/google-auth.ts:69-72`** (refresh token) + `lib/studio-info.ts:37-41` (tạo dòng mặc định) | `luoc-do-he-thong.md:18,87-89` |
| `notification_preferences` | 1 | ✅ / 1 policy | `settings-queries.ts:49-62` (get-or-create), `notification-actions.ts:61-70` | `luoc-do-he-thong.md:20` |
| `credit_cards` | — | — | `debt-actions.ts:397/429/478` (đều `withAdmin`, đều có audit) | `app/(protected)/settings/credit-cards/page.tsx:19-25` |
| `checklist_templates` | — | — | **KHÔNG có UI/action nào ghi.** Chỉ seed bằng migration | đọc: `app/actions/checklist-actions.ts:73-78`; seed: `20260506093000_seed_checklist_templates_and_backfill.sql:7-8,86` |
| `vendors` (trang `/admin/vendors`) | — | — | `vendor-actions.ts:131/148/189/234` | → miền `03-in-kho-vay` |
| `galleries`/`gallery_images` (trang `/admin/backfill-dimensions`) | — | — | `gallery-dimensions-actions.ts:11-42` | → miền `05-gallery-moodie` |

### 1.2 `audit_logs` — cột & enum

Cột (từ `types/database.types.ts:347-363` + `vault/30-du-lieu/luoc-do-he-thong.md:32-48`):
`id · employee_id → employees.id · performed_by (uuid, auth.users) · action (text tự do) · table_name · record_id · old_data · new_data · description · log_type · severity · source · ip_address · user_agent · created_at`

| Enum | Giá trị | Bằng chứng |
|---|---|---|
| `log_type_enum` | `EVENT_CHANGE · ASSIGNMENT · CONFLICT · ERROR · GENERAL` | `types/database.types.ts:6811-6816` |
| `severity_enum` | `INFO · WARNING · ERROR · CRITICAL` | `:6832` |
| `log_source_enum` | `trigger · server_action · frontend · system` | `:6810` |

**`ip_address` và `user_agent` không bao giờ được ghi** — `writeAuditLog` không set 2 cột này (`lib/audit.ts:66-78`).
**`action` là `text`, không phải enum** (`types/database.types.ts:348`) — TypeScript ràng buộc 8 giá trị (`lib/audit.ts:25-33`) nhưng DB nhận bất kỳ chuỗi nào.

### 1.3 `system_settings` — 23 khoá, ai ghi cái gì

| Nhóm | Khoá | Hàm ghi (đều `withAdmin`) | Hàm đọc |
|---|---|---|---|
| Gemini (legacy) | `moodie_gemini_api_key`, `moodie_gemini_model` + fallback `gemini_api_key`, `gemini_model` | `settings-mutations.ts:189-211` | `lib/system-settings.ts:84-105, 107-110, 112-122, 124-140` |
| Provider LLM | `moodie_provider_id/_base_url/_api_key/_model/_models/_embedding_model/_embedding_enabled/_label` | `moodie-provider-actions.ts:240-378` | `lib/moodie/providers/registry.ts:27-34, 60-110` |
| Voice (STT) | `moodie_voice_api_key`, `moodie_voice_stt_model` | `moodie-provider-actions.ts:634-663` | `lib/moodie/voice-config.ts:18-19, 46-51` |
| Voice Live / Realtime | `moodie_voice_live_model/_live_voice/_engine/_realtime_provider/_openai_api_key/_openai_model/_openai_voice` | `moodie-provider-actions.ts:442-500` | `lib/moodie/voice-live-config.ts:8-14, 67-73` |
| Brave Search | `moodie_brave_enabled/_api_key/_endpoint/_mcp_url/_mcp_token/_timeout_ms/_max_response_bytes` | `moodie-provider-actions.ts:582-605` | `lib/moodie/brave-config.ts:6-12, 58-64` |
| Browser / CloakBrowser | `moodie_browser_enabled`, `moodie_cloak_cdp_url`, `moodie_cloak_cdp_token`, `moodie_browser_timeout_ms` | `moodie-provider-actions.ts:534-551` | `lib/moodie/browser-config.ts:6-9, 41-47` |

Seed các khoá provider: `supabase/migrations/20260709120000_moodie_provider_settings.sql:9-17`.
Mọi khoá bí mật đi qua `encryptSecret` (AES-256-GCM, tiền tố `enc:v1:`) — `lib/settings-secrets.ts:9, 39-53`; đọc ra bằng `decryptSecret` (`:55-74`), và `decryptSecret` **trả nguyên văn** nếu chuỗi không có tiền tố (`:58`) → khoá cũ lưu plaintext vẫn dùng được.

### 1.4 `studio_info` vs `system_settings` — khác nhau chỗ nào

| | `studio_info` | `system_settings` |
|---|---|---|
| Hình dạng | **1 dòng, nhiều cột** (`name, address, hotline, representative, logo_url, bank_info jsonb, social_links jsonb, working_hours jsonb, timezone, google_oauth jsonb`) — `luoc-do-he-thong.md:91-105` | **key–value**, `key TEXT UNIQUE`, `value TEXT` — `20260420103000_create_system_settings.sql:1-7` |
| Nội dung | Danh tính doanh nghiệp + token Google | Cấu hình runtime AI (provider, model, khoá API) |
| Ai ĐỌC | Cả app: 7 trang in/báo giá gọi `getStudioInfo()` (**`withAuth`**, tức mọi user đăng nhập) — `settings-queries.ts:171-179`; call site: `contracts/[id]/print/page.tsx:33`, `finance/receipts/**`, `finance/expenses/[id]/**`, `finance/debts/page.tsx:25`, `services/[id]/quote/page.tsx:42` | Chỉ server, qua `createAdminClient()` — `lib/system-settings.ts:68-69`, `registry.ts:75-78` |
| Ai GHI | `withAdmin` (3 hàm) + OAuth callback + **refresh token tự động** | `withAdmin` (3 file action) |
| RLS/grant | `ENABLE + FORCE RLS`, `REVOKE ALL FROM PUBLIC, anon, authenticated`, `GRANT ALL TO service_role` — `20260428183000_services_security_atomic_writes.sql:13,17-19` | như trên, `20260429142000:3-11` |
| Rò rỉ token? | **Không** — `getStudioInfo` ép `google_oauth: null` trước khi trả về client (`settings-queries.ts:176`); trang admin cũng chỉ nhận vỏ rỗng (`lib/settings-studio-admin.ts:14-37`) | Khoá chỉ trả về dạng mask `********xxxx` (`lib/system-settings.ts:45-50, 119`) |

---

## 2. RPC & hàm DB

### 2.1 RPC mà `/reports` gọi (5)

| RPC | Gọi từ | Đọc `finance_period_ledger`? | Định nghĩa mới nhất |
|---|---|:-:|---|
| `finance_reports_snapshot(date,date)` | `app/actions/finance-reports-queries.ts:176-182` | ✅ `20260826120000:219` | `20260826120000_cashflow_m2_ba_so.sql:209-311` |
| `finance_cashflow_timeline(date,date)` | `app/actions/finance-cashflow-timeline.ts:29-32` | ❌ **tự query lại 3 bảng** `20260826120000:318-338` | `20260826120000:314-345` |
| `finance_debt_stats()` | `finance-operations-queries.ts:580-582` | ❌ (đo hiện tại, không theo kỳ) | `20260826180000_tien_ekip_va_can_thu.sql` |
| `finance_pending_collections(int)` | `finance-dashboard-queries.ts:432` (qua `getPendingCollections` `:594-599`) | ❌ | `20260826180000:371-…` |
| `finance_contract_profit_report(text,date,date,int,int)` | `finance-dashboard-queries.ts:608-614` | ❌ (cơ sở **cam kết**, gọi `contract_financials`) | `20260421113000_finance_dashboard_production_hardening.sql:109` |
| + khi **xuất Excel**: `finance_ledger_range(...)` / `finance_ledger(...)` | `finance-dashboard-queries.ts:664-686` | ❌ (danh sách giao dịch thô) | `20260428090000:47` / `20260421113000:227` |

### 2.2 `finance_reports_snapshot` — chi tiết công thức

`SECURITY DEFINER · STABLE · SET search_path=public` (`20260826120000:211-212`).

- Toàn bộ **tiền và chi phí** lấy từ 1 lần gọi ledger: `l AS (… LATERAL public.finance_period_ledger(p.start_date, p.end_date) lg)` (`:219`).
- `directCost = cost_task + cost_print + cost_direct + cost_cogs_contract + cost_cogs_retail` (`:262`), `operatingCost = cost_overhead` (`:263`), `salaryCost = cost_salary_base` (`:265`), `fixedCost = cost_fixed` (`:266`).
- **`totalRevenue` là hỗn hợp**: `contract_revenue` (tự đếm từ CTE `contracts_scope`, `:220-232`) + `l.revenue_retail` (từ ledger) — `:258`.
- Luật ngày HĐ trong snapshot: `COALESCE(vn_date(work_date), contract_date)` và **loại `da_huy`** (`:224-225`).
- `cashflowSummary.totalOutflow = l.cash_out`, và `netAfterOverhead == operatingNet` (cùng biểu thức `cash_inflow − operating_outflow`, `:302-303`) — hai chỉ số khác tên nhưng **luôn bằng nhau**.
- Trả thêm `signedRevenue`, `signedContracts`, `contractsMissingWorkDate` (`:290-292`) mà `types/reports.ts:37-55` **không khai báo** và `normalizeReportsSnapshotPayload` **không đọc** (`finance-reports-queries.ts:125-143`) → dữ liệu bị bỏ ở tầng app.

### 2.3 Grant/Revoke — mọi RPC báo cáo đều chặn `anon`/`authenticated`

`REVOKE ALL … FROM PUBLIC, anon, authenticated` + `GRANT EXECUTE … TO service_role`:
- `finance_reports_snapshot`, `finance_ledger_range`, `finance_debt_stats`, `finance_contract_profit_report`, `finance_ledger` — `20260428150000_reports_rpc_security_hardening.sql:4-14`
- `finance_pending_collections`, `finance_month_summary`, `get_receivable_aging`, `payable_*` — `20260826180000:412-429`
- `finance_cashflow_timeline` chỉ có `GRANT … TO service_role` (`20260826120000:483`) — không có REVOKE tường minh trong migration, nhưng **đo trên prod 11/09/2026 (#23): ACL thực tế `{postgres=X, service_role=X}`** ⇒ `anon`/`authenticated` không gọi được. `20260911160000` đã viết REVOKE tường minh cho cả 4 hàm tiền.

Cổng canh: `scripts/verify-reports.mjs:238-241` gọi lại **toàn bộ** danh sách RPC bằng anon client và bắt buộc bị từ chối (`assertAnonDenied` `:69-79`).

### 2.4 Hàm DB của Cài đặt / Admin / Nhật ký

**Không có RPC nào.** Cả 3 khu này chỉ dùng PostgREST qua `createAdminClient()`:
- Cài đặt: `settings-queries.ts:33-39, 49-62, 80-87`, `settings-mutations.ts:45-57, 209-211, 240-246`
- Nhật ký: `app/(protected)/audit-logs/page.tsx:17-24`, `app/actions/audit-log-actions.ts:17-24`
- Admin: `vendor-actions.ts:133-138`, `gallery-dimensions-actions.ts:24-27`

Trigger DB liên quan: `emit_realtime_signal` (AFTER INSERT/UPDATE/DELETE, FOR EACH **STATEMENT**) gắn trên `studio_info` — `20260610130000_realtime_signals.sql:62-79`. `system_settings` và `notification_preferences` cũng có trigger này theo vault (`luoc-do-he-thong.md:78, 156`) nhưng **không nằm trong mảng 8 bảng của migration** (`:63-71`) → xem §8.

---

## 3. Server action & route

### 3.1 Báo cáo

| Route/file | Guard | Việc |
|---|---|---|
| `app/(protected)/reports/layout.tsx:14` | `canAccess(shellRole,"reports")` → `<AccessDenied>`; `:13` chưa auth → `/login` | Chặn tầng route. `reports` = **admin + manager** (`types/roles.ts:7-47`, xem `06-nen-tang.md:130-146`) |
| `app/(protected)/reports/page.tsx:6-22` | — | `force-dynamic`, **không query DB**; chỉ tính kỳ mặc định (tháng hiện tại theo `getTodayInTimeZone()`) rồi render `<ReportsClient>` (comment `:15-17`) |
| `app/(protected)/reports/loading.tsx` | — | Skeleton |
| `getReportsSnapshot(filters)` — `finance-reports-queries.ts:171-192` | `withFinanceRead` (= `withAuth` + `requireFinanceAccess`, `auth_utils.ts:591-598`) | zod `reportFiltersSchema` (`:173`) → `getReportRange` (`:174`) → RPC (`:176`) |
| `getCashflowTimeline(start,end)` — `finance-cashflow-timeline.ts:25-44` | `withFinanceRead` | chặn khoảng > **366 ngày** (`:19-22`) |
| `fetchDebtStats()` — `finance-operations-queries.ts:578` | `withFinanceRead` | có fallback đọc bảng `debts` khi thiếu RPC (`:591-594`) |
| `getPendingCollections(limit)` — `finance-dashboard-queries.ts:594` | `withAuth` + `requireFinanceAccess` | |
| `getContractProfitReport(filters)` — `:601` | `withAuth` + `requireFinanceAccess` | |
| `fetchLedger(params)` — `:649` | `withAuth` + `requireFinanceAccess` | |

**Không có API route nào cho `/reports`.** Không có realtime (không file nào trong `components/reports/` import `use-realtime-signal`).

### 3.2 Cài đặt

| Route/file | Guard | Ghi chú |
|---|---|---|
| `app/(protected)/settings/layout.tsx:1-8` | **KHÔNG có guard** — pass-through, comment ghi "V1 proven pattern" | Guard nằm ở từng page |
| `app/(protected)/settings/page.tsx:8-27` → `getSettingsPageData()` `settings-queries.ts:181-209` | chỉ đòi **đã đăng nhập + có hồ sơ employee** (`:186-192`) | Mọi vai đều vào được `/settings`; các khối admin ẩn theo cờ `canManageSettings`/`canManageMembers` (`components/settings/settings-view.tsx:107, 157`) |
| `app/(protected)/settings/studio/page.tsx:22` | `context.canManageSettings` else `redirect("/settings")` | Chạy song song context + data rồi mới kiểm (`:18-22`) |
| `app/(protected)/settings/credit-cards/page.tsx:28-29` | `!context → /login`; `!canManageSettings → /settings` | Cùng mẫu |
| `app/(protected)/settings/error.tsx` | — | Error boundary |
| **`updateStudioInfo`** `settings-mutations.ts:35-85` | `withAdmin` | Optimistic lock qua `expected_updated_at` (`:53-55`, lỗi → "Dữ liệu đã bị thay đổi bởi người khác"); **có audit** (`:71-79`) |
| **`uploadStudioLogo`** `:87-134` | `withAdmin` | ≤ 2 MB, jpg/png/webp (`:95-101`), bucket `studio-assets`, path `{studioId}/logo.ext`; **có audit** (`:123-130`) |
| **`updateMoodieAiSettings`** `:136-234` | `withAdmin` | Verify model qua Gemini API nếu không thuộc danh sách curated (`:158-178`); ghi `system_settings` upsert `onConflict:"key"` (`:209-211`); audit chỉ ghi **4 số cuối** API key (`:196`, `maskLastFour` `:21-23`) |
| **`disconnectGoogleOAuth`** `:236-265` | `withAdmin` | Set `google_oauth = null`; audit ghi bản redact (`:255`); `revalidateTag("studio-info")` (`:262`) |
| `getStudioInfoAdmin()` `settings-queries.ts:127-129` | `withAdmin` | |
| `getMoodieGeminiModelOptions()` `:131-169` | `withAdmin` | Gọi Gemini API để liệt kê model; fallback danh sách tĩnh |
| `getStudioInfo()` `:171-179` | **`withAuth`** (mọi user) | Trả `google_oauth: null`. ⚠️ Gọi `getOrCreateStudioInfo` → **có thể INSERT** dòng studio mặc định (`lib/studio-info.ts:37-41`) |
| `updateNotificationPreferences` `notification-actions.ts` | `withAuth` (chính mình) | |
| `getAuthUsers / updateUserRole / linkUserToEmployee / unlinkUserFromEmployee / getUnlinkedEmployees` `user-management.ts:51,112,152,218,267` | `withAdmin` | 3 hàm ghi đều có `writeAuditLog` (`:138, 203, 251`) |
| `saveMoodieProviderConfig / saveMoodieVoiceLiveConfig / saveMoodieBrowserConfig / saveMoodieBraveConfig / saveMoodieVoiceConfig` `moodie-provider-actions.ts:240,442,534,582,634` | `withAdmin` | đều `fireAuditLog` |
| **API `GET /api/auth/google`** `route.ts:11-81` | `getUser()` + `requireSettingsAdminAccess` (`:35`), fail → `/settings?google_error=forbidden` | Sinh `state` nonce 24 byte (`:53`), cookie `mood_google_oauth_state` httpOnly/sameSite=lax/path=`/api/auth/google`/TTL 10 phút (`:59-65`); scope `calendar` + `drive`, `access_type=offline`, `prompt=consent` (`:71-77`) |
| **API `GET /api/auth/google/callback`** `route.ts:49-199` | `validateState` (timing-safe, `:35-47`) → `getUser()` → `requireSettingsAdminAccess` (`:100`) | Đổi code lấy token (`:102-112`), merge giữ `refresh_token` cũ nếu Google không trả lại (`:138-141`), `encryptGoogleOAuth` rồi UPDATE/INSERT `studio_info` (`:148-176`); audit ghi bản redact (`:158-187`) |

### 3.3 Admin

| Route | Guard trang | Guard action | Ghi chú |
|---|---|---|---|
| `/admin/vendors` `page.tsx:1-12` | **KHÔNG có** (không có `admin/layout.tsx`) | `getAllVendors` = `withAdmin` (`vendor-actions.ts:132`) | Non-admin mở được URL nhưng `result.success=false` → render danh sách rỗng (`page.tsx:9`). Ghi: `updateVendor:149`, `deleteVendor:190`, `mergeVendors:235` đều `withAdmin`. ⚠️ Nút "thêm" gọi `quickAddVendor` = **`withAuth`** (`:73`), không phải `withAdmin` |
| `/admin/backfill-dimensions` `page.tsx:1-9` | **KHÔNG có** — `"use client"`, không server guard nào | `backfillGalleryDimensions:15`, `backfillAllDimensions:23` đều `withAdmin` | Trang chỉ hiển thị; bấm nút mà không phải admin → action trả lỗi |

Cả 2 route **không xuất hiện trong `lib/navigation.ts`** (grep `/admin/` chỉ khớp trong chính `app/(protected)/admin/`) → route ẩn, chỉ vào bằng URL trực tiếp.

### 3.4 Nhật ký

| Route/file | Guard | Việc |
|---|---|---|
| `app/(protected)/audit-logs/page.tsx:10-37` | `:13` chưa auth → `/login`; `:14` `!canManageSettings` → `/settings` | RSC đọc trang 1 (20 dòng, `:8`) bằng `createAdminClient()`, `order created_at DESC`, `count:"exact"` (`:17-24`); lỗi → `throw` (`:26-28`) |
| `app/actions/audit-log-actions.ts:9-38` | `withAdmin` (`:13`) | Phân trang server-side + lọc `log_type` (`:26-28`) |
| `components/settings/audit-log-list.tsx` | — | Bảng desktop / card mobile; **không** hiển thị `old_data`/`new_data`/`performed_by` |
| Vào từ đâu | `components/settings/settings-view.tsx:127-139` (khối chỉ hiện khi `canManageSettings`); `lib/navigation.ts:189` map `audit-logs → settings` | |

---

## 4. Luồng nghiệp vụ

### 4.1 `/reports` — 4 tab, 4 nguồn số khác nhau

```
                        ┌──────────────────────────────────────────────┐
/reports (page.tsx)     │ page.tsx KHÔNG query DB — chỉ tính kỳ mặc    │
  └─ ReportsClient      │ định (tháng hiện tại) rồi để SWR tự fetch     │
                        └──────────────────────────────────────────────┘
        │
        ├─ TAB "Tổng quan"  (luôn fetch, kể cả khi ở tab khác)
        │    getReportsSnapshot ──► RPC finance_reports_snapshot
        │                              └──► finance_period_ledger   ✅ MỘT BỘ SỔ
        │                              └──► contracts (tự đếm số HĐ / doanh thu HĐ)
        │                                     luật ngày: work_date → contract_date, loại da_huy
        │
        ├─ TAB "Dòng tiền"
        │    getCashflowTimeline ──► RPC finance_cashflow_timeline
        │                              └──► payments ∪ receipts ∪ expenses  ❌ TỰ CỘNG LẠI
        │    fetchLedger(1,5)   ──► RPC finance_ledger_range  (danh sách giao dịch)
        │
        ├─ TAB "Công nợ"   (KHÔNG lọc theo kỳ — reports-debts-view.tsx:17-19)
        │    fetchDebtStats      ──► RPC finance_debt_stats
        │    getPendingCollections ► RPC finance_pending_collections
        │
        └─ TAB "Lợi nhuận"
             ProfitReportTable  ──► getContractProfitReport
                                      └──► RPC finance_contract_profit_report
                                             └──► contract_financials  (cơ sở CAM KẾT)
```

Chi tiết SWR: `components/reports/reports-client.tsx:128-162`. Key cache: `reports:{periodKey}`, `finance-cashflow:{start}:{end}`, `reports-ledger:{start}:{end}:all`, `debt-stats`, `finance-pending-collections` (`lib/swr.ts:44-45, 51, 70, 73`). Tab dòng tiền và công nợ **chỉ fetch khi mở tab** (`:141, 147, 153, 159`).

Bộ lọc kỳ: `month | quarter | year | custom`, custom tối đa **366 ngày** (`lib/report-period.ts:117-119` và lặp lại ở `lib/validations/reports.schema.ts:75-81`). Năm chỉ nhận **2020–2035** (`report-period.ts:63`, `reports.schema.ts:23`).

### 4.2 Xuất file — CHỈ có Excel, KHÔNG có PDF

```
Nút "Xuất Excel"  (reports-page-actions.tsx:21-24)
  └─ handleExport  (reports-client.tsx:195-224)
       ├─ đảm bảo có debtStats + cashflow (fetch bù nếu tab chưa mở, :204-209)
       └─ exportReportsWorkbook  (reports-export.ts:244-296)
            ├─ getContractProfitReport ×N trang  (200 dòng/trang, trần 5 000 dòng → ném lỗi, :26-27, 41-43)
            ├─ fetchLedger            ×N trang  (cùng trần)
            ├─ getPendingCollections(200)       (lỗi thì rơi về pendingFallback, :276)
            ├─ 5 sheet: Tổng quan · Dòng tiền · Công nợ · Lợi nhuận · Sổ cái  (:279-285)
            └─ downloadExcelXml  (lib/excel-xml.ts:62-77)
                 └─ SpreadsheetML 2003 XML → Blob("application/vnd.ms-excel") → <a download>  → file .xls
```

- **Chạy hoàn toàn ở client** (`reports-export.ts:1` `"use client"`), không có API route xuất file, không có bucket.
- Định dạng là **XML SpreadsheetML 2003** đặt đuôi `.xls` (`lib/excel-xml.ts:46-59`), không phải xlsx thật.
- Tên file: `bao-cao-{slug nhãn kỳ}.xls` (`reports-export.ts:287-291`).
- **Không có audit log** cho hành động xuất, dù `AuditAction` có sẵn giá trị `"EXPORT"` (`lib/audit.ts:31`) — 0 call site dùng nó.
- `html2pdf.js` **không được dùng ở `/reports`** — call site duy nhất là `components/contracts/print/print-contract-client.tsx:94,118`.

### 4.3 Token Google OAuth — lưu ở đâu, refresh ra sao, ai dùng

```
[Admin] bấm "Kết nối"  (google-calendar-card.tsx:77 → href="/api/auth/google")
   │
   ├─ GET /api/auth/google           guard: getUser + requireSettingsAdminAccess (:35)
   │     └─ set cookie mood_google_oauth_state (nonce 24B, httpOnly, 10')  (:52-65)
   │     └─ redirect accounts.google.com  scope = calendar + drive, access_type=offline (:71-77)
   │
   └─ GET /api/auth/google/callback  guard: validateState timing-safe (:35-47) + requireSettingsAdminAccess (:100)
         └─ POST oauth2.googleapis.com/token                       (:102-112)
         └─ merge với token cũ, GIỮ refresh_token nếu Google không trả (:138-141)
         └─ encryptGoogleOAuth  →  AES-256-GCM cho access_token / refresh_token / id_token
         │      (settings-secrets.ts:10 SECRET_FIELDS, :83-96)
         └─ UPDATE studio_info.google_oauth = {enc:v1:...}          (:151-154)
         └─ writeAuditLog(oldData/newData = redactGoogleOAuth)      (:158-170)

                       studio_info.google_oauth  (jsonb, 1 dòng)
                                  │
        ┌─────────────────────────┴──────────────────────────┐
        │                                                     │
  getValidGoogleToken(supabase, studioInfo)            sanitizeStudioInfoForClient
  lib/google-auth.ts:33-76                             lib/settings-studio-admin.ts:14-37
   ├─ decryptGoogleOAuth                                 → access_token:"", refresh_token:""
   ├─ hết hạn trong < 5' ? (now - updated_at > expires_in-300s, :52)   (client CHỈ thấy expires_in,
   │    └─ refreshAccessToken (:57-61)                     granted_scopes, updated_at)
   │    └─ UPDATE studio_info.google_oauth (:69-72)  ⚠️ KHÔNG audit
   └─ trả authData đã giải mã
        │
        ├─ lib/googleCalendarService.ts:89, 158, 200, 239   → đồng bộ Calendar
        └─ app/actions/gallery-drive-actions.ts:266, 413    → Drive (kiểm hasGoogleScope drive, :267)
```

**Một token dùng chung cho cả studio** — không phải per-user. `refresh_token` không có TTL trong record, nên nếu Google thu hồi thì `getValidGoogleToken` ném `"Failed to refresh google token"` (`google-auth.ts:26`) và **cả Calendar lẫn Drive gallery cùng chết**.
Ngắt kết nối: `disconnectGoogleOAuth` (`settings-mutations.ts:236-265`) — set `null`, có audit.

### 4.4 `audit_logs` — ai ghi, ghi gì

```
Server Action (161 call site)                        DB trigger
   │                                                    │
   ├─ fireAuditLog(params)   lib/audit.ts:86-90         └─ KHÔNG CÓ
   │     └─ writeAuditLog(...).catch(console.error)        (grep "audit" + "trigger" trong
   │        → fire-and-forget, LỖI GHI = NUỐT LUÔN          supabase/migrations/*.sql = rỗng)
   │                                                        ⇒ enum source='trigger' chưa ai dùng
   ├─ writeAuditLog(params)  lib/audit.ts:52-83
   │     ├─ ❌ CỐ Ý KHÔNG đọc cookies()/getUser() (comment :54-59)
   │     │    → actor PHẢI do caller truyền vào (performedBy / employeeId)
   │     ├─ createAdminClient()  (bypass RLS)
   │     └─ INSERT audit_logs {performed_by, employee_id, action, table_name, record_id,
   │                            old_data, new_data, description, log_type, severity, source}
   │        ip_address / user_agent: KHÔNG BAO GIỜ được set
   │     └─ try/catch nuốt lỗi → console.error (:79-82)
   │
   ├─ logConflict(...)  :93-135   → action=DETECT, log_type=CONFLICT, severity=WARNING
   ├─ logError(...)     :138-164  → action=FAIL,   log_type=ERROR,   stack cắt 5 dòng
   │
   └─ moodie-benchmark-actions.ts:76-91  → INSERT THẲNG vào audit_logs (không qua lib/audit),
        table_name='moodie_benchmarks', new_data = cả báo cáo benchmark;
        đọc lại làm dashboard ở :166-175  ⇒ audit_logs bị dùng như BẢNG LƯU TRỮ DỮ LIỆU
```

**Chỗ mù #1 — mất "ai làm":** trong 161 call site (ngoài `lib/audit.ts`), chỉ **7** truyền `performedBy` (`finance-close-actions.ts:325,355,386`; `lead-actions.ts:227,320,359`; `moodie-action-actions.ts:133`). Phần còn lại để `performed_by = NULL` và `employee_id = NULL` → UI hiển thị **"Hệ thống"** (`audit-log-list.tsx:73`). Cụ thể `settings-mutations.ts` (5 lần ghi), `user-management.ts:138,203,251` (đổi vai trò user!), `debt-actions.ts` (credit cards) đều **không** ghi actor.

**Chỗ mù #2 — module không ghi audit gì cả.** 43/85 file trong `app/actions/` không có call audit nào; sau khi trừ các file thuần query, các file **có ghi dữ liệu mà không ghi audit**:

| File | Ghi gì mà không có audit |
|---|---|
| `auth.ts` | **Đăng nhập / đăng xuất / rate-limit `login_attempts`** — dù `AuditAction` có `"LOGIN"` (`lib/audit.ts:30`), 0 call site dùng |
| `password-recovery.ts` | Đặt lại mật khẩu |
| `gallery-*.ts` (11 file: `gallery-actions`, `gallery-admin-actions`, `gallery-album-actions`, `gallery-composite-actions`, `gallery-core`, `gallery-dimensions-actions`, `gallery-drive-actions`, `gallery-image-helpers`, `gallery-public-actions`, `gallery-reaction-actions`, `gallery-selection-actions`) | Toàn bộ nghiệp vụ gallery: tạo/xoá album, chọn ảnh, share link, đồng bộ Drive |
| `calendar-mutations.ts`, `calendar-task-actions.ts` | Tạo/sửa/xoá lịch + task từ lịch |
| `checklist-actions.ts` | Sinh & tick checklist hợp đồng |
| `note-actions.ts` | Ghi chú hợp đồng |
| `addon-actions.ts` | Phát sinh (addon) hợp đồng |
| `integrity-actions.ts` | Chạy quét toàn vẹn |
| `blurhash-actions.ts` | Cập nhật ảnh |

**Chỗ mù #3 — bộ lọc trên UI không khớp enum.** `LOG_TYPE_OPTIONS = all · AUTH · DATA · SYSTEM · ERROR` (`audit-log-list.tsx:48-54`) nhưng `log_type_enum` là `EVENT_CHANGE · ASSIGNMENT · CONFLICT · ERROR · GENERAL` (`types/database.types.ts:6811-6816`). ⇒ Chọn **AUTH / DATA / SYSTEM** thì `query.eq("log_type", …)` (`audit-log-actions.ts:27`) khớp giá trị không tồn tại → **danh sách rỗng hoặc lỗi enum**; chỉ "Tất cả" và "ERROR" chạy đúng. Mà đúng ra 90 % dòng là `GENERAL` (mặc định `lib/audit.ts:75`) — **không có cách nào lọc ra**.

**Ai xoá/sửa được audit log:**
- Trong code: **không có** `UPDATE`/`DELETE` nào trên `audit_logs` — 5 call site duy nhất là `SELECT` ×3 (`audit-logs/page.tsx:18`, `audit-log-actions.ts:18`, `moodie-benchmark-actions.ts:169`) và `INSERT` ×2 (`lib/audit.ts:66`, `moodie-benchmark-actions.ts:77`).
- Trên DB: bảng có **2 policy** (`vault/…/luoc-do-he-thong.md:16`) nhưng **nội dung policy chưa đọc được**, và **không có `REVOKE`/`GRANT` nào cho `audit_logs` trong toàn bộ `supabase/migrations/`** — migration duy nhất chạm bảng này chỉ tạo index (`20260422070000_hot_action_indexes_and_stats_rpcs.sql:218-220`). ⇒ Không kết luận được vai `authenticated` có `DELETE` hay không (§8).
- `service_role` (mọi server action) **luôn xoá/sửa được** — RLS không áp cho service role. Không có cơ chế append-only nào trong repo.

### 4.5 Cài đặt — luồng lưu

```
/settings/studio  (StudioInfoForm)
   │  Save  → executeSaveTasks (studio-save-logic.ts:88-107) chạy SONG SONG 2 nhánh
   ├─ hasStudioChanges → updateStudioInfo(payload)   withAdmin → studio_info (optimistic lock)
   └─ hasMoodieChanges → updateMoodieAiSettings(...)  withAdmin → system_settings (upsert by key)
        ⚠️ 2 nhánh KHÔNG cùng transaction: một nhánh fail thì nhánh kia đã ghi rồi
           (Promise.all :103, chỉ báo lỗi cái đầu tiên :104 → toast studio-info-form.tsx:258)

Các thẻ tích hợp (studio-integration-cards.tsx:59-88), tất cả nằm chung trang /settings/studio:
   ├─ GoogleCalendarCard   → /api/auth/google | disconnectGoogleOAuth
   ├─ MoodieAiCard         → moodie-provider-actions.* (provider · voice · brave · browser)
   └─ MoodieBenchmarkCard  → runMoodieBenchmark → INSERT audit_logs
```

### 4.6 `ALLOW_SETTINGS_JWT_ADMIN_FALLBACK` — nó là gì

```
canCurrentUserManageSettings(userId, jwtRole)     lib/auth_utils.ts:205-217
   ├─ CÓ hồ sơ employee  → active && role ∈ {admin, manager}          (:209)
   └─ KHÔNG có employee  → process.env.ALLOW_SETTINGS_JWT_ADMIN_FALLBACK === "true"
                            && canManageSettingsRole(jwtRole)          (:212-215)

getAuthenticatedUserContext  lib/auth_utils.ts:362-369  → cùng logic, đặt vào
   context.canManageSettings = context.canManageMembers = hasSettingsAdminAccess  (:388-389)
```

- `canManageSettingsRole` = role chuẩn hoá ∈ `{admin, manager}` — `types/roles.ts:81-86`. Mà `normalizeRole` (`:51-62`) **fallback mọi giá trị lạ → `"viewer"`**, nên chỉ chuỗi `admin`/`manager` trong JWT mới qua.
- Nguồn `jwtRole`: `app_metadata.role` rồi `user_metadata.role` (`auth_utils.ts:362-363`). `user_metadata` là phần **người dùng tự sửa được** qua GoTrue nếu endpoint update-user mở.
- **Bật/tắt ở đâu:** biến môi trường server-side, **không xuất hiện trong `.env.local`/`.env.example`/`vercel.json`** — grep toàn repo chỉ khớp 2 dòng code (`auth_utils.ts:213, 368`) và 2 ghi chú (`agent/SYSTEM_MAP.md:222`, `agent/system-map/06-nen-tang.md:567`). ⇒ Mặc định **tắt** (undefined ≠ "true"). Giá trị trên Vercel chưa xác minh.
- **Hệ quả nếu bật:** một auth user **không có hồ sơ `employees`** mà JWT mang `role=admin|manager` sẽ mở được `/settings/studio`, `/settings/credit-cards`, `/audit-logs`, và mọi action `withAdmin` (83 call site — `06-nen-tang.md:2.4`), gồm: đọc/ghi khoá API Moodie, kết nối/ngắt Google OAuth, đổi vai trò user khác (`user-management.ts:112`), gộp/xoá vendor. Vì `withAdmin` trả **service-role client** (`auth_utils.ts:477`), RLS không chặn thêm được gì. Đây là **đường vòng qua bảng `employees`** — lớp phân quyền thật của hệ thống.

---

## 5. Nối với 6 miền cũ

| Nối vào | Nội dung |
|---|---|
| **`01-tien.md` §5 "Chỗ TỰ CỘNG LẠI"** | Mục 2 của bảng đó (`finance_cashflow_timeline`) — **xác nhận nó thật sự chạy trên `/reports`**: tab "Dòng tiền" (`reports-client.tsx:140-144`) và sheet "Dòng tiền" trong file Excel (`reports-export.ts:281`). Mục 3 (`calculateFallbackSnapshot`) — xác nhận **chỉ chạy khi RPC thiếu VÀ `NODE_ENV !== "production"`** (`finance-reports-queries.ts:187-190`) ⇒ không ảnh hưởng prod. |
| **`01-tien.md` §5 bảng "Nguồn chân lý"** | Dòng "Báo cáo `/reports` + Moodie" → bổ sung: `/reports` **không chỉ** dùng `finance_reports_snapshot`; nó ghép 5 RPC từ 4 cơ sở tính khác nhau (§4.1). |
| **`01-tien.md` §6 bất biến** | Thêm bất biến #16–#17 ở §6 dưới (khoá anon cho RPC báo cáo; timeline == snapshot). |
| **`06-nen-tang.md` §2.4 guard** | `withAdmin` (83 call site) — miền này là nơi dùng nhiều nhất: `settings-mutations` (4), `moodie-provider-actions` (10), `user-management` (5), `audit-log-actions` (1), `vendor-actions` (4), `gallery-dimensions-actions` (2), `debt-actions` credit cards (3). |
| **`06-nen-tang.md` §2.4 bảng "Guard tầng route"** | Xác nhận `settings` = pass-through (`settings/layout.tsx:1-8`) và `admin/*` = không layout. Bổ sung: **`/admin/backfill-dimensions` là `"use client"`, không có bất kỳ kiểm tra server nào** — nặng hơn `/admin/vendors` (vẫn là RSC gọi action `withAdmin`). |
| **`06-nen-tang.md` §8.3 "chưa xác minh"** | ✅ **GỠ ĐƯỢC**: câu lệnh `REVOKE` cho `services`, `service_categories`, `studio_info` (và `service_bundles`, `service_relations`, `price_rules`) **có tồn tại** — `20260428183000_services_security_atomic_writes.sql:7-20`, vòng lặp `format()` chạy `ENABLE + FORCE RLS`, `REVOKE ALL … FROM PUBLIC, anon, authenticated`, `GRANT ALL TO service_role`. |
| **`06-nen-tang.md` §8.6 `ALLOW_SETTINGS_JWT_ADMIN_FALLBACK`** | Bổ sung hệ quả bảo mật đầy đủ ở §4.6. Vẫn chưa xác minh giá trị prod. |
| **`06-nen-tang.md` §3 realtime** | `/settings` là một trong ít trang có realtime: `useRealtimeSignal("employees")` + `("notification_preferences")` (`settings-view.tsx:66-75`); `/settings/studio` cũng có (`studio-info-form.tsx:20`). `/reports` và `/audit-logs` **không có realtime**. |
| **`05-gallery-moodie.md`** | Model AI của Moodie đọc từ `system_settings` — xác minh ở §1.3 + §6 bất biến #21. Trang cấu hình duy nhất là `/settings/studio`, không phải `/moodie`. `/admin/backfill-dimensions` gọi `backfillGalleryDimensionsInternal` (`lib/gallery/image-dimensions.ts`). |
| **`03-in-kho-vay.md`** | `/admin/vendors` là màn quản trị của bảng `vendors`, lọc `vendor_type='tho_ngoai'` (`vendor-actions.ts:136`, comment dẫn ADR-016). |
| **`02-hop-dong.md`** | `checklist_templates` là bảng cấu hình sinh `contract_checklists` (`checklist-actions.ts:73-97`) — không có UI quản trị. |
| **`04-crm-nhan-su.md`** | `getSettingsPageData` gọi `supabase.auth.admin.listUsers` + ghép `employees` theo `auth_user_id` / email (`settings-queries.ts:75-125`) → khối "Thành viên" trên `/settings` là mặt tiền của `user-management.ts`. |

---

## 6. Bất biến (kèm SQL kiểm — **KHÔNG chạy ở đây**)

| # | Phát biểu | Căn cứ | SQL kiểm |
|---|---|---|---|
| 16 | Mọi RPC báo cáo **không gọi được** bằng vai `anon`/`authenticated` | `20260428150000:4-8`; `20260826180000:412-420`; cổng canh `scripts/verify-reports.mjs:238-241` | `SELECT p.proname, r.rolname, has_function_privilege(r.rolname, p.oid, 'EXECUTE') FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace, (VALUES ('anon'),('authenticated')) r(rolname) WHERE n.nspname='public' AND p.proname IN ('finance_reports_snapshot','finance_ledger','finance_ledger_range','finance_debt_stats','finance_contract_profit_report','finance_pending_collections','finance_cashflow_timeline');` (mong đợi mọi dòng `false`) |
| 17 | Σ `finance_cashflow_timeline` == `finance_reports_snapshot.cashflowSummary` | assert `scripts/verify-reports.mjs:164-166` | `SELECT (SELECT SUM(inflow) FROM finance_cashflow_timeline('2026-04-01','2026-04-30')) AS tl_in, (finance_reports_snapshot('2026-04-01','2026-04-30')->'cashflowSummary'->>'totalInflow')::numeric AS snap_in;` (2 cột phải bằng nhau) |
| 18 | `system_settings` **không có policy nào** và **chỉ `service_role`** có quyền | `20260429142000:6, 8-11`; `vault/…/luoc-do-he-thong.md:17` ghi "0 policy" | `SELECT count(*) FROM pg_policies WHERE schemaname='public' AND tablename='system_settings';` (mong đợi 0) và `SELECT grantee, privilege_type FROM information_schema.role_table_grants WHERE table_name='system_settings';` (chỉ `service_role`) |
| 19 | `studio_info` **không đọc được** bằng `anon`/`authenticated` | `20260428183000:13,17-19` | `SELECT has_table_privilege('authenticated','public.studio_info','SELECT'), has_table_privilege('anon','public.studio_info','SELECT');` (mong đợi `false,false`) |
| 20 | Token Google **không bao giờ rời server ở dạng đọc được** | `lib/settings-studio-admin.ts:21-24` ép `access_token:""`/`refresh_token:""`; `settings-queries.ts:176` ép `google_oauth:null`; lưu là `enc:v1:` (`settings-secrets.ts:9,52`) | `SELECT id, (google_oauth->>'access_token') LIKE 'enc:v1:%' AS enc_access, (google_oauth->>'refresh_token') LIKE 'enc:v1:%' AS enc_refresh FROM studio_info WHERE google_oauth IS NOT NULL;` (mong đợi `true,true`) |
| 21 | Model AI của Moodie **đến từ `system_settings`**, env chỉ là fallback | `registry.ts:75-110` (`moodie_provider_model`), fallback legacy `lib/system-settings.ts:90-98`; env chỉ vào ở `:92-94, 128-133` | `SELECT key, CASE WHEN value LIKE 'enc:v1:%' THEN '<encrypted>' ELSE value END FROM system_settings WHERE key IN ('moodie_provider_id','moodie_provider_model','moodie_gemini_model','gemini_model') ORDER BY key;` |
| 22 | Bí mật trong `system_settings` được mã hoá, **trừ** các khoá không phải secret | `encryptSecret` gọi ở `settings-mutations.ts:192`, `moodie-provider-actions.ts:550,603-604` | `SELECT key, value LIKE 'enc:v1:%' AS encrypted FROM system_settings WHERE key LIKE '%api_key%' OR key LIKE '%token%';` (mong đợi `true` hết) |
| 23 | `studio_info` **luôn có đúng 1 dòng** (mọi code đều `.limit(1).maybeSingle()`) | `lib/studio-info.ts:23-27`; `api/auth/google/callback/route.ts:126-130` | `SELECT count(*) FROM studio_info;` (mong đợi 1) |
| 24 | `audit_logs` **không có dòng nào `source='trigger'`** (0 trigger DB ghi audit trong migration) | grep `audit`+`trigger` trong `supabase/migrations/*.sql` = rỗng | `SELECT source, count(*) FROM audit_logs GROUP BY source;` (mong đợi không có `trigger`) |
| 25 | `audit_logs.log_type` **không bao giờ nhận** `AUTH`/`DATA`/`SYSTEM` (bộ lọc UI vô hiệu) | `lib/audit.ts:15-20` chỉ sinh 5 giá trị; enum DB `types/database.types.ts:6811-6816` | `SELECT log_type, count(*) FROM audit_logs GROUP BY log_type ORDER BY 2 DESC;` |
| 26 | Đa số dòng audit **không có actor** | 7/161 call site truyền `performedBy` (§4.4) | `SELECT count(*) FILTER (WHERE performed_by IS NULL AND employee_id IS NULL) AS khong_actor, count(*) AS tong FROM audit_logs;` |
| 27 | `ip_address` và `user_agent` **luôn NULL** | `writeAuditLog` không set 2 cột (`lib/audit.ts:66-78`); 0 call site khác | `SELECT count(*) FROM audit_logs WHERE ip_address IS NOT NULL OR user_agent IS NOT NULL;` (mong đợi 0) |
| 28 | `checklist_templates` **chỉ đổi bằng migration** | 1 call site duy nhất và là `SELECT` (`checklist-actions.ts:73-78`) | `SELECT count(*), max(updated_at) FROM checklist_templates;` (so với ngày áp `20260506093000`) |
| 29 | Không hành động nào ngoài `withAdmin` ghi được `system_settings`/`studio_info` | mọi `.from("system_settings")` ghi đều trong `withAdmin` (§1.3); `studio_info` ghi ở 4 nơi, đều `withAdmin`/`requireSettingsAdminAccess`, + 1 ngoại lệ `google-auth.ts:69-72` (chạy sau khi đã qua guard của caller) | (kiểm bằng code, không bằng SQL) |

---

## 7. Mâu thuẫn tài liệu (CODE THẮNG)

| # | Tài liệu nói | Code nói | Kết luận |
|---|---|---|---|
| 1 | `vault/40-module/he-thong.md:30`: "`/reports` — … xuất Excel qua `lib/excel-xml.ts`, **PDF qua `html2pdf.js`**" | `/reports` chỉ có **1 nút xuất**, ra `.xls` (`reports-page-actions.tsx:21-24` → `reports-export.ts:288`). `html2pdf.js` có đúng **1 call site trong toàn repo**: `components/contracts/print/print-contract-client.tsx:94,118` | **Vault sai.** `/reports` không xuất PDF. |
| 2 | `vault/40-module/he-thong.md:47`: `audit_logs` **10 798 dòng** | `vault/30-du-lieu/luoc-do-he-thong.md:16,30` (cùng vault, **sinh từ DB thật**, cùng ngày `cap-nhat: 2026-08-07`) ghi **14 226 dòng** | **Hai trang vault mâu thuẫn nhau.** Tin trang sinh tự động (14 226). Không kiểm được (§8). |
| 3 | `vault/40-module/he-thong.md:35`: "`/settings`, `/settings/studio`, `/settings/credit-cards` — **cần `canManageSettings`**" | `/settings` **không** cần: chỉ đòi đăng nhập + có hồ sơ employee (`settings-queries.ts:186-192`); mọi vai vào được, chỉ ẩn khối admin (`settings-view.tsx:107,157`). Hai trang con thì đúng (`studio/page.tsx:22`, `credit-cards/page.tsx:29`) | **Vault sai cho `/settings`.** |
| 4 | Comment migration `20260709120000_moodie_provider_settings.sql:6`: "`system_settings` **đã có RLS policy cho admin/manager**" | Policy `"Managers manage system_settings"` **đã bị DROP** ở `20260429142000_settings_security_hardening.sql:6` (2,5 tháng trước migration này), thay bằng `REVOKE ALL FROM authenticated` + `GRANT … TO service_role` (`:8-11`). Vault xác nhận "0 policy" (`luoc-do-he-thong.md:17`) | **Comment migration cũ/sai.** Không ảnh hưởng vận hành (code luôn dùng admin client), nhưng gây hiểu nhầm là client-direct đọc được. |
| 5 | `scripts/smoke-settings.mjs:451,454,647-648,657,675-678` dùng cột **`google_calendar_auth`** | Cột đã đổi tên thành `google_oauth` ở `20260520090000_rename_google_oauth.sql:5-6` (3 tháng trước) | **Script chết.** `npm run smoke:settings` sẽ lỗi cột không tồn tại ngay ở bước snapshot `studio_info`. Cổng canh cho `/settings/studio` + OAuth **đang không chạy được**. |
| 6 | `components/finance/…` / UI: bộ lọc nhật ký `AUTH · DATA · SYSTEM · ERROR` (`audit-log-list.tsx:48-54`) | `log_type_enum` = `EVENT_CHANGE · ASSIGNMENT · CONFLICT · ERROR · GENERAL` (`types/database.types.ts:6811-6816`); `lib/audit.ts:15-20` cũng chỉ sinh 5 giá trị đó | **UI mang enum của V1.** 3/5 lựa chọn vô nghĩa; giá trị phổ biến nhất (`GENERAL`) không lọc được. |
| 7 | `lib/studio-info.ts:14` khởi tạo `bank_info: {}` | DB mặc định cột `bank_info` là **`'[]'`** (`vault/…/luoc-do-he-thong.md:99`), còn TypeScript khai báo `BankInfo` là **object** (`types/settings.ts:1-8`) | **Ba nguồn ba kiểu.** Dòng `studio_info` hiện có sinh trước migration nên có thể đang là `[]`; component đọc `bank_info.bank_name` sẽ ra `undefined`. Chưa xác minh giá trị thật. |
| 8 | `finance_reports_snapshot` trả `signedRevenue`, `signedContracts`, `contractsMissingWorkDate` (`20260826120000:290-292`) và `verify-reports.mjs:167-169` **bắt buộc** phải có `signedRevenue` | `types/reports.ts:37-55` không khai báo, `normalizeReportsSnapshotPayload` (`finance-reports-queries.ts:125-143`) không map ⇒ 3 số này **bị vứt** trước khi tới UI | **Hợp đồng RPC ↔ type lệch.** Cổng canh giữ RPC còn trả, nhưng `/reports` không dùng — "doanh số ký" mà `01-tien.md §5` chỉ tới **không hiển thị ở đâu trên `/reports`**. |
| 9 | `types/reports.ts:57-64` có cả `operatingNet` và `netAfterOverhead` | RPC set **cùng một biểu thức** cho hai key (`20260826120000:302-303`) | Hai chỉ số hiển thị luôn bằng nhau; công thức `calculateFallbackSnapshot` (dev) thì **khác nhau** (`finance-reports-queries.ts:484-485`) ⇒ dev và prod hiện số khác nhau. |

---

## 8. Chưa xác minh

1. **Nội dung 2 policy của `audit_logs`.** Vault ghi "RLS bật · 2 policy" (`luoc-do-he-thong.md:16`) nhưng **không migration nào** trong repo tạo bảng, policy, `REVOKE` hay `GRANT` cho `audit_logs` — chỉ 1 lệnh tạo index (`20260422070000:218-220`). ⇒ **Không kết luận được vai `authenticated` có `SELECT`/`DELETE`/`UPDATE` trên bảng này hay không.** Đây là câu hỏi quan trọng nhất còn treo của miền: nếu `authenticated` có `DELETE`, nhật ký kiểm toán có thể bị xoá từ browser qua nhánh client-direct.
2. **Thân thật của `finance_reports_snapshot` / `finance_debt_stats` trên prod.** `agent/SYSTEM_MAP.md:218` đã ghi nhận repo lệch DB. Tôi đọc file migration mới nhất, không đọc `pg_proc`.
3. ~~**`finance_cashflow_timeline` có bị `REVOKE` khỏi `anon`/`authenticated` không.**~~ → **ĐÃ XÁC MINH 11/09/2026 (#23):** ACL sống trên prod là `{postgres=X, service_role=X}` — cả `anon` lẫn `authenticated` đều `false`. `20260911160000` viết REVOKE tường minh cho 4 hàm tiền; `verify-reports.mjs` nay kiểm thêm `finance_cash_entries` + `finance_cashflow_timeline_legacy`.
4. **Giá trị `ALLOW_SETTINGS_JWT_ADMIN_FALLBACK` trên Vercel production.** Không có trong file env nào của repo. Nếu = `"true"` thì §4.6 là lỗ hổng thật.
5. **Có dòng `audit_logs` nào `source='trigger'` không** — nếu có thì tồn tại trigger DB ngoài lịch sử migration (giống nhận định "lịch sử migration không đầy đủ" ở `01-tien.md §8.2`).
6. **Số dòng thật của `audit_logs`** (mâu thuẫn #2 ở §7) và tỉ lệ dòng không có actor (bất biến #26). Không chạy DB.
7. **Bảng `checklist_templates`**: số dòng, có `is_active=false` nào không, `service_type` nào thiếu template. `_generateChecklistsInternal` trả `"Không có template cho X"` mà **không ném lỗi** (`checklist-actions.ts:83-85`) → HĐ loại đó lặng lẽ không có checklist.
8. **`studio_info.bank_info` đang là `{}` hay `[]`** trên prod (mâu thuẫn #7).
9. **`system_settings` 23 dòng gồm những key nào.** Đếm được **25 key** trong code (§1.3, chưa kể 2 key legacy `gemini_api_key`/`gemini_model`) ⇒ hoặc một số key chưa từng được lưu, hoặc vault trễ. Chưa đối chiếu.
10. **`/settings/studio` render `moodieVoiceLiveSettings` nhưng không truyền xuống form.** `loadStudioSettingsAdminData` gộp nó vào `moodieVoiceSettings` (`lib/settings-studio-admin.ts:64-76`) — chưa đọc `MoodieVoiceSettingsSection` để xác minh mọi trường được hiển thị.
11. **Chưa đọc chi tiết tầng UI**: `components/settings/moodie-ai-card.tsx` (881+ dòng), `moodie-voice-settings-section.tsx`, `members-section.tsx`, `edit-profile-modal.tsx`, `credit-cards-client.tsx`, `changelog-section.tsx`, `reports-cashflow-chart.tsx`, `reports-overview-panels.tsx`. Chỉ xác minh đường action → RPC/bảng.
12. **`getStudioInfo()` (`withAuth`) có thể tạo dòng `studio_info` mặc định** khi bảng rỗng (`lib/studio-info.ts:37-41`) — nghĩa là một user vai `viewer` mở trang in phiếu thu cũng kích hoạt được `INSERT`. Chưa xác minh có ảnh hưởng thật (bảng đang có 1 dòng nên nhánh này không chạy).
13. **`writeAuditLog` nuốt mọi lỗi ghi** (`lib/audit.ts:79-82`) — không đo được có bao nhiêu lần ghi audit đã thất bại lặng lẽ trên prod. Không có metric/Sentry cho nhánh này (comment `:8-11` ghi rõ "No Sentry (V2 uses console.error for now)").
14. **`quickAddVendor` là `withAuth` chứ không `withAdmin`** (`vendor-actions.ts:73`) — mọi user đăng nhập gọi được. Chưa xác minh còn call site nào ngoài `/admin/vendors` và các form thợ ngoài trong miền in ấn (nếu chỉ dùng ở `/admin/vendors` thì đây là lệch guard).
