# Design: Merge Tab Nav into Header on Scroll
Created: 2026-03-18T11:08
Status: ⬜ Pending

---

## 1. Hiện trạng & Vấn đề

### Cấu trúc hiện tại (mobile):
```
┌────────────────────────────┐  ← Header (fixed, z-50, 56px)
│  ←    HD-001           ⋮   │     auto-hide on scroll down
└────────────────────────────┘
┌────────────────────────────┐  ← Tab Nav (sticky, z-40, ~48px)
│ [Chi tiết][Lịch trình]...  │     luôn dính, theo header
└────────────────────────────┘
│  Content...                │
```

**Vấn đề:** Khi tabs dính lên trên, nó trông lạc lõng — không có bg/shadow
rõ ràng, không phải bar, không có context.

### Mục tiêu:
Khi user cuộn QUA vị trí tự nhiên của tab nav → tabs **nhảy vào header**,
thay thế title "HD-001" → tạo thành **1 bar duy nhất** (56px).

---

## 2. Thiết kế UI — 2 trạng thái

### State 1: NORMAL (tabs ở vị trí tự nhiên)
```
┌────────────────────────────┐
│  ←    HD-001           ⋮   │  ← Header bình thường
└────────────────────────────┘
│  [SummaryCard]             │
│  [FinancialDashboard]      │
│  [WorkflowStepper]         │
│                            │
│ [Chi tiết][Lịch trình]...  │  ← Tabs trong flow bình thường (KHÔNG sticky)
│----- section content ------│
```

### State 2: MERGED (tabs nhảy vào header)
```
┌────────────────────────────┐
│ ← [Chi tiết][Lịch]  [⋮]   │  ← Header biến hình
└────────────────────────────┘
│----- section content ------│  ← Content sát ngay dưới
```

**Chi tiết layout khi merged:**
```
[←16px][gap8][────── tabs scroll ──────][gap8][⋮16px]
  40px   8    ~270px (overflow-x-auto)    8    40px
  Total = 366px → vừa iPhone (375px)
```

---

## 3. Data Flow — State Hoisting

### Vấn đề chính
`activeTab`, `handleTabClick`, `TABS` config hiện nằm BÊN TRONG `MobileTabNav`.
Để header cũng render tabs → cần hoist lên parent.

### Thiết kế mới:

```
contract-detail-client.tsx (Parent)
│
│  States:
│  ├── headerVisible (boolean) — đã có
│  ├── tabsMerged (boolean) — MỚI
│  ├── activeTab (TabKey) — HOIST từ MobileTabNav
│  │
│  Refs:
│  ├── tabSentinelRef — MỚI (IntersectionObserver anchor)
│  │
│  Callbacks:
│  ├── handleTabClick(tab) — HOIST từ MobileTabNav
│
│  Render:
│  ├── <TopActionBar
│  │     headerVisible, tabsMerged, activeTab, onTabClick />
│  │
│  ├── <div ref={tabSentinelRef} />  ← sentinel (h-0, invisible)
│  │
│  └── <MobileTabNav
│        headerVisible, tabsMerged, activeTab, onTabClick />
```

### TABS config → shared constant
```tsx
// Tách ra file riêng hoặc đặt ở parent
export const CONTRACT_DETAIL_TABS = [
  { key: "details",   label: "Chi tiết",   sectionId: "section-details" },
  { key: "events",    label: "Lịch trình", sectionId: "section-events" },
  { key: "print",     label: "In ấn",      sectionId: "section-print" },
  { key: "checklist", label: "Checklist",   sectionId: "section-checklist" },
  { key: "actions",   label: "Thao tác",   sectionId: "section-actions" },
] as const;
```

---

## 4. Detect Merge Point — IntersectionObserver

### Sentinel approach
Đặt 1 div ẩn (sentinel) ngay TRƯỚC `<MobileTabNav>`.
Khi sentinel ra khỏi viewport → `tabsMerged = true`.

```tsx
// contract-detail-client.tsx
const tabSentinelRef = useRef<HTMLDivElement>(null);
const [tabsMerged, setTabsMerged] = useState(false);

useEffect(() => {
  const sentinel = tabSentinelRef.current;
  const scrollEl = document.getElementById("main-scroll");
  if (!sentinel || !scrollEl) return;

  const observer = new IntersectionObserver(
    ([entry]) => setTabsMerged(!entry.isIntersecting),
    { root: scrollEl, threshold: 0 }
  );

  observer.observe(sentinel);
  return () => observer.disconnect();
}, []);

// Render (mobile section):
{/* sentinel — đặt ngay trước MobileTabNav */}
<div ref={tabSentinelRef} className="lg:hidden h-0 w-full" />
<MobileTabNav ... />
```

---

## 5. Header biến hình — TopActionBar

### Khi `tabsMerged = false` (bình thường):
```
│ ←     HD-001          ⋮  │
```

### Khi `tabsMerged = true`:
```
│ ← [Chi tiết][Lịch trình] ⋮ │
```

### Transition:
- Title "HD-001" → `opacity-0` (200ms ease-out)
- Tabs → `opacity-1` (200ms ease-out, delay 50ms)
- Dùng `position: absolute` cho cả 2 layer → cross-fade không giật

### Code design:
```tsx
{/* Mobile header inner */}
<div className="flex items-center justify-between px-4 h-(--header-mobile-h)">
  {/* Left: Back button — LUÔN HIỆN */}
  <Link href="/contracts" className="btn-icon shrink-0">
    <ArrowLeft size={20} />
  </Link>

  {/* Center: Title OR Tabs (cross-fade) */}
  <div className="flex-1 min-w-0 relative">
    {/* Layer 1: Title — ẩn khi merged */}
    <span className={`... transition-opacity duration-200
      ${tabsMerged ? "opacity-0 pointer-events-none" : "opacity-100"}`}>
      {contractCode}
    </span>

    {/* Layer 2: Tabs — hiện khi merged */}
    <div className={`absolute inset-0 flex items-center
      overflow-x-auto no-scrollbar transition-opacity duration-200
      ${tabsMerged ? "opacity-100" : "opacity-0 pointer-events-none"}`}>
      {TABS.map(tab => (
        <button
          key={tab.key}
          onClick={() => onTabClick(tab)}
          className={`tab-pill whitespace-nowrap text-caption py-1 px-3
            ${activeTab === tab.key ? "tab-pill-active" : "tab-pill-inactive"}`}
        >
          {tab.label}
        </button>
      ))}
    </div>
  </div>

  {/* Right: More button — LUÔN HIỆN */}
  <button className="btn-icon shrink-0">
    <MoreHorizontal size={20} />
  </button>
</div>
```

---

## 6. Tab Nav khi merged — MobileTabNav

### Behavior:
- Khi `tabsMerged = true` → ẩn visual (tabs đã ở trong header)
- Khi `tabsMerged = false` → hiện bình thường, KHÔNG sticky

### Key change: Bỏ `sticky`
Vì khi cần sticky → tabs đã được merge vào header rồi.
Tab nav ở vị trí tự nhiên (in-flow) = KHÔNG sticky.

```tsx
// MobileTabNav — simplified
<div className={`lg:hidden px-4 py-3 border-b border-border/50
  transition-opacity duration-200
  ${tabsMerged ? "opacity-0 pointer-events-none h-0 overflow-hidden py-0 border-0" : "opacity-100"}`}>
```

⚠️ Khi merged → collapse height (h-0 + overflow-hidden + py-0)
để content không bị gap trống ở vị trí tabs cũ.

---

## 7. Edge Cases & Test Criteria

### Edge cases:
- [ ] Tab click khi merged → scroll content VÀ activeTab highlight
- [ ] IntersectionObserver scroll lên → tabs thoát merger, hiện lại ở vị trí tự nhiên
- [ ] Header auto-hide (scroll down) kết hợp với merged → header ẩn toàn bộ (cả tabs)
- [ ] Fast scroll → không bị giật/flicker giữa 2 states
- [ ] Desktop → KHÔNG bị ảnh hưởng (lg:hidden trên cả 2 components)
- [ ] Resize window mobile ↔ desktop → state reset đúng

### Acceptance Criteria:
- [ ] State 1 → State 2 transition mượt (không giật)
- [ ] Back button và More button luôn hiện ở cả 2 states
- [ ] Tab pills trong header scroll ngang được (nếu chật)
- [ ] Active tab highlight đúng khi scroll tự nhiên (IntersectionObserver)
- [ ] Click tab khi merged → scroll content đúng section
- [ ] Desktop layout 0 thay đổi

---

## 8. Files to Modify

| File | Scope | Effort |
|------|-------|--------|
| `contract-detail-client.tsx` | Hoist state, sentinel, detect merge | 🟡 Medium |
| `top-action-bar.tsx` | Render tabs khi merged, cross-fade | 🟡 Medium |
| `mobile-tab-nav.tsx` | Nhận props, bỏ sticky, collapse khi merged | 🟢 Easy |

---

## 9. Phases

| Phase | Name | File chính | Mô tả |
|-------|------|-----------|--------|
| 01 | Hoist tab state + sentinel | contract-detail-client.tsx | Hoist activeTab, TABS, handleTabClick lên parent. Thêm sentinel + IntersectionObserver. |
| 02 | Header biến hình | top-action-bar.tsx | Nhận tabsMerged + tab data. Render cross-fade title ↔ tabs. |
| 03 | Tab nav simplify | mobile-tab-nav.tsx | Bỏ internal state (nhận từ props). Bỏ sticky. Collapse khi merged. |

## Quick Commands
- Bắt đầu: `/code`
