# Pre-Code Checklist

Đọc file này TRƯỚC KHI edit bất kỳ code nào.

---

## ✅ Checklist BẮT BUỘC (7 bước)

1. [ ] Đã đọc `tasks/pre-code-checklist.md` (file này)
2. [ ] Đã đọc `tasks/lessons.md`
3. [ ] Đã đọc `docs/reference/` (7 files gốc — hiểu full context)
4. [ ] Đã check **V1** (`C:\Users\Admin\Desktop\Ai\0Moodstudio\webapp\`) cho proven flow/logic
5. [ ] Đã check **Coffee** (`C:\Users\Admin\Desktop\Ai\mcoffe\src\`) cho reusable components
6. [ ] Đã check **Stitch screens** cho UI pixel-reference (Stitch project ID: `3342062284752503492`)
7. [ ] Đã đọc **phase file** tương ứng (`plans/phase-XX-*.md`) — biết rõ scope + file được sửa

---

## 🚫 Quy tắc TUYỆT ĐỐI — Vi phạm = Revert

### Database & Backend
- **ENUM, không VARCHAR** cho status/type fields
- **FK only** — không lưu trùng names (denormalize)
- **Atomic RPC** cho financial calculations — KHÔNG client-side calc
- **getSession()** trong middleware — KHÔNG getUser() (tiết kiệm 200-400ms)

### Frontend — Tech Stack
- **SWR only** — KHÔNG React Query (1 cache system duy nhất)
- **KHÔNG Shadcn/ui** — Custom components theo Coffee pattern
- **Lucide-react only** cho icons — KHÔNG Material Symbols, KHÔNG emoji icons
- **Inter font** (Vietnamese support) — KHÔNG browser defaults

### Frontend — Code Quality
- **Max 250 lines/file** — split nếu dài hơn
- **globals.css < 100 lines** — dùng Tailwind v4 @theme tokens
- **Không dùng `any`** — full TypeScript types

### Design System — V2 Earth-Tone
- **Primary: `#8B5E3C`** — KHÔNG dùng V1 `#2e5c46` (deep olive)
- **Logo: Mood "M"** (`public/logo.png`) — KHÔNG camera icon
- **Color palette** — chỉ dùng từ globals.css @theme (SSOT)
- **60-30-10 rule** — 60% base `#FAF7F2`, 30% cards `#FFFFFF`, 10% primary `#8B5E3C`

---

## 📦 Component Sources (ưu tiên theo thứ tự)

| Ưu tiên | Source | Lý do |
|---------|--------|-------|
| 1️⃣ | **Coffee** (`mcoffe/src/components/ui/`) | Proven, lightweight, < 80 lines |
| 2️⃣ | **V1** (`0Moodstudio/webapp/components/`) | Proven logic, cần adapt UI |
| 3️⃣ | **Tự viết** | Khi không có sẵn ở 1 hoặc 2 |

### Coffee components sẵn có:
- `Modal.tsx` (44 lines) — slide-up mobile, scale-in desktop
- `CurrencyInput.tsx` (79 lines) — vi-VN format, VND suffix
- `TabsFilter.tsx` (29 lines) — pill style, responsive
- `SearchBar.tsx` (24 lines) — lucide Search icon
- `lib/swr.ts` (53 lines) — cacheKeys factory, config, helpers
- `hooks/useInfiniteScroll.ts` (38 lines) — IntersectionObserver
- `hooks/useIsTablet.ts` (32 lines) — matchMedia hook

### V1 patterns cần copy (logic only, KHÔNG copy colors):
- Auth flow: rate limiting, Remember Me cookie, error sanitization
- LoginTransition: state machine (checking→idle→transitioning→navigating)
- Sidebar: collapse animation, role-based menu
- SWR: cache invalidation patterns

---

## 🎨 Quick Reference — V2 Colors

```
Primary:     #8B5E3C (earth brown — brand, feng shui)
Dark:        #3D2B1F (headings)
Accent:      #C9A96E (gold highlights)
Light:       #A67C5B (secondary)
Interactive: #CF6717 (CTA buttons, progress, active tabs)
Inter-hover: #B85A14 (CTA hover state)
Inter-light: #FFF3E8 (CTA background tint)

Base BG:     #FAF7F2
Card BG:     #FFFFFF
Sidebar BG:  #F5EFE6
Hover BG:    #F0E8DB
Input BG:    #F8F4EE

Text:        #3D2B1F / #8B7355 / #B8A898
Border:      #E8DDD0 / #F0E8DB

Success:     #4CAF50
Warning:     #FF9800
Error:       #F44336
Info:        #2196F3
```
