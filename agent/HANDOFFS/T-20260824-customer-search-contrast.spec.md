# T-20260824 — Ô "Tìm kiếm khách hàng" ở form hợp đồng bị chìm trên nền trang

**Owner:** claude (fallback) · **Trạng thái:** user đã duyệt phương án **A** kèm đổi placeholder (2026-08-24) → Claude tự implement trên branch `claude/customer-search-contrast` (fallback: không Codex/Roo)
**Module:** contracts (form) · **Locks:** `components/contracts/form/ContractCustomerSection.tsx`, `app/styles/forms.css`

---

## 0. Hiện trạng đo được

Ô tìm khách hàng ở `/contracts/create` (và `/contracts/[id]/edit` — cùng component) khó nhận ra là một ô nhập:

| Thành phần | Hiện tại | Tương phản |
|---|---|---|
| Nền ô `.input-base` → `--color-bg-input` `#f8f4ee` | đặt **trực tiếp trên nền trang** `--color-bg-base` `#faf7f2` (section 2 không nằm trong card — xem `components/contracts/form/index.tsx:173` + `FullpageFormShell`) | **≈1.03 : 1** — gần như vô hình |
| Placeholder `--color-text-muted` `#b8a898` trên `#f8f4ee` | | **≈2.1 : 1** (WCAG yêu cầu ≥4.5:1 cho chữ) |
| Icon `Search` `text-text-muted` | | như trên |
| Viền | không có — **đúng chủ ý V2** (Lesson #64: *không border, chỉ shadow*; xem `plans/260318-1225-contract-crud-form/phase-04-customer-section.md:59`) | |

Nguyên nhân: `.input-base` được thiết kế để nằm **trong card trắng** (`#f8f4ee` trên `#ffffff` vẫn lệch một chút + có label phía trên). Ở đây nó là ô search inline cạnh heading, nằm trên nền cream, không label → mất mọi tín hiệu "đây là ô nhập".

Đối chiếu: header đã có biến thể `.search-input` (`app/styles/forms.css:119`) cho đúng tình huống "search nổi, không border": nền `--color-bg-hover` + `box-shadow: var(--shadow-xs), inset 0 0 0 1px var(--color-border)`. Tức **inset ring bằng box-shadow đã là từ vựng được chấp nhận** của design system.

## 1. Phương án — khuyến nghị A

| | A — `input-elevated` (khuyến nghị) | B — dùng lại `.search-input` |
|---|---|---|
| Cách làm | Thêm 1 lớp SSOT mới trong `forms.css`, thêm class vào ô | Chỉ đổi class trong TSX, không thêm CSS |
| Nền ô | `--color-bg-card` (trắng) — nổi trên cream như `card-base` | `--color-bg-hover` `#f0e8db` (cream đậm hơn) — 1.13:1 với nền trang |
| Cạnh ô | `inset 0 0 0 1px var(--color-border)` + `var(--shadow-sm)` — không border thật, chỉ shadow (đúng #64) | inset ring + `--shadow-xs` |
| Placeholder | `--color-text-secondary` `#8b7355` trên trắng ≈ **4.5 : 1** ✅ | vẫn `--color-text-muted` ≈ 2.3:1 ❌ |
| Focus | giữ ring cam hiện có, **cộng thêm** shadow để ô không "tụt" khi focus | ring theo `--color-primary` |
| Rủi ro | thêm 12 dòng CSS, chỉ ô này dùng | `.search-input` set `height: 44px; padding-top/bottom: 0` — khác chiều cao `.input-base` (min-height 44 + padding 10) → lệch với heading `section-header-row` |

Chọn A. B chỉ đáng dùng nếu muốn zero-CSS.

## 2. Task A1 — CSS: lớp `input-elevated` (`app/styles/forms.css`)

Chèn **ngay sau** khối `.input-base:focus` (sau dòng 101, **ngoài** `@layer base` — lý do như comment sẵn ở dòng 103-106: unlayered thắng layered bất kể specificity, nên lớp này mới đè được `background` của `.input-base`):

```css
/* ── Input nổi trên nền trang (không nằm trong card) ──────────────
   Dùng cho ô search inline cạnh heading (vd. Khách hàng ở form hợp đồng):
   --color-bg-input trên --color-bg-base chỉ cho tương phản ~1.03:1 → ô "chìm".
   V2 không border (Lesson #64) → dùng bg card + inset ring bằng box-shadow,
   cùng từ vựng với .search-input của header.
   PHẢI nằm ngoài @layer base để đè background của .input-base.
─────────────────────────────────────────────────────────────────── */
.input-elevated {
  background: var(--color-bg-card);
  box-shadow: var(--shadow-sm), inset 0 0 0 1px var(--color-border);
}

.input-elevated::placeholder {
  color: var(--color-text-secondary);
}

/* Focus: giữ ring cam của .input-base:focus, cộng thêm shadow để ô không "tụt" */
.input-elevated:focus,
.input-elevated:focus-visible {
  box-shadow:
    var(--shadow-sm),
    0 0 0 2px color-mix(in srgb, var(--color-interactive) 25%, transparent);
}
```

Ghi chú cho Codex:
- Không dùng giá trị arbitrary (`shadow-[...]`, `text-[...]`) — ESLint SSOT cấm (`eslint.config.mjs:23-31`). Toàn bộ là token có sẵn: `--color-bg-card`, `--shadow-sm`, `--color-border`, `--color-text-secondary`, `--color-interactive` (đều khai báo ở `app/globals.css`).
- `.input-elevated:focus` (specificity 0,2,0) đứng **sau** `.input-base:focus` (0,2,0) trong file → thắng theo thứ tự. Không thêm `!important`.
- Không đụng `.input-base`, `.input-selected`, `.search-input`.
- `.input-elevated` (unlayered) sẽ đè `background` của `.input-selected` (trong `@layer base`) nếu hai lớp cùng xuất hiện. Ở component này điều đó **không xảy ra**: khi `customer.selectedCustomer` có giá trị, component đã `return` nhánh card ở dòng 39-84, nên biểu thức `${customer.selectedCustomer ? "input-selected" : ""}` ở dòng 111 luôn rỗng. Không cần xử lý thêm; chỉ ghi để review biết.

## 3. Task A2 — TSX: áp class + màu icon (`components/contracts/form/ContractCustomerSection.tsx`)

Chỉ 2 chỗ trong nhánh chưa chọn khách (dòng 96-112):

1. Icon `Search` (dòng 101): `text-text-muted` → `text-text-secondary` (cùng mức tương phản với placeholder mới). **Giữ nguyên** icon `UserCheck`/`UserPlus` (đã dùng màu interactive/success).

```tsx
<Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-secondary" />
```

2. `Input` (dòng 111): thêm `input-elevated` vào className.

```tsx
className={`input-base input-elevated pl-10 pr-10 ${customer.selectedCustomer ? "input-selected" : ""}`}
```

3. Placeholder (dòng 109) `"Tìm kiếm khách hàng..."` → `"Tìm hoặc tạo mới..."` — ô này kiêm cả tạo mới (nút "Tạo khách hàng mới" chỉ hiện sau khi focus), placeholder cũ không nói ra điều đó.
   **Vì sao không phải "Tìm hoặc tạo khách hàng..." như preview:** đo thật ở 375px (Inter 14px, vùng chữ = 223 − 40 − 40 = **143px**): "Tìm kiếm khách hàng..." = 153px (vốn đã bị cắt từ trước), "Tìm hoặc tạo khách hàng..." = 179px (cắt nặng hơn), "Tìm hoặc tạo mới..." = **126px** (vừa). Heading "2. Khách hàng" đứng ngay cạnh nên bỏ chữ "khách hàng" không mất nghĩa; không thêm logic placeholder theo breakpoint (Simplicity First).

Không đổi gì khác: dropdown (`bg-bg-card shadow-lg`), nút X, spinner, nhánh đã chọn khách (card `card-base`) giữ nguyên.

## 4. Verify (gate trước khi báo xong)

1. `npx eslint components/contracts/form/ContractCustomerSection.tsx app/styles/forms.css` — 0 error mới (nợ lint cũ ở `components/contracts/**` KHÔNG tính, chỉ file này).
2. `npm run build` xanh.
3. **Render thật** (Roo, chrome-devtools) `/contracts/create` — section "2. Khách hàng", chụp @375 / @768 / @1024:
   - Ô trắng nổi rõ trên nền cream, có cạnh mảnh, placeholder đọc được.
   - Chiều cao ô **không đổi** (44px) và vẫn thẳng hàng với heading trong `section-header-row`.
   - Focus: ring cam hiện đúng, ô không "tụt" (shadow còn).
   - Gõ 2 ký tự → dropdown mở, chọn 1 khách → chuyển sang card đã chọn bình thường; bấm "Đổi" → quay lại ô search.
4. `/contracts/[id]/edit` với hợp đồng bất kỳ — nhánh đã chọn khách render đúng (không ảnh hưởng).

## 6. Kết quả thực thi (Claude fallback, 2026-08-24, branch `claude/customer-search-contrast`)

Diff đúng spec: `app/styles/forms.css` +24 dòng (3 rule `.input-elevated`, ngoài `@layer base`, sau `.input-base:focus`), `ContractCustomerSection.tsx` 3 dòng (icon `text-text-secondary`, class `input-elevated`, placeholder `"Tìm hoặc tạo mới..."`).

| Gate | Kết quả |
|---|---|
| `npx eslint ContractCustomerSection.tsx` | 0 error (forms.css: eslint bỏ qua file CSS — không có config) |
| `npm run build` | exit 0, PWA artifact pass; CSS compiled chứa đủ 3 rule đúng thứ tự (`.input-elevated:focus` sau `.input-base:focus`) |
| Render thật (`next start` prod + Playwright chromium, seed 1 user E2E tạm rồi xoá) `/contracts/create` | **375 / 768 / 1024:** bg `rgb(255,255,255)`, box-shadow = `shadow-sm` + `inset 1px #e8ddd0`, cao **44px**, tâm ô = tâm heading ở cả 3 (align OK), placeholder + icon `#8b7355`, nền xung quanh xác nhận `#faf7f2` (`app-shell-viewport`). Placeholder hiển thị trọn ở 375 (ô rộng 223px). |
| Focus @1024 | bg trắng giữ nguyên, box-shadow = `shadow-sm` + ring `interactive/25%` 2px (không "tụt") |
| Nhánh đã chọn khách / `/contracts/[id]/edit` | không đổi code; nhánh `input-selected` không tới được (early return dòng 39) |

Ghi nhận (không sửa — pre-existing, ngoài phạm vi): class thực tế là `input-base input-base input-elevated pl-10 pr-10` — `<Input>` tự thêm `input-base` (`withBaseStyles` mặc định) trong khi caller cũng truyền `input-base`; vô hại, đã có từ trước.

Ảnh chụp: `render-375.png`, `render-768.png`, `render-1024.png`, `render-1024-focus.png` (scratchpad phiên Claude, đã gửi user).

**Còn lại cần user:** merge `claude/customer-search-contrast` → `main` + `git push origin main` (= deploy). Claude không tự push main.

## 5. Ngoài phạm vi (ghi nhận, không làm trong task này)

- `--color-text-muted` `#b8a898` làm placeholder **toàn hệ thống** chỉ đạt ~2.1:1 — vấn đề a11y chung, cần quyết định token riêng (ADR), không vá lẻ.
- Dark mode đang comment (`app/styles/utilities.css:113-131`) — lớp mới dùng token nên tự theo khi bật, không cần xử lý thêm.
