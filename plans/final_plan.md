# FINAL PLAN — Loại hợp đồng "Outsource" (Gia công hậu kỳ ngoài)

> Verified với codebase 2026-06-15. Mọi path/symbol/line dưới đây đã đối chiếu file thật.
> Plan này thay thế `implementation_plan.md` (đã vá 3 gap: `database.types.ts`, `service-colors.ts`, bỏ dòng "Group B" mơ hồ) + nhúng 4 quyết định nghiệp vụ đã chốt.

## 0. Quyết định đã chốt (lock)

| # | Câu hỏi | Chốt | Hệ quả kỹ thuật |
|---|---|---|---|
| Key | Tên enum | `'outsource'` | snake_case, **không gỡ được** sau khi add |
| Giá | Cách tính tiền (tấm/album/giờ) | dùng `quantity × unit_price` sẵn có | **0 đổi form item** — số tấm/giờ bỏ vào `quantity` |
| Q1 | Đối tác lưu ở đâu | `customers` + **tag B2B** | reuse `customers.tags` (đã có) — **0 cột mới** |
| Q2 | Track nhận source | chỉ ngày + ghi chú | dùng `work_date` (label "Ngày nhận source") + notes — **0 schema** |
| Q3 | Giao trả file | reuse Gallery | Gallery là tab contract detail sẵn — **0 code** |
| Q4 | Báo cáo doanh thu | tách riêng gia công | dùng breakdown-theo-service_type **sẵn có**; KHÔNG sửa revenue RPC ledger |

### 0.1 Hai quyết định reviewer đã chốt (claw-code KHÔNG hỏi lại user)
- **Key enum = `outsource`** (không phải `gia_cong`). Lý do: khớp các value English đã có (`studio/combo/concept/media/couple/baby`); ngắn, rõ; và **phân biệt với `gia_dinh` đang tồn tại** — `gia_cong` quá giống `gia_dinh`, dễ nhầm/typo khi grep & viết SQL. Tiếng Việt đã nằm ở label display (`"Outsource (Gia công)"`).
- **KHÔNG sửa `getCustomerStats` (RPC `get_crm_customer_stats`) trong đợt này.** Loại khách tag "Đối tác" khỏi avg LTV đòi sửa SQL function + **nhúng magic-string `'Đối tác'` vào SQL** → fragile (đổi tên tag = lệch số âm thầm, đúng class bẫy vendor-accrual). Đây là metric CRM phụ; view doanh thu chính (dashboard/finance) đã sạch nhờ tách theo `service_type`. Giá trị chính của tag (phân biệt + lọc trong customer list) đã có ngay qua `.contains("tags")`. → Deferred có chủ đích, ghi ở "Follow-up" cuối file.

## 1. Bản đồ scope (đổi gì / tự cover / zero)

**PHẢI sửa (10 file):**
1. Migration `ADD VALUE` enum (1 file SQL)
2. `types/contract.ts` — union ServiceType
3. `types/contract-constants.ts` — `SERVICE_TYPE_MAP`
4. `types/contract-form.ts` — `SERVICE_TYPE_LABELS` + `SERVICE_TYPE_GROUPS` + `workDateLabel`
5. `types/service-constants.ts` — `SERVICE_TYPES` + `SERVICE_TYPE_LABELS`
6. `lib/validations/contract.schema.ts` — `serviceTypeSchema`
7. `types/database.types.ts` — `service_type_enum` (**2 chỗ**, mandatory)
8. `app/actions/contract-event-actions.ts` — `fallbackEventTemplates`
9. `constants/service-colors.ts` — màu badge/avatar (cosmetic nhưng nên)
10. `types/crm.ts` — thêm preset tag "Đối tác"

**Tự cover (verify, không sửa):**
- Dropdown filter `/contracts` ([contracts-dropdown-filters.tsx:17](../components/contracts/contracts-dropdown-filters.tsx:17)) — derive động từ `SERVICE_TYPE_MAP`
- Dashboard pie + finance `serviceMap` ([finance-reports-queries.ts:354](../app/actions/finance-reports-queries.ts:354)) — group động theo service_type → outsource thành slice/dòng riêng
- Customer list filter theo tag ([customer-actions.ts:74](../app/actions/customer-actions.ts:74) `.contains("tags", …)`)
- `showCoupleFields`/`showWeddingDate` whitelist → field dâu rể & ngày cưới tự ẩn
- `checklist-actions._generateChecklistsInternal` — 100% DB-driven, rỗng → báo "Không có template" (an toàn)

**Zero code (chỉ thao tác data sau khi deploy):**
- Gallery (đã render mọi contract: [detail-layout-sections.tsx:188](../components/contracts/detail/detail-layout-sections.tsx:188) + :329)
- Catalog dịch vụ outsource (admin tạo trong Cài đặt → Dịch vụ)
- checklist_templates outsource (admin tạo nếu cần)

---

## 2. Các bước implement (bite-sized)

### Bước 1 — Migration enum (TÁCH RIÊNG, chỉ 1 việc)
Tạo `supabase/migrations/<timestamp>_add_outsource_service_type.sql`:
```sql
-- Chỉ ADD VALUE. KHÔNG dùng 'outsource' trong cùng transaction này (Postgres: unsafe use of new value).
ALTER TYPE service_type_enum ADD VALUE IF NOT EXISTS 'outsource';
```
→ Apply qua migration runner của dự án (mẫu: `scripts/run-migration-*.mjs`) hoặc Supabase.
**Verify:** `SELECT enum_range(NULL::service_type_enum);` có `outsource`.

> Nếu sau này muốn seed `event_templates`/`checklist_templates` tham chiếu `'outsource'` → để **migration RIÊNG chạy sau** (không chung file với ADD VALUE).

### Bước 2 — `types/contract.ts` (union — lưới an toàn compiler)
Trong `export type ServiceType`, thêm `| "outsource"` trước `| "khac";` (dòng ~32).
→ Việc này làm `SERVICE_TYPE_MAP` (Bước 3) & `SERVICE_TYPE_LABELS` (Bước 4) **báo lỗi compile** đến khi điền key → compiler ép không sót.

### Bước 3 — `types/contract-constants.ts`
Trong `SERVICE_TYPE_MAP` (dòng ~45), thêm trước `khac:`:
```typescript
outsource: { label: "Outsource (Gia công)", icon: "Scissors" },
```
(`icon` là metadata thuần — grep toàn repo `SERVICE_TYPE_MAP.icon` không render ở đâu, chỉ `.label`. An toàn.)

### Bước 4 — `types/contract-form.ts` (3 sửa)
1. `SERVICE_TYPE_LABELS` (Record, dòng ~165) — thêm:
   ```typescript
   outsource: "Outsource (Gia công)",
   ```
2. `SERVICE_TYPE_GROUPS` (**array — compiler KHÔNG ép, dễ sót**, dòng ~199): sửa group Media:
   ```typescript
   {
     groupName: "Media",
     color: "sky",
     types: ["media", "outsource", "khac"],
   },
   ```
3. `workDateLabel` (switch có `default`, dòng ~149) — thêm case:
   ```typescript
   case "outsource":
     return "Ngày nhận source";
   ```

### Bước 5 — `types/service-constants.ts` (SSOT thứ 2 — module Dịch vụ)
1. `SERVICE_TYPES` array (dòng ~1) — thêm `"outsource",` trước `"khac",`.
2. `SERVICE_TYPE_LABELS` (Record, dòng ~18) — compiler báo lỗi tới khi thêm:
   ```typescript
   outsource: "Outsource (Gia công)",
   ```
> Bỏ bước này = Bước 9 (catalog) bất khả thi: form tạo dịch vụ không có option outsource.

### Bước 6 — `lib/validations/contract.schema.ts` (SSOT thứ 3 — Zod)
`serviceTypeSchema` z.enum (dòng ~26) — thêm `"outsource",`.
> Quên = Zod chặn cứng lúc submit hợp đồng (server action reject).

### Bước 7 — `types/database.types.ts` (SSOT thứ 4 — generated, MANDATORY, 2 chỗ)
> Đây là chỗ `implementation_plan` cũ ghi "nếu/hoặc" — phải nâng thành bắt buộc. `contracts.service_type` được type bằng `Database["public"]["Enums"]["service_type_enum"]`; lệch union → lỗi `no overlap` ở các so sánh literal + lệch typed-client insert.

Cách A (khuyến nghị): regenerate types nếu dự án có script.
Cách B (sửa tay 2 chỗ):
1. Union `service_type_enum:` (dòng ~5099) — thêm `| "outsource"`.
2. Mảng `Constants … service_type_enum: [ … ]` (dòng ~5294) — thêm `"outsource",`.

### Bước 8 — `app/actions/contract-event-actions.ts` (automation)
Trong `fallbackEventTemplates(serviceType)` (dòng 74–104), thêm nhánh **trước câu `return` default cuối hàm**:
```typescript
if (serviceType === "outsource") {
  return [
    { event_type: "hau_ky", event_name: "Hậu kỳ (Gia công)", default_days_offset: 0, sort_order: 1 },
    { event_type: "giao_san_pham", event_name: "Giao sản phẩm", default_days_offset: 3, sort_order: 2 },
  ];
}
```
(Optional, đẹp hơn: thêm `outsource: "Gia công",` vào map `serviceLabel` dòng ~75 — không bắt buộc vì có default "Dự án".)

**Đã trace, KHÔNG cần sửa thêm:** `buildContractEvents` (dòng 106–203) — outsource không có on-set → `lastOnSetType=null` → 2 event hậu kỳ/giao tính deadline từ `baseDate` (= work_date "ngày nhận source"); work_date trống → deadline `null`. Đúng. ([contract-event-actions.ts:180](../app/actions/contract-event-actions.ts:180))
**Sửa đúng chỗ là `fallbackEventTemplates`, KHÔNG branch trong `_generateContractEventsInternal`** (hàm đó query `event_templates` rồi fallback — service_type lạ rơi vào default fallback đẻ ra `ngay_chup`, đúng cái cần tránh).

### Bước 9 — `constants/service-colors.ts` (cosmetic — IN scope đợt này)
Thêm vào **cả 2** map (`SERVICE_TYPE_COLORS` dòng ~13 & `SERVICE_BADGE_COLORS` dòng ~37). Là `Record<string,…>` nên không vỡ build nếu quên, nhưng quên = outsource ra màu `primary` mặc định.
```typescript
// SERVICE_TYPE_COLORS
outsource: { bg: "bg-slate-100", text: "text-slate-600" },
// SERVICE_BADGE_COLORS
outsource: { bg: "bg-slate-50",  text: "text-slate-600" },
```

### Bước 10 — `types/crm.ts` (tag B2B cho đối tác)
Thêm vào `TAG_PRESETS` (dòng ~186) 1 preset:
```typescript
{ label: "Đối tác", color: "bg-slate-100 text-slate-700 border-slate-200" },
```
→ Khi lập HĐ outsource, nhân viên gắn tag "Đối tác" cho customer (form khách hàng đã hỗ trợ tags). Customer list lọc được ngay theo tag (`.contains("tags", …)` — [customer-actions.ts:74](../app/actions/customer-actions.ts:74)). Đây là toàn bộ scope tag trong đợt này.

### Bước 11 — Data sau deploy (admin thao tác, 0 code)
- Cài đặt → Quản lý Dịch vụ → tạo category **"Gia công / Outsource"** + vài service item (`Retouch ảnh phóng sự`, `Edit highlight`, `Retouch theo tấm`) gán `service_type = outsource`.
- (Nếu cần checklist) tạo `checklist_templates` với `service_type = 'outsource'`.

---

## 3. Rủi ro & lưu ý

- **4 SSOT service-type độc lập** (`contract.ts`, `service-constants.ts`, `contract.schema.ts`, `database.types.ts`). Record maps được compiler ép; **array `SERVICE_TYPE_GROUPS` + `database.types.ts` thì KHÔNG** → 2 chỗ dễ sót nhất, check kỹ.
- **Enum Postgres add rồi không gỡ được** → key đã chốt `'outsource'` (xem §0.1), không đổi nữa.
- **Finance:** KHÔNG sửa `dashboard_revenue_chart` / RPC ledger để "tách gia công" — tách đã đạt qua breakdown-theo-service_type sẵn có (pie + finance serviceMap). Thọc RPC recalc = đúng vùng bài học vendor-accrual (CASE enum, lỗi bị nuốt). Nếu owner sau này cần tách P&L sâu → task riêng, verify đa module.
- **GIỮ `revalidatePath`** theo ràng buộc dự án — plan này không đụng tới optimistic/recalc nên không ảnh hưởng.

---

## 4. Verify gate (test trước merge — CLAUDE.md §5)

1. **Build/type:** `npm run build` (dự án dùng **npm**, không pnpm) — TypeScript bắt mọi Record thiếu key (Bước 3,4,5,7).
2. **Form tạo HĐ** @768px + @1023px: dropdown "Loại dịch vụ" có **Outsource (Gia công)** trong nhóm Media; chọn nó → label ngày đổi thành **"Ngày nhận source"**; field Dâu/Rể + Ngày cưới **tự ẩn**.
3. **Tạo 1 HĐ outsource** → contract_events chỉ có **Hậu kỳ + Giao sản phẩm** (KHÔNG có Ngày chụp); deadline tính từ ngày nhận source.
4. **Contract detail** → có block **Gallery** (Drive) như HĐ thường.
5. **Tag:** gắn tag "Đối tác" cho customer → customer list lọc tag ra đúng.
6. **Báo cáo:** Dashboard pie + finance report hiện **Outsource** là slice/dòng doanh thu riêng, label đúng.
7. **Deploy:** `git push origin main` (Vercel auto-deploy). KHÔNG `npx vercel --prod`.

---

## 5. Thứ tự thực thi đề xuất
Bước 1 (migration) → 2→7 (types/schema, build pass) → 8 (automation) → 9,10 (cosmetic+tag) → deploy → 11 (data) → verify gate.

## 6. Follow-up (NGOÀI scope đợt này — đừng làm kèm)
- **Loại khách tag "Đối tác" khỏi CRM stats:** sửa RPC `get_crm_customer_stats` để `total`/`avgLifetimeValue` không tính khách B2B (gọi tại [customer-actions.ts:277](../app/actions/customer-actions.ts:277)). Cố ý hoãn: phải nhúng magic-string tag vào SQL (fragile) + là metric phụ. Chỉ làm khi owner thấy avg LTV khách lẻ bị lệch rõ. Cân nhắc giải pháp bền hơn (cờ phân loại thay vì so khớp chuỗi tag) nếu làm thật.
- **Tách P&L gia công sâu** ở revenue chart chính (RPC `dashboard_revenue_chart`): KHÔNG làm trong đợt này — vùng nhạy cảm (bài học vendor-accrual). Breakdown-theo-service_type sẵn có đã đủ cho nhu cầu "tách riêng" hiện tại.
