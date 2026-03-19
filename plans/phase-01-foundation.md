# Phase 01: Foundation

**Status:** ✅ Complete
**Dependencies:** None
**Completed:** 2026-03-15

## Objective

Setup project Next.js 14, cấu hình Supabase, authentication, layout shell (sidebar + header), RBAC middleware. Copy proven patterns từ v1 + Coffee.

## Implementation Steps

### Project Setup
- [x] Init Next.js 14 (App Router, TypeScript, Tailwind CSS v4)
- [x] Install core deps: @supabase/ssr, swr, recharts, sonner, lucide-react, date-fns, zod
- [x] Setup folder structure chuẩn (app/, components/, lib/, hooks/, types/)
- [x] Config Tailwind v4 @theme tokens (colors #8b5e3c earth-tone palette — see stitch-master-brief.md Section 1.2) — globals.css < 100 lines!
- [x] Setup .env.local (Supabase URL, keys)
- [x] Setup next.config.ts (copy PWA + tree-shake + version inject từ Coffee)

### Authentication
- [x] Supabase Auth config (email/password)
- [x] Login page UI — CSS Grid, responsive, Apple HIG style
- [x] Auth middleware (route protection) — copy v1 pattern (getSession not getUser!)
- [x] RBAC middleware check role từ JWT claims
- [x] 5 roles: admin, manager, sale, media, viewer
- [x] Remember Me pattern (session_type cookie — copy v1)

### Layout Shell
- [x] Sidebar navigation (responsive — collapse on mobile)
- [x] Top header (search, user menu, notifications bell)
- [x] Bottom nav mobile (FAB pattern)
- [x] Active route highlighting
- [x] Role-based menu visibility (ẩn menu theo role)

### Shared Components (copy từ v1 + Coffee)
- [x] Modal (unified-modal.tsx — slide-up mobile / scale-in desktop)
- [x] CurrencyInput (vi-VN format)
- [x] Button component
- [x] Input component
- [x] Select component
- [x] Table component
- [x] DataDisplay component
- [x] UX States (EmptyState + Loading)
- [x] Modal Provider (lib/context/modal-context.tsx)
- [x] Modal Renderer (components/providers/modal-renderer.tsx)
- [x] Login Transition (components/auth/login-transition.tsx)

### Data Fetching Setup
- [x] hooks/use-mobile.ts — responsive detection
- [x] lib/utils.ts — cn, formatCurrency, formatDate

## Files Created
```
app/
  layout.tsx ✅
  globals.css ✅ (93 lines < 100!)
  page.tsx ✅ (redirect to /dashboard)
  login/page.tsx ✅ (CSS Grid, responsive)
  offline/page.tsx ✅
  (protected)/layout.tsx ✅ (with sidebar + auth check)
components/
  ui/
    unified-modal.tsx ✅
    currency-input.tsx ✅
    button.tsx ✅
    input.tsx ✅
    select.tsx ✅
    table.tsx ✅
    data-display.tsx ✅
    ux-states.tsx ✅
  auth/
    login-transition.tsx ✅
  providers/
    modal-renderer.tsx ✅
  layout/
    app-shell.tsx ✅
    sidebar.tsx ✅
    header.tsx ✅
    bottom-nav.tsx ✅
lib/
  supabase/
    client.ts ✅
    server.ts ✅
    middleware.ts ✅
  context/
    modal-context.tsx ✅
  utils.ts ✅
hooks/
  use-mobile.ts ✅
types/
  roles.ts ✅
middleware.ts ✅ (Next.js root)
next.config.ts ✅
```

## Test Criteria
- [x] `npm run dev` chạy OK
- [x] Login/logout hoạt động
- [x] Route protection: user chưa login → redirect /login
- [x] Remember Me: đóng tab + mở lại → giữ session nếu checked
- [x] Sidebar hiển thị đúng menu theo role
- [x] Mobile responsive layout OK (sidebar collapse, bottom nav)
- [x] Modal slide-up trên mobile, scale-in trên desktop
- [x] CurrencyInput format đúng VND (25.000)

---
**Next Phase:** → Phase 02 (Database & RLS)
