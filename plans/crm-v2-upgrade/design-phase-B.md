# 🎨 DESIGN: Phase B — Customer Module Fix

**Ngày tạo:** 2026-03-16
**Dựa trên:** BRIEF-crm-v2-upgrade.md §3.1 + V1 customers/page.tsx

---

## 1. 📊 Data Flow (Cách dữ liệu chảy)

### Hiện tại (V2 - Client Side) ❌
```
Browser load page.tsx ("use client")
  → useEffect → fetchData() → getCustomers() + getCustomerStats()
  → setState → render
```
**Vấn đề:** SEO kém, loading spinner đầu tiên, extra round-trip

### Target (V1 pattern - Server Side) ✅
```
Server nhận request
  → page.tsx (async function) → Promise.all([getCustomers, getCustomerStats])
  → Render HTML hoàn chỉnh → Gửi về client
  → Client hydrate → interactions OK
```
**Lợi ích:** Fast First Paint, SEO ready, ít JS shipped

### Quyết định kiến trúc:
| Item | Decision | Lý do |
|------|----------|-------|
| Page render | **Server Component** | V1 pattern proven, faster FP |
| Stats | Server fetch → pass prop | Không cần real-time stats |
| Customer List | **Client Component** (pagination, click) | Cần interactivity |
| Customer Detail | Client Component (modal) | Cần animation + state |
| Customer Form | Client Component (modal) | Cần form state |
| LTV value | Server-side JOIN contracts | V2 đã có `getCustomerById` JOIN |
| Search | URL params + server fetch | V1 pattern: debounced → URL → server refetch |

---

## 2. 📦 Database Query Changes

### B4. Fix LTV trong danh sách (hiện đang `—`)

**Hiện tại:** `getCustomers()` query `customers` table only → no LTV data
**Target:** LEFT JOIN contracts → SUM total_value → trả về mỗi customer

```sql
-- Concept (implemented in server action, not raw SQL)
SELECT c.*, 
  COALESCE(SUM(ct.total_value), 0) as ltv
FROM customers c
LEFT JOIN contracts ct ON ct.customer_id = c.id
WHERE c.deleted_at IS NULL
GROUP BY c.id
ORDER BY c.created_at DESC
```

**Implementation:** Supabase client không hỗ trợ LEFT JOIN + SUM trực tiếp.
**Giải pháp:** Fetch contracts separately → compute client-side per customer.
Hoặc tốt hơn: dùng RPC.

**Quyết định:** Batch fetch approach:
1. `getCustomers()` trả `customers[]` như hiện tại
2. Thêm 1 query batch: `contracts` grouped by `customer_id` → `{customer_id: sum}`
3. Merge vào response: `customers.map(c => ({...c, ltv: ltvMap[c.id] || 0}))`

---

## 3. 📱 Screen Designs

### 3.1. Customer Page Layout

```
┌─────────────────────────────────────────────────────────┐
│  HEADER (CRM tabs: Khách hàng | Leads)                  │
├─────────────────────────────────────────────────────────┤
│  [Stats Strip] ─ 3 cards ngang                           │
│  ┌────────┐ ┌────────┐ ┌────────┐                       │
│  │👥 Tổng │ │➕ Mới  │ │📈 LTV  │                       │
│  │ 42     │ │ 5      │ │ 15tr   │                       │
│  └────────┘ └────────┘ └────────┘                       │
│                                                          │
│  [Search Bar] ─ Inline (Stitch pattern)                  │
│  ┌──────────────────────────────┐ ┌──────────────┐      │
│  │ 🔍 Tìm tên, SĐT khách...   │ │ + Thêm KH    │      │
│  └──────────────────────────────┘ └──────────────┘      │
│                                                          │
│  [Customer Table]                                        │
│  ┌───────────────────────────────────────────────────┐  │
│  │ # │ Tên KH        │ SĐT     │ Nguồn │ Tags │ LTV│  │
│  │ 1 │ 👤 Nguyễn...  │ 090...  │ FB    │ VIP  │ 15M│  │
│  │ 2 │ 👤 Trần...    │ 091...  │ Zalo  │ Wed  │ 8M │  │
│  └───────────────────────────────────────────────────┘  │
│                                                          │
│  [Pagination]                           Trang 1/3  ▶   │
└─────────────────────────────────────────────────────────┘
```

### 3.2. Mobile Layout

```
┌──────────────────────┐
│ [Stats Strip] 3 cols │
│ ┌────┐┌────┐┌────┐   │
│ │ 42 ││ 5  ││15tr│   │
│ └────┘└────┘└────┘   │
│                       │
│ [FilterChip] "q=..."  │
│                       │
│ [Card List]           │
│ ┌────────────────┐    │
│ │ 👤 Nguyễn Văn A│    │
│ │ KH-001         │    │
│ │ 📞 090... · FB │    │
│ │ [VIP]          │    │
│ └────────────────┘    │
│ ┌────────────────┐    │
│ │ 👤 Trần Thị B  │    │
│ │ KH-002         │    │
│ └────────────────┘    │
│                       │
│           [⊕] FAB     │
└──────────────────────┘
```

---

## 4. 🔧 Component Changes (chi tiết)

### 4.1. `page.tsx` → Server Component

**Before (123 lines, "use client"):**
- Client-side fetch with useEffect
- Loading spinner
- All state in page

**After (~50 lines, server):**
```tsx
// KHÔNG "use client"
export default async function CustomersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; page?: string; create?: string }>;
}) {
  const params = await searchParams;
  const search = params.q || "";
  const page = Number(params.page) || 1;
  
  const [customersRes, statsRes] = await Promise.all([
    getCustomers({ search, page, pageSize: 20 }),
    getCustomerStats(),
  ]);
  
  // Extract data
  const { customers, total } = customersRes.success ? customersRes.data : { customers: [], total: 0 };
  const stats = statsRes.success ? statsRes.data : { total: 0, newThisMonth: 0, avgLifetimeValue: 0 };
  
  return (
    <div className="space-y-5">
      <CustomerStats stats={stats} />
      <CustomerListClient
        initialCustomers={customers}
        total={total}
        page={page}
        search={search}
        showCreate={params.create === "true"}
      />
    </div>
  );
}
```

**Key:** `searchParams` is a Promise in Next.js 16+ → await it.

### 4.2. `CustomerStats.tsx` — Dark mode fix

**Bug:** Line 41: `bg-white` → hardcoded, broken in dark mode
**Fix:** `bg-white` → `bg-bg-card`

```diff
- className="bg-white rounded-xl border border-border p-4 lg:p-5 shadow-sm shadow-primary/5"
+ className="bg-bg-card rounded-xl border border-border p-4 lg:p-5 shadow-sm shadow-primary/5"
```

### 4.3. `CustomerList.tsx` — LTV + Search + Pagination

**Changes:**
1. **LTV column:** `—` → `formatCurrency(customer.ltv)` (data from server)
2. **Pagination:** `justify-center` → `justify-end` (Stitch pattern)
3. **Empty state:** Thêm CTA button "Thêm khách hàng đầu tiên"

**LTV approach:** 
- Extend Customer type: `Customer & { ltv?: number }`
- Server computes LTV batch → passes down
- Display: `formatCurrency(ltv || 0)` + "đ"

### 4.4. Search (inline trong page)

**V1 Pattern (CRMSearch.tsx, 40 lines):**
```tsx
// Debounce 300ms → update URL param ?q=xxx → trigger server refetch
const [value, setValue] = useState(initialSearch);
useEffect(() => {
  const timer = setTimeout(() => {
    const params = new URLSearchParams(searchParams);
    if (value) params.set("q", value);
    else params.delete("q");
    router.replace(`?${params.toString()}`);
  }, 300);
  return () => clearTimeout(timer);
}, [value]);
```

**V2 Implementation:**
- Tạo component `CustomerSearchBar` hoặc inline trong `CustomerListClient`
- Layout: `[🔍 input flex-1] [+ Thêm KH button]`
- Debounce 300ms → `router.replace` → page refetch (server component)

---

## 5. ✅ Acceptance Criteria

### Stats Cards
- [ ] 3 cards hiện đúng data
- [ ] Dark mode: KHÔNG có `bg-white`, dùng `bg-bg-card`
- [ ] Icon container: `w-4 h-4 text-text-muted`

### Search
- [ ] Input visible phía trên table
- [ ] Debounce 300ms
- [ ] URL param `?q=xxx` sync
- [ ] Clear search → show all

### LTV
- [ ] Mỗi customer hiện giá trị LTV thật
- [ ] Customer không có HĐ → hiện `0đ`
- [ ] Format VND chuẩn

### Pagination
- [ ] Nằm bên phải (justify-end)
- [ ] "Trang X / Y" format

### Empty State
- [ ] Icon + text + CTA button
- [ ] CTA opens customer form

### Customer Detail 360
- [ ] Phone, email, address, wedding_date, birthday
- [ ] Source badge + Tags
- [ ] Lifetime Value card (data thật từ contracts)
- [ ] Linked contracts list
- [ ] Notes section
- [ ] Edit + Delete buttons

---

## 6. 📁 Files to Modify

| File | Action | Lines ~est |
|------|--------|-----------|
| `app/(protected)/crm/customers/page.tsx` | **REWRITE** — server component | ~50 |
| `components/crm/customers/CustomerStats.tsx` | **FIX** — bg-white → bg-bg-card | 1 line |
| `components/crm/customers/CustomerList.tsx` | **MODIFY** — search, LTV, pagination | ~30 lines changed |
| `app/actions/crm.ts` | **MODIFY** — LTV batch in getCustomers | ~15 lines |

**Total estimated changes:** ~100 lines modified, 0 new files

---

## 7. 🚫 Constraints

- KHÔNG chuyển CustomerList sang server component (cần click + pagination interactions)
- KHÔNG thêm SWR/React Query — dùng server fetch + router.refresh()
- KHÔNG thay đổi CustomerForm hoặc CustomerDetail (đã OK)
- KHÔNG thêm filter dropdown (chưa có trong plan)
- Giữ exact same props cho CustomerStats, CustomerDetail

---

*Tạo bởi AWF 2.1 - Design Phase*
*Next: `/code phase-B`*
