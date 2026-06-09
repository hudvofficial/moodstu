# Kế hoạch: Tablet Design Layer — 3 breakpoint (phone / tablet / desktop)

> **Trạng thái:** Phase 0+1 DONE (deployed). Phase 2 chờ feedback. Phase 3 DỪNG.
> **Ngày:** 2026-06-06
> **Bối cảnh:** Project hiện là layout **nhị phân** `<1024px = phone` / `≥1024px = desktop` (key bằng `lg:` — 526 lần/211 file). Dải iPad 640–1023px bị coi là điện thoại → list/table hiện 1 cột hẹp, trống 2 bên.
> **Constraint cứng:** Đã RELEASE. Mỗi phase = 1 deploy reversible <2 phút. Verify chrome-devtools @768px + @1023px TRƯỚC prod. Không gộp module.

---

## 0. Quyết định nền móng (chốt 1 lần — đắt nếu đổi sau)

### 0.1 Ranh giới 3 tier (ĐỀ XUẤT)

| Tier | Width | Tailwind | Layout |
|---|---|---|---|
| **Phone** | < 768px | base / `max-md:` | 1 cột, card stack, bottom-sheet modal, bottom-nav |
| **Tablet** | 768–1023px | `md:` (bật) + `lg:` (chưa) | Bảng/2 cột density desktop, modal căn giữa, **sidebar icon thu gọn** |
| **Desktop** | ≥ 1024px | `lg:` | Full: sidebar rộng, 3 cột, dashboard đa cột |

**Vì sao 768 (md) là ranh phone↔tablet, KHÔNG phải 640 (sm):**
- iPad Mini/Air portrait = 768px → đúng ngưỡng tablet.
- Bảng 7–9 cột (hợp đồng/tài chính) cần ~768px mới đọc được; 640px vẫn chật.
- iPhone landscape (390–430 → xoay ngang 844–932) > 768 sẽ nhận layout tablet — chấp nhận được (màn ngang rộng).

**Quy ước class (SSOT — sẽ ghi vào CLAUDE.md + breakpoints.ts):**
| Mục đích | Cũ (nhị phân) | Mới (3-tier) |
|---|---|---|
| Bật layout desktop-density (bảng, 2 cột) | `hidden lg:block` / `lg:hidden` | **`hidden md:block` / `md:hidden`** |
| Chrome cần full width (sidebar rộng, 3 cột) | `lg:` | **giữ `lg:`** |
| Tablet-only tinh chỉnh | (không có) | **`md:max-lg:`** |
| Overlay/modal căn giữa | (đã đổi `sm:` 640px) | **giữ `sm:` 640px** (đã ship `652fe95`, hoạt động tốt) |

→ Hệ quả: **đa số `lg:` ở list/detail/table → `md:`**. `lg:` chỉ còn cho chrome thật sự cần ≥1024.

### 0.2 JS hook semantics (đồng bộ với CSS)

Hiện tại ([hooks/use-mobile.ts](../../hooks/use-mobile.ts)):
- `useIsMobile()` = `<1024px` ← **lever lớn nhất**, drive swap MobileX/DesktopX component trong JS.
- `useIsTablet()` = 640–1023 (gần như vestigial — chỉ app-shell dùng, mà sidebar `hidden lg:flex` nên không áp dụng).
- `useIsSmallMobile()` = `<640px`.

**Đề xuất:** thêm `useDeviceTier()` → `'phone' | 'tablet' | 'desktop'` (phone<768, tablet 768–1023, desktop≥1024). Giữ 3 hook cũ (additive, không phá nơi đang dùng). Component swap-by-JS chuyển dần sang tier mới khi migrate.

---

## 1. Chẩn đoán surfaces cần đổi (từ tablet-sweep audit `wf_98426473`)

| Nhóm | Surface | Pattern hiện tại | Target |
|---|---|---|---|
| **Tables** (Phase 1) | contracts-table, inventory-table, service-table, customers-table, printing-table, finance: debts/vendor-debts/receipts/salaries/expenses/cashflow ledger, dress standalone-rentals | `hidden lg:block` table + `lg:hidden` card stack | bảng từ `md:` (768) |
| **Detail / 2-col** (Phase 2) | contract detail-layout-sections + `.detail-grid` (layout.css), crm customer-detail, moodie 2-pane | 1 cột <1024px | 2 cột từ `md:`/~900px |
| **Chrome** (Phase 3) | sidebar (`hidden lg:flex`), header, bottom-nav | ẩn sidebar <1024 → bottom-nav | sidebar icon thu gọn ở tablet (tùy chọn) |
| **Overlays** (DONE) | 63 modal | ✅ đã đổi `sm:` 640px (`652fe95`) | — |
| **Calendar** (DONE) | grid + toolbar | ✅ đã đổi `sm:` (`652fe95`, `ea31640`) | — |

---

## 2. Phases (mỗi phase 1 commit · 1 preview · 1 prod · verify @768+@1023)

### Phase 0 — Foundation (0 visual change)
- Ghi convention vào [lib/breakpoints.ts](../../lib/breakpoints.ts) comment + CLAUDE.md.
- Thêm `useDeviceTier()` (additive).
- **Verify:** tsc 0, build OK, 0 visual diff (không component nào dùng hook mới ngay).
- **Rollback:** revert (additive nên vô hại).

### Phase 1 — Data tables → md (chip `task_e4b9c456` đã tạo)
Chia **sub-phase per module-group** (KHÔNG gộp):
- 1a. contracts-table (traffic cao nhất — làm mẫu, verify kỹ)
- 1b. inventory + services + CRM customers + printing + dress rentals
- 1c. finance tables (debts/vendor-debts/receipts/salaries/expenses/cashflow) — **CHỈ CSS breakpoint, KHÔNG đụng revalidatePath / optimistic recalc** (LESSONS §B finance)
- Mỗi sub-phase: `hidden lg:block`→`hidden md:block`, `lg:hidden`→`md:hidden`. `verify:<module>` + render @768/@1023.

### Phase 2 — Detail / 2-column layouts
- contract detail: `.detail-grid` media query + DesktopLayout/MobileLayout wrapper → engage 2 cột ở md (~768) hoặc ~900px. **Phức tạp** (2 component tree riêng → verify content parity).
- crm customer-detail, moodie 2-pane (landscape).

### Phase 3 — Chrome (tùy chọn, rủi ro cao nhất)
- Sidebar icon-collapsed ở tablet (768–1023) thay vì ẩn hẳn. Đụng app-shell shared → verify đa route.
- **Cân nhắc DỪNG** nếu Phase 1+2 đã đủ tốt (bottom-nav ở tablet vẫn dùng được).

### Phase 4 — Reconcile + audit
- Soát lại còn `lg:` nào nên là `md:`. Completeness critic pass.

---

## 3. Verify gate (mỗi phase)
- tsc 0 + dev compile OK.
- chrome-devtools render @768px VÀ @1023px (screenshot trước/sau). ⚠️ Em không login được app → **user verify trên iPad thật** hoặc cấp cách render authenticated.
- `verify:<module>` pass (module nào có script).
- Phone <768 + desktop ≥1024 KHÔNG đổi (chỉ dải 768–1023).
- Preview Vercel → user duyệt → prod.

## 4. Rollback
- Mỗi phase: `git revert <SHA> && npx vercel --prod` (~90s). CSS-only → an toàn.

## 5. Ước lượng
- Phase 0: ~30 phút. Phase 1: ~1–2 ngày (nhiều module, verify từng cái). Phase 2: ~1 ngày. Phase 3: tùy chọn.
- **Tổng:** multi-day. Incremental, không big-bang.

---

## 6. Trạng thái (updated 2026-06-09)
- [x] Phase 0 — Foundation. `useDeviceTier()` + `breakpoints.ts` (commit `2d7026b`).
- [x] Phase 0.5 — `<TierSwitch>` primitive (JS component, render 1 tier, `tablet ?? desktop` fallback).
- [x] Phase 1 — Data tables/cards + filters. **56 files, ALL modules.** TierSwitch thay CSS toggle. Verified @375/768/1024px Playwright. Deployed.
- [ ] Phase 2 — Detail/2-col. Chờ iPad user feedback thực tế trước khi invest.
- [x] Phase 3 — Chrome. **QUYẾT ĐỊNH DỪNG** — bottom-nav ở tablet hoạt động fine, risk cao, value thấp.
- [x] Modal + Calendar tablet — DONE (`652fe95`, `ea31640`, prod `51ucwhv7w`).

**Ghi chú:** Phase 1 ban đầu plan dùng CSS (`hidden md:block` / `md:hidden`), thực tế chuyển sang `<TierSwitch>` JS component vì CSS toggle gây bug sync giữa files. Kết quả tốt hơn plan: render đúng 1 tier, không DOM thừa, tablet users thấy desktop table.
