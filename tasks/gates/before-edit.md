# 🚧 GATE: Before Edit (MANDATORY)

> **BẮT BUỘC thực hiện TRƯỚC KHI edit BẤT KỲ file code nào.**
> Không tick đủ = KHÔNG ĐƯỢC EDIT CODE.

---

## ✅ Checklist (10 sections — PHẢI TICK HẾT)

### 1. 👁️ SEE IT FIRST
- [ ] Đã mở browser + chạy dev server
- [ ] Đã screenshot UI **hiện tại** (trước khi sửa)

### 2. 🎯 COMPARE WITH DESIGN
- [ ] Đã so sánh UI hiện tại vs **Stitch mockup** (nếu có)
- [ ] Đã ghi ra **danh sách sai lệch** visual (spacing, color, font, layout)
- [ ] Nếu KHÔNG có Stitch → ghi rõ "Không có Stitch cho trang này"

### 3. 🔍 SSOT AUTO-SCAN (AI PHẢI chạy 3 lệnh này TRƯỚC KHI viết code UI)
> **Không scan = Không code. Không ngoại lệ.**

**Bước 3a: Chạy 3 lệnh grep (BẮT BUỘC — output phải paste vào plan)**
```bash
# 1. Scan CSS tokens hiện có
grep -rn "^\." app/styles/*.css | grep -v "^#\|/\*" | head -80

# 2. Scan UI components đang export
grep -rn "^export function\|^export const" components/ui/**/*.tsx

# 3. Scan REGISTRY quick-ref
grep "THAY CHO\|❌ KHÔNG" components/ui/REGISTRY.md
```

**Bước 3b: So khớp (AI tự check)**
- [ ] Với MỖI element sắp viết (div, table, input, select, badge, card...)
  → Đã tìm trong output scan ở trên?
  → Nếu CÓ token/component matching → **DÙNG NÓ**
  → Nếu KHÔNG CÓ → chuyển sang **Section 10 (Approval Gate)**

**Bước 3c: Ghi vào plan**
- [ ] Plan phải ghi rõ: "Dùng `<TableWrapper>` (REGISTRY), dùng `.card-base` (tokens)..."
- [ ] Nếu plan có BẤT KỲ class/component mới → phải có mục "⚠️ NEW TOKEN REQUEST"

### 4. 📋 PLAN BEFORE FIX
- [ ] Đã viết plan (dù ngắn) liệt kê: file nào → sửa gì
- [ ] Anh (user) đã **duyệt plan** trước khi code

### 5. 🧠 READ LESSONS
- [ ] Đã đọc `tasks/lessons.md` (scan nhanh relevant entries)
- [ ] Đã đọc `tasks/pre-code-checklist.md`

### 6. 🚪 MODAL & ANIMATION RULES (Lesson #81-82)
- [ ] Modal mới PHẢI dùng `openModal()` — KHÔNG tự render `modal-backdrop` trong component
- [ ] Animation keyframe `to` state PHẢI dùng `transform: none` — KHÔNG `translateY(0)` hoặc `scale(1)`

### 7. 📘 MODULE BLUEPRINT — CLONE, KHÔNG TỰ VIẾT (BẮT BUỘC)
- [ ] **Đã đọc `tasks/module-blueprint.md`** (1 file duy nhất — SSOT)
- [ ] **CLONE file structure** từ employees/contracts → đổi entity name → đổi data
- [ ] Filter bar **TÁCH FILE RIÊNG** `[module]-filters.tsx` (KHÔNG viết inline)
- [ ] Stats bar **TÁCH FILE RIÊNG** `[module]-stats-bar.tsx` dùng shared `<StatsBar>`
- [ ] Mobile: `<TabsFilter variant="pills">` + `<SelectPill>` (KHÔNG SearchBar trong status bar)
- [ ] Desktop: `<TabsFilter>` + pills nhóm phải với `lg:justify-between`
- [ ] Form: `<SelectForm>` + `<CurrencyInput>` + `.form-grid-2col` (KHÔNG SelectPill, KHÔNG inline grid)
- [ ] **DIFF kiểm tra** structure phải giống hệt Gold Standard source
- [ ] Nếu tạo **ACTION MỚI** → đã đọc `tasks/action-template.md`

### 8. 🗄️ SCHEMA TYPE CHECK — ABC Rule (nếu có DB migration)
- [ ] Column status/type/category mới thuộc Group nào? **A / B / C**
- [ ] **Group A (DB ENUM):** chỉ khi system-level, ≤5 values, bất biến (role, gender, payment_method)
- [ ] **Group B (VARCHAR + TS enum):** business logic, có thể mở rộng → **mặc định dùng cái này**
- [ ] **Group C (Lookup table):** user-managed runtime, ≥10 values, cần metadata
- [ ] Nếu Group B → DB dùng `VARCHAR(N)`, TS có `const array` + `z.enum()` validate
- [ ] ❌ **KHÔNG** `CREATE TYPE ... ENUM` cho business field (category, status, condition)
- [ ] Nếu KHÔNG chắc → mặc định **Group B** (an toàn nhất)

### 9. 🎨 ZERO INLINE — SSOT STYLE ENFORCEMENT (BẮT BUỘC)
> **Mọi visual property PHẢI đến từ SSOT token hoặc CSS class. KHÔNG BAO GIỜ inline.**

- [ ] **z-index:** Dùng CSS variable (`--z-modal`, `--z-dropdown`) khai báo trong `globals.css @theme` → class trong `components.css`. ❌ KHÔNG `style={{ zIndex: 99999 }}`, ❌ KHÔNG `z-[99999]`
- [ ] **background:** Dùng SSOT class (`.card-base`, `.portal-dropdown`) hoặc token `bg-bg-card`. ❌ KHÔNG `style={{ backgroundColor: '...' }}`
- [ ] **color/spacing/radius:** Dùng CSS variable (`--color-*`, `--spacing-*`, `--radius-[name]`). ❌ KHÔNG hardcode hex/px
- [ ] **Self-check trước submit:** Grep file vừa sửa → tìm `style={{` hoặc hardcode hex → nếu CÓ → DỪNG, refactor sang token

**❌ VI PHẠM = REVERT. Không ngoại lệ.**

### 10. 🧱 V2 ENFORCEMENT STANDARD (BẮT BUỘC KHÔNG NHƯỢNG BỘ)
> **Tư duy Inline Styling và Hardcode là KHUYẾT TẬT. Bất kỳ suy nghĩ nào hướng đến inline đều bị cấm tuyệt đối.**

- [ ] **Design Tokens:** BẮT BUỘC 100% sử dụng V2 Design Tokens (Tailwind utility classes, CSS Variables) trong TẤT CẢ mọi trường hợp.
- [ ] **State & Data Fetching:** Quản lý remote data và caching BẮT BUỘC sử dụng **SWR Patterns**. Không dùng `useEffect` kết hợp `useState` để fetch data thủ công.
- [ ] **Database Logic:** Mọi logic phức tạp, heavy computation, data aggregation phải tống xuống **Supabase RPCs**. TUYỆT ĐỐI tránh JS loop aggregation hay N+1 queries ở Next.js/Browser.
- [ ] **Type Safety:** Code phải đặt under **TypeScript Strict Mode**. KHÔNG dán `any`, KHÔNG dùng `@ts-ignore` để bưng bít lỗi. Sửa gốc lỗi interface/type.
- [ ] Tham chiếu rule này trên mọi single line of code được viết ra. **Vi phạm rule này tức là phá vỡ hoàn toàn kiến trúc V2 của toàn bộ hệ thống.**

### 11. 🚦 NEW TOKEN APPROVAL GATE (BẮT BUỘC)
> **Cần tạo CSS class, component, hoặc hook MỚI? PHẢI hỏi user TRƯỚC.**
> **KHÔNG ĐƯỢC tự tạo rồi báo sau.**

**Khi nào trigger gate này:**
- Cần viết `.new-class-name` trong `app/styles/*.css`
- Cần tạo `components/ui/new-component.tsx`
- Cần tạo `hooks/use-new-hook.ts`
- Cần thêm CSS variable mới vào `globals.css @theme`
- Cần viết inline style vì "chưa có token"

**Format yêu cầu (PHẢI trình bày ĐÚNG format này):**
```
⚠️ SSOT CREATE REQUEST:
┌────────────────────────────────────────────┐
│ Loại:    CSS Token / Component / Hook      │
│ Tên:     .timeline-connector               │
│ Lý do:   Chưa có token nào cover pattern X │
│ Đặt ở:   app/styles/components.css         │
│ Gần nhất: .progress-track (khác vì...)     │
│                                            │
│ Code dự kiến:                              │
│   .timeline-connector {                    │
│     @apply w-px h-6 bg-border mx-auto;     │
│   }                                        │
│                                            │
│ → Anh duyệt không?                        │
│   [Y] Tạo token mới                       │
│   [N] Dùng token có sẵn (suggest: ...)     │
│   [M] Sửa lại token có sẵn thay vì tạo mới│
└────────────────────────────────────────────┘
```

**Quy trình:**
1. AI trình request → **DỪNG LẠI, CHỜ USER**
2. User approve [Y] → AI tạo token trong CSS file TRƯỚC → rồi mới dùng trong code
3. User reject [N] → AI dùng token có sẵn, adapt nếu cần
4. User modify [M] → AI sửa token existing để cover case mới

**❌ TỰ TẠO token/component/hook MỚI MÀ CHƯA HỎI = REVERT TOÀN BỘ.**

---

## ❌ DỪNG LẠI NẾU:
- Chưa mở browser xem UI thực tế → **DỪNG**
- Chưa so sánh vs Stitch design → **DỪNG**
- Chưa có plan được duyệt → **DỪNG**
- Đang "hưng phấn" muốn fix ngay → **DỪNG, hít thở, plan trước**

---

## 🔑 Nguyên tắc cốt lõi

> **"Đúng class" ≠ "Đúng design"**
>
> Grep code tìm inline violations chỉ là step 1.
> Step 0 là MỞ UI LÊN XEM + SO VỚI STITCH.
> Nếu skip step 0 → fix mù → fix sai.

---

## 12. 🔗 PER-MODULE CODE GATE (Lesson #96)

> Ngoài gate chung này, MỖI MODULE có gate riêng với LOOKUP TABLE cụ thể.
> **PHẢI ĐỌC gate module tương ứng TRƯỚC KHI viết code.**

| Module | Gate File |
|--------|-----------|
| Settings | `tasks/gates/settings-code-gate.md` |

**Workflow:** `before-edit.md` (chung) → `{module}-code-gate.md` (cụ thể) → viết code → grep verify

