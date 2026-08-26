# T-20260826-drawer-typography-ssot — Hai drawer hợp đồng về đúng luật typography (`docs/design-specs.md`): sentence case, token SSOT, không `uppercase`/`tracking`/`font-black`/`text-tiny`; số tiền thẻ THANH TOÁN không gãy dòng

**Owner:** claude (fallback) · **Trạng thái:** **review — code + verify local xong 26/08, chờ user xem artifact rồi merge** · **Branch:** `claude/drawer-typography-ssot` · **Module:** hop-dong (drawer vận hành) + tai-chinh (drawer lợi nhuận) · **Không đụng DB.**

**Bối cảnh (user 26/08: "bạn đã không tuân thủ rule đồng bộ font? vì sao?").** Khi làm `T-20260826-profit-drawer-align` mình sao chép nguyên class của drawer vận hành (`drawer-tab-content.tsx`) để hai drawer giống nhau. Nhưng chính drawer vận hành đang **vi phạm** `docs/design-specs.md` §Typography và `docs/css-classes.md`:

| Luật (design-specs / css-classes) | Đang dùng ở 2 drawer (đo 26/08) |
|---|---|
| Thang chữ Inter 7 cấp: display/h1/h2/h3/body/body-sm/caption/label (+ `.text-amount`); nhỏ nhất **caption 12px** | `text-tiny` (10px) — vận hành 6+4+2+3+6 chỗ, lợi nhuận 14 chỗ |
| Weight 400/500/600/700 | `font-black` (900) — vận hành 5, lợi nhuận 6 |
| **KHÔNG BAO GIỜ `text-transform: uppercase`** (trừ logo/mã HĐ); Badge/Label/Heading sentence case | `uppercase` — vận hành 8+2+1+2, lợi nhuận 11 (caption "THANH TOÁN", nhãn "TỔNG/ĐÃ THU", "DỊCH VỤ/NGÀY LÀM", "LỊCH SỰ KIỆN", "GHI CHÚ"…) |
| KHÔNG `letter-spacing ≥ 0.03em` cho label | `tracking-wide` — vận hành 3+2+1+2, lợi nhuận 2 |
| `text-lg font-bold` → `.text-h3` | avatar chữ cái `text-lg font-black` (cả 2) |

Kết luận: hai drawer **đồng bộ với nhau** nhưng **cùng lệch SSOT**. Task này kéo cả hai về đúng luật (drawer vận hành sẽ đổi kiểu nhãn — sentence case, không in hoa — user cần biết trước), đồng thời xử lý nốt số tiền gãy dòng ở thẻ THANH TOÁN (đề xuất 2 hôm 26/08).

**Locks:**
- `components/contracts/drawer-tab-content.tsx` · `drawer-event-timeline.tsx` · `drawer-notes.tsx` · `drawer-assignments.tsx` · `drawer-checklist.tsx`
- `components/finance/dashboard/profit-detail-drawer.tsx`
- `tests/e2e/cashflow-m2.spec.ts` (chỉ nếu nhãn assert đổi — xem §3)

**KHÔNG đụng:** `components/ui/badge.tsx` (+ `.badge` CSS) — Badge SSOT toàn app đang in hoa ("ĐANG THỰC HIỆN") ở mọi bảng; đổi casing Badge là quyết định toàn app, tách task riêng nếu user muốn. `contract-drawer.tsx` (header dùng `Drawer` SSOT `text-h3` — đã đúng). `Drawer`, `typography.css`.

---

> **Đã làm trước một phần (26/08, `claude/drawer-font-weight`, user: "mood không hề xài font này"):** `font-black` (900) → `font-bold` (700) ở cả 2 drawer (11 chỗ) + avatar `text-lg font-black` → `text-h3`. Inter Variable có 900 nhưng thang thiết kế chỉ 400–700 → chữ 900 nhìn như font khác. Phần còn lại của spec (uppercase / tracking / text-tiny / sentence case) vẫn chờ gật.

## 0. Mục tiêu đo được
1. `grep -n "uppercase\|tracking-wide\|font-black\|text-tiny\|text-lg\b\|text-xs\b\|text-sm\b" <6 file locks>` = **0**.
2. Hai drawer vẫn cùng khung 480px, cùng cấu trúc thẻ; chỉ đổi kiểu chữ theo token.
3. Thẻ THANH TOÁN (drawer vận hành) và thẻ LỢI NHUẬN (drawer lợi nhuận) **cùng một cách viết số**: 3 số không hậu tố, đơn vị "(VND)" ở tiêu đề thẻ, `whitespace-nowrap` — không gãy dòng ở 375px với mọi số tiền.
4. `cashflow-m2` 3/3 (local + prod); screenshot 2 drawer @1366 + @375.

## 1. Bảng thay thế (áp đồng nhất cho 6 file)

| Vị trí | Hiện tại | Thay bằng | Ví dụ |
|---|---|---|---|
| Tiêu đề thẻ (THANH TOÁN, LỊCH SỰ KIỆN, GHI CHÚ (0), NHÂN SỰ, LỢI NHUẬN, CẤU THÀNH DOANH THU, CHI PHÍ NHÂN SỰ…) | `text-caption font-semibold text-text-secondary uppercase tracking-wide` | `section-heading text-text-secondary` (14px/600, sentence case) | "Thanh toán", "Lịch sự kiện", "Ghi chú (0)", "Lợi nhuận (VND)" |
| Nhãn ô số / pill (TỔNG, ĐÃ THU, CÒN LẠI, DỊCH VỤ, NGÀY LÀM, NGÀY CHỤP, NGÀY KÝ, DOANH THU, CHI PHÍ, LỢI NHUẬN, GÓI DỊCH VỤ…) | `text-tiny font-bold uppercase text-…` | `text-caption text-text-muted` (12px/400; giữ màu riêng của pill: `text-warning/70`, `text-primary/70`) | "Tổng", "Đã thu", "Ngày chụp" |
| Giá trị số trong lưới 3 cột / 2×2 | `text-body-sm font-black` | `text-body-sm font-bold whitespace-nowrap tabular-nums` | `950.000` |
| Giá trị pill (Dịch vụ, Ngày làm/chụp/ký) | `text-body-sm font-bold` | giữ (đã đúng) | — |
| % tiến độ / biên | `text-caption font-black` | `text-caption font-bold` | `13,8%` |
| Avatar chữ cái đầu | `text-lg font-black` | `text-h3` | `S` |
| Chú thích phụ (`text-tiny text-text-muted` ở timeline/notes/assignments/checklist, dòng phụ `Ekip: …`, `1 × 950.000 VND`) | `text-tiny` | `text-caption` | — |
| Nút "THEO DÕI THANH TOÁN" | `text-caption font-bold uppercase tracking-wide` | `text-body-sm font-semibold` (sentence case "Theo dõi thanh toán") | — |
| Tab "Sự kiện / Checklist / Nhân sự" | kiểm — nếu có `uppercase`/`text-tiny` thì cùng luật | — | — |

Số tiền thẻ THANH TOÁN: `fmt(totalAmount)` → `formatCurrency(totalAmount)` (bỏ " VND"), tiêu đề "Thanh toán (VND)" với "(VND)" `text-caption text-text-muted font-normal` — giống thẻ LỢI NHUẬN hiện tại. Dòng "Đã thu · Còn lại" caption và các dòng danh sách giữ "VND".

## 2. Vì sao chọn `section-heading` + `text-caption` (không phải `text-label`)
`.text-label` (13px/500) là nhãn **form**; ở thẻ số, nhãn đứng trên số 14px/700 → 12px/400 (`caption`) tạo phân cấp rõ mà không cần in hoa. Tiêu đề thẻ dùng `.section-heading` (đã dùng ở modal trả lab, `ProfitDetailSection` cũ) — một token, không tự chế `text-caption font-semibold`.

## 3. Verify
- `npx eslint` 6 file · `npx tsc --noEmit` · `npm run build`.
- Grep §0.1 = 0.
- Playwright local (`--workers=1`): `cashflow-m2` (assert hiện có "Ngày chụp", "Chi phí nhân sự", "Theo dõi thanh toán", width 480 — DOM text vốn sentence case nên không đổi) + `contract-operational.spec.ts` (drawer vận hành — kiểm nhãn nếu spec đó assert chữ in hoa: `grep -n "THANH TOÁN\|LỊCH SỰ KIỆN" tests/e2e/*.ts` → sửa theo).
- Screenshot 2 drawer @1366 + @375 → artifact cập nhật cho user xem trước merge.
- Sau merge: `cashflow-m2` trên prod.

## 4. Docs
`docs/css-classes.md`: thêm dòng grep cheat `grep -rn "text-tiny\|font-black" components/` (vi phạm mới phát hiện); `vault/60-bay/bay-ui-react.md`: bẫy "sao chép class của component lân cận để 'đồng bộ' — phải đối chiếu SSOT trước, lân cận có thể đang sai" (bài học task này). `agent/TASKS.yaml`, `agent/CURRENT_STATE.md`.

## 5. Kết quả (26/08/2026, phần còn lại sau weight)
- **Code (coder subagent theo bảng §1, Claude review diff):** 6 file, 51 chỗ — A tiêu đề thẻ 10 · B nhãn ô số 14 · C `text-tiny` → `text-caption` 20 · D `text-sm` emoji 1 · E nút Theo dõi thanh toán 1 · F tiêu đề Lợi nhuận (VND) 1 · G thẻ Thanh toán: 3 số `formatCurrency` + `whitespace-nowrap tabular-nums`, `fmt`/`CURRENCY_SYMBOL` bỏ vì hết dùng. Không có literal ALL-CAPS trong source (chữ in hoa trước đây hoàn toàn do CSS). Review thêm: 2 chỗ `text-micro` (10px, cùng lỗi) → `text-caption`; 3 ô số thẻ Thanh toán thêm `min-w-0` (như thẻ Lợi nhuận) để nowrap không làm lệch cột. Checklist: 2 h4 "Chuẩn bị" vốn `text-caption font-semibold` (không uppercase) cũng lên `section-heading` cho cùng cỡ với "Lịch sự kiện"/"Nhân sự".
- **Verify:** grep §0.1 (+`text-micro`) = 0 · eslint 6 file + spec 0 · tsc 0 · build ✓ · Playwright local `--workers=1`: `cashflow-m2` 3/3 + `contract-operational` 1/1. `cashflow-m2` UI test mở rộng: `auditDrawerTypography()` đo computed style mọi phần tử có chữ trong 2 dialog @1366 và @375 — không `uppercase` (trừ `.badge` SSOT), weight ≤ 700, cỡ ≥ 12px, phần tử `whitespace-nowrap` không tràn ô; `DRAWER_SHOTS=1` chụp `test-results/drawer-typo/*.png`. Thẻ Thanh toán assert số "5.000.000" không hậu tố.
- **Ghi nhận, không sửa:** thanh tab "Sự kiện / Checklist / Nhân sự" drawer vận hành gãy 2 dòng ở 375px — có sẵn (task không đụng tab). Coder lưu ý `typography.css` import không layer nên `.text-caption{font-weight:400}` về lý thuyết đè utility `font-bold` trong `@layer utilities` — thực đo computed weight vẫn 700 (đo 26/08 lần trước + audit lần này) → không hành động.
- **Docs:** `docs/css-classes.md` grep cheat (`uppercase|tracking-wide`, `text-tiny|font-black`); `vault/60-bay/bay-ui-react.md` bẫy "copy class lân cận để đồng bộ".
