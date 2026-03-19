# 📖 V1 Lessons — Kinh nghiệm xương máu carry-over

**Source:** Quét codebase `0Moodstudio/` (v1.3.13, 18 modules, 27+ tables)
**Date:** 2026-03-15

---

## 🏗️ KIẾN TRÚC V1

### Folder Structure (đã proven, giữ nguyên)
```
app/
  (protected)/         ← Route group, wrapped by auth layout
    dashboard/
    contracts/
    customers/
    dresses/
    finance/
    ...
  actions/             ← Server Actions (by domain)
  login/
  api/                 ← API routes (minimal)
components/
  shared/              ← UnifiedModal, CurrencyInput, EmptyState, FAB...
  ui/                  ← shadcn components
hooks/
  useRealtime.ts       ← Copy nguyên sang v2
  useEscape.ts
lib/
  supabase/client.ts   ← Browser Supabase client
  supabase/server.ts   ← Server Supabase client
  auth_utils.ts        ← withAdmin, withAuth wrappers
  cache.ts             ← cachedQuery with TTL
  format.ts            ← Currency, date formatting
types/
  database.ts          ← Generated from Supabase
constants/
  roles.ts             ← Role helpers (isAdmin, etc.)
```

### Package.json (deps đã proven)
```
Core:       next@16, react@19, typescript
Supabase:   @supabase/ssr, @supabase/supabase-js
Data:       @tanstack/react-query (SWR alternative dùng TanStack thay SWR)
UI:         tailwindcss@3, lucide-react, sonner (toasts)
PWA:        @ducanh2912/next-pwa
Forms:      @headlessui/react, zod (validation)
PDF:        html2pdf.js
Charts:     (cần thêm recharts cho v2)
DnD:        @dnd-kit/core (kanban boards)
Dates:      date-fns
Monitoring: @sentry/nextjs
```

---

## ⚠️ SAI LẦM PHẢI TRÁNH

### 1. Database Schema — Dùng VARCHAR thay vì ENUM
```sql
-- ❌ V1: Free-text, dễ typo, khó filter
service_type VARCHAR(100)  -- 'Combo', 'Gói Cưới: Combo', 'combo'
status VARCHAR(100)        -- 'Đang làm', 'dang lam', 'Đang Làm'

-- ✅ V2: Dùng PostgreSQL ENUM hoặc lookup table
CREATE TYPE service_type_enum AS ENUM ('wedding', 'baby', 'concept', 'rental', 'id_photo', 'invitation');
CREATE TYPE contract_status_enum AS ENUM ('draft', 'deposited', 'preparing', ...);
```
**Impact:** v1 phải viết normalization helper (`normalizeServiceType`) - code thừa!

### 2. RLS — Quá lỏng, gần như không có
```sql
-- ❌ V1: Mọi authenticated user đọc/ghi tất cả
CREATE POLICY "Authenticated users can view contracts"
  ON contracts FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can update contracts"
  ON contracts FOR UPDATE TO authenticated USING (true);
```
**Impact:** Bất kỳ user nào cũng sửa/xoá được mọi thứ → nghiêm trọng!

```sql
-- ✅ V2: Role-based + Service Role pattern
-- SELECT: authenticated OK (single-tenant, ai cũng cần xem)
-- INSERT/UPDATE/DELETE: qua Server Actions + withAdmin/withAuth + service_role bypass
```

### 3. Denormalized data — Lưu trùng lặp
```sql
-- ❌ V1: customer_name trong contracts, employee_name trong salaries
customer_name VARCHAR(255),  -- Trùng với customers.customer_name
employee_name VARCHAR(255),  -- Trùng với employees.full_name

-- ✅ V2: JOIN khi cần, KHÔNG lưu trùng
-- Chỉ giữ FK: customer_id UUID REFERENCES customers(id)
-- Nếu cần performance → VIEW hoặc generated column
```

### 4. Schema quá nhiều bảng (27 tables v1)
```
-- ❌ V1: 27 tables, nhiều bảng ít dùng (break_even_analysis, regulations, documents)
-- Bảng attendance_summary chỉ chứa 3 fields, gần như redundant

-- ✅ V2: Chỉ tạo tables KHI CẦN (MVP ~10 tables max)
-- Thêm dần theo wave, không tạo trước
```

### 5. Middleware — getSession() thay vì getUser()
```typescript
// ✅ V1 đã fix đúng — KEEP!
// getSession() reads JWT locally = ~0ms
// getUser() calls Supabase API = ~200-400ms
const { data: { session } } = await supabase.auth.getSession();
```

### 6. "Remember Me" pattern
```typescript
// ✅ V1 đã implement — CARRY OVER
// session_type cookie + signOut khi cookie mất
```

---

## ✅ CÁI TỐT GIỮ NGUYÊN

### 1. useRealtime hook (147 lines, production-ready)
- Auth check trước subscribe
- Debounce 300ms
- Filter support
- ConnectionStatus tracking
- React Query invalidation hoặc router.refresh()
→ **Copy nguyên sang v2**

### 2. middleware.ts structure
- getSession() (not getUser())
- Remember me pattern
- RBAC route guarding (ADMIN_ONLY_ROUTES)
- Clean matcher config
→ **Adapt + mở rộng 5 roles cho v2**

### 3. lib/auth_utils.ts (withAdmin, withAuth)
- Wrap mọi Server Action
- Service Role client cho mutations
- Audit logging
→ **Copy + mở rộng cho 5 roles**

### 4. lib/cache.ts (cachedQuery)
- TTL-based in-memory cache
- Tag-based invalidation
→ **Copy, adjust TTL theo v2 modules**

### 5. Folder structure
- `(protected)/` route group
- `actions/` by domain
- `components/shared/`
→ **Giữ nguyên**

---

## 🎯 CẢI THIỆN CHO V2

| # | V1 | V2 Improvement |
|---|-----|----------------|
| 1 | VARCHAR status/types | **PostgreSQL ENUM** |
| 2 | RLS quá lỏng (USING true) | **Code-level auth + Service Role** |
| 3 | Denormalized names | **FK only, JOIN khi cần** |
| 4 | 27 tables upfront | **MVP ~10 tables, thêm dần** |
| 5 | auth.uid() trong RLS | **(SELECT auth.uid())** SubSelect pattern |
| 6 | Nhiều fix_*.sql patches | **Schema đúng từ đầu, migration versioned** |
| 7 | SWR pha trộn TanStack | **Chọn 1: TanStack React Query** |
| 8 | globals.css 20K lines | **Module CSS hoặc split nhỏ** |
| 9 | God files 500+ lines | **File splitting từ ngày 1 (max 250)** |
| 10 | No test từ đầu | **Jest + RTL từ Phase 01** |

---

## 📋 V1 MODULE MAP → V2 MAPPING

| V1 Module (18) | V2 MVP? | V2 Phase | Notes |
|----------------|---------|----------|-------|
| dashboard | ✅ | P07 | Giữ, mở rộng thêm charts |
| contracts | ✅ | P04 | Refactor: đa loại DV, ENUM status |
| customers | ✅ | P03 | Đơn giản hoá (bỏ groom/bride fields vào contract) |
| dresses → inventory | ✅ | P06 | Mở rộng: váy + áo dài + vest |
| finance/receipts | ✅ | P05 | Payments module |
| employees | ❌ Phase 2 | P13 | HR module |
| attendance | ❌ Phase 2 | P13 | Gộp vào HR |
| schedules | ❌ Phase 2 | P09 | Calendar |
| services | ❌ Phase 2 | P10 | Service catalog |
| finance/expenses | ❌ Phase 2 | P11 | Expenses |
| crm | ❌ Backlog | — | CRM leads |
| printing | ❌ Phase 2 | P15 | Thiệp cưới |
| productivity | ❌ Phase 2 | P08 | Team media tasks |
| reports | ❌ Phase 2 | P12 | Reports |
| notifications | ❌ Backlog | — | In-app notifications |
| promotions | ❌ Backlog | — | Khuyến mãi |
| moodie (AI) | ❌ Backlog | — | AI assistant |
| settings | ✅ | P01 | Studio info, user settings |
