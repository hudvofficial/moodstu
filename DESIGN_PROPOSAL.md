# 📱 Đề Xuất Design & Mockup - Mood Studio
### Quản lý Hợp Đồng - Tối ưu cho iPad/Tablet

> **Mục đích**: Tài liệu này dành để gửi cho Claude/Codex code. Bao gồm đề xuất design, mockup chi tiết và plan triển khai.

---

## 🎨 1. PHÂN TÍCH GIAO DIỆN HIỆN TẠI

### ❌ Vấn đề phát hiện:
| # | Vấn đề | Mức độ |
|---|--------|--------|
| 1 | Tiêu đề cột bị cắt ("KHÁCH HÀNG / NGÀY KÝ" → thiếu chữ) | 🔴 Nghiêm trọng |
| 2 | Cột hành động cuối bị ẩn, nút C/Ch/H/DA không thấy rõ | 🔴 Nghiêm trọng |
| 3 | Padding hàng quá nhỏ → trông chật chội | 🟡 Trung bình |
| 4 | Touch target nhỏ (dưới 44pt theo Apple HIG) | 🟡 Trung bình |
| 5 | Thiếu thanh filter/search phía trên | 🟡 Trung bình |
| 6 | Không phân biệt rõ giữa các loại hợp đồng (Studio/Khác/Gia đình/Cưới) | 🟢 Nhỏ |
| 7 | Không có trạng thái hover/focus rõ ràng | 🟢 Nhỏ |

---

## 🎨 2. DESIGN SYSTEM

### 2.1 Color Palette
```
┌─────────────────────────────────────────────────────────┐
│  PRIMARY                                                │
│  ├─ primary-50:   #FFF7ED  (nền nhạt)                   │
│  ├─ primary-100:  #FFEDD5  (hover bg)                   │
│  ├─ primary-500:  #F97316  (cam chủ đạo - Mood Studio)  │
│  ├─ primary-600:  #EA580C  (hover primary)             │
│  └─ primary-700:  #C2410C  (active)                    │
│                                                         │
│  SEMANTIC (Trạng thái)                                  │
│  ├─ success-50:   #F0FDF4  / success-600: #16A34A      │
│  ├─ warning-50:   #FFFBEB  / warning-600: #D97706      │
│  ├─ danger-50:    #FEF2F2  / danger-600: #DC2626       │
│  └─ info-50:      #EFF6FF  / info-600: #2563EB         │
│                                                         │
│  NEUTRAL                                                │
│  ├─ gray-50:   #FAFAFA  (nền bảng chẵn)                │
│  ├─ gray-100:  #F4F4F5  (border, divider)              │
│  ├─ gray-400:  #A1A1AA  (placeholder)                  │
│  ├─ gray-600:  #52525B  (text phụ)                     │
│  ├─ gray-700:  #3F3F46  (text chính - phụ)             │
│  └─ gray-900:  #18181B  (heading, text quan trọng)     │
└─────────────────────────────────────────────────────────┘
```

### 2.2 Typography
```
┌──────────────────────────────────────────────────────┐
│  Font family: Inter (hoặc system-ui fallback)        │
│                                                      │
│  table-header:  text-[13px] font-semibold uppercase  │
│                 tracking-wide text-gray-600           │
│  row-text:      text-[15px] font-medium text-gray-900│
│  row-sub:       text-[13px] text-gray-500            │
│  badge:         text-[12px] font-semibold            │
│  button:        text-[14px] font-semibold            │
└──────────────────────────────────────────────────────┘
```

### 2.3 Spacing & Sizing
```
┌──────────────────────────────────────────────────────┐
│  row-height (tablet):    72px (touch-friendly)      │
│  cell-padding-x:         20px                        │
│  header-padding:         16px 20px                   │
│  avatar-size:            40px (was 32px)             │
│  badge-padding:          6px 12px                    │
│  touch-target-min:       44px x 44px                 │
│  border-radius:          12px (card), 8px (badge)    │
│  table-border:           1px gray-100                │
└──────────────────────────────────────────────────────┘
```

---

## 🖼️ 3. MOCKUP CHI TIẾT

### 3.1 iPad Landscape (1024px+) - TABLE VIEW

```
┌──────────────────────────────────────────────────────────────────────────────┐
│  Mood Studio                                              [+ Hợp đồng mới]   │
│  Quản lý hợp đồng                                                            │
├──────────────────────────────────────────────────────────────────────────────┤
│  🔍 [Tìm theo tên, SĐT, mã HĐ...        ]  [Tất cả▾] [Studio▾] [Tháng▾]   │
├──────────────────────────────────────────────────────────────────────────────┤
│  MÃ HĢ      KHÁCH HÀNG                TỔNG CỘNG    CÒN NỢ      TT    HĐ    │
│ ─────────────────────────────────────────────────────────────────────────── │
│ ┌──────────────────────────────────────────────────────────────────────────┐ │
│ │HD-2026 ⏷│ⓥ Hoàng - Vinh    │  8.900.000 │  8.900.000│ ⚠ THIẾU│ ⋯  │ │
│ │  -001    │   19/06/2026      │   VNĐ      │   VNĐ    │   3   │    │ │
│ │          │   🏷 Studio        │            │          │       │    │ │
│ ├──────────────────────────────────────────────────────────────────────────┤ │
│ │HD-2026 ⏷│ⓥ CĐ Y Vinh       │  8.900.000 │  8.900.000│ ⚠ THIẾU│ ⋯  │ │
│ │  -002    │   19/06/2026      │   VNĐ      │   VNĐ    │   3   │    │ │
│ │          │   🏷 Studio        │            │          │       │    │ │
│ ├──────────────────────────────────────────────────────────────────────────┤ │
│ │HD-2026 ⏷│ĐP Đen Photo      │       0 VNĐ │       0  │ ✓ ĐỦ  │ ⋯  │ │
│ │  -003    │   14/06/2026      │            │          │       │    │ │
│ │          │   🏷 Khác          │            │          │       │    │ │
│ ├──────────────────────────────────────────────────────────────────────────┤ │
│ │HD-2026 ⏷│HT Hoa Tím         │  1.700.000 │  1.700.000│ ⚠ THIẾU│ ⋯  │ │
│ │  -004    │   14/06/2026      │   VNĐ      │   VNĐ    │   1   │    │ │
│ │          │   🏷 Gia đình      │            │          │       │    │ │
│ └──────────────────────────────────────────────────────────────────────────┘ │
│                                                                              │
│         ◀ Trước   Trang 1 / 12   [1] [2] [3] ... [12]   Sau ▶              │
└──────────────────────────────────────────────────────────────────────────────┘
```

### 3.2 iPad Portrait / Mobile - CARD VIEW

```
┌──────────────────────────────────────────┐
│  Mood Studio                  [☰] [+ HĐ] │
├──────────────────────────────────────────┤
│  🔍 [Tìm kiếm...               ]         │
│  [Tất cả] [Studio] [Cưới] [GĐ]          │
├──────────────────────────────────────────┤
│  ┌────────────────────────────────────┐  │
│  │ HD-2026-001              ⚠ THIẾU   │  │
│  │ ⓥ Hoàng - Vinh                     │  │
│  │ 📅 19/06/2026                       │  │
│  │ 🏷 Studio                           │  │
│  │ ──────────────────────────────────  │  │
│  │ Tổng:    8.900.000 VNĐ            │  │
│  │ Còn nợ:  8.900.000 VNĐ  (màu đỏ)  │  │
│  │                       [👁 Chi tiết] │  │
│  └────────────────────────────────────┘  │
│  ┌────────────────────────────────────┐  │
│  │ HD-2026-002              ⚠ THIẾU   │  │
│  │ ⓥ CĐ Y Vinh                        │  │
│  │ ...                                 │  │
│  └────────────────────────────────────┘  │
└──────────────────────────────────────────┘
```

### 3.3 Expanded Row (khi click vào hàng hoặc icon chevron)

```
┌──────────────────────────────────────────────────────────────────────────────┐
│ HD-2026-001           ⓥ Hoàng - Vinh              ⚠ THIẾU 3.000.000    [✕] │
├──────────────────────────────────────────────────────────────────────────────┤
│  📅 Ngày ký: 19/06/2026        🏷 Loại: Studio                              │
│  📞 SĐT: 0901.xxx.xxx         📍 Địa chỉ: ...                              │
│                                                                              │
│  💰 Tổng cộng:    8.900.000 VNĐ                                             │
│  ✅ Đã thanh toán: 5.900.000 VNĐ                                            │
│  ⚠ Còn nợ:        3.000.000 VNĐ                                             │
│                                                                              │
│  📦 Dịch vụ:                                                                │
│  • Chụp ảnh cưới trọn gói .................. 6.000.000 VNĐ                  │
│  • Album 30x30 .............................. 2.000.000 VNĐ                  │
│  • Video highlight .......................... 900.000 VNĐ                   │
│                                                                              │
│              [📝 Sửa]  [💵 Thanh toán]  [🗑 Xóa]                            │
└──────────────────────────────────────────────────────────────────────────────┘
```

---

## 🧩 4. COMPONENT BREAKDOWN

### 4.1 Component Tree (React + TypeScript)
```
<ContractsPage>
├── <PageHeader>                    // title + nút "Tạo mới"
├── <FilterBar>                     // search + dropdown filters
│   ├── <SearchInput>
│   ├── <FilterDropdown type="status">
│   ├── <FilterDropdown type="category">
│   └── <FilterDropdown type="dateRange">
├── <ContractsTable>                // desktop & tablet landscape
│   ├── <TableHeader>              // sticky, sortable columns
│   ├── <TableRow>
│   │   ├── <ContractCodeCell>    // mã HĐ với chevron
│   │   ├── <CustomerCell>        // avatar + tên + ngày + tag
│   │   ├── <AmountCell>          // tổng cộng
│   │   ├── <DebtCell>            // còn nợ (highlight đỏ nếu >0)
│   │   ├── <StatusBadge>         // ✓ Đủ / ⚠ Thiếu
│   │   └── <ActionMenu>          // dropdown 3 chấm
│   └── <Pagination>
├── <ContractsCardList>            // mobile & tablet portrait
│   └── <ContractCard>
├── <ContractDetailDrawer>         // slide-in từ phải (tablet)
└── <CreateContractModal>
```

### 4.2 Status Badge Component
```tsx
type Status = 'paid' | 'partial' | 'unpaid';

<StatusBadge status="partial" amount={3000000} />
// Render:
// [⚠] THIẾU 3.000.000   (bg warning-50, text warning-700, border warning-200)

<StatusBadge status="paid" />
// Render:
// [✓] ĐÃ ĐỦ            (bg success-50, text success-700, border success-200)
```

---

## 📐 5. RESPONSIVE STRATEGY

| Breakpoint | Width | Layout |
|-----------|-------|--------|
| Mobile    | < 768px   | Card view, 1 cột |
| Tablet Portrait | 768-1023px | Card view, 1-2 cột |
| Tablet Landscape | 1024-1279px | Table view, columns đầy đủ |
| Desktop   | ≥ 1280px | Table view, có sidebar filter |

**Implementation tip (Tailwind):**
```tsx
<div className="hidden md:block"> <ContractsTable /> </div>  // table từ md trở lên
<div className="md:hidden">       <ContractsCardList /> </div> // card dưới md
```

---

## 🛠 6. PLAN TRIỂN KHAI (để gửi Claude/Codex code)

### 📋 TASK 1: Setup & Design Tokens
**Files cần tạo/sửa:**
- `tailwind.config.ts` — thêm color tokens, font sizes
- `src/styles/globals.css` — CSS variables cho theme
- `src/lib/cn.ts` — utility merge classNames

**Acceptance:**
- [ ] Tokens đúng theo bảng màu ở mục 2.1
- [ ] Có helper `formatVND(amount)`, `formatDate(date)`

---

### 📋 TASK 2: Component StatusBadge & Avatar
**Files cần tạo:**
- `src/components/ui/StatusBadge.tsx`
- `src/components/ui/Avatar.tsx` (hiển thị 1-2 chữ cái đầu, gradient bg theo tên)

**Acceptance:**
- [ ] StatusBadge có 3 variants: paid, partial, unpaid
- [ ] Avatar có fallback chữ cái, size 32/40/48
- [ ] Có icon kèm theo trạng thái (CheckCircle, AlertTriangle)

---

### 📋 TASK 3: Component FilterBar
**Files cần tạo:**
- `src/components/contracts/FilterBar.tsx`
- `src/components/ui/SearchInput.tsx`
- `src/components/ui/Dropdown.tsx`

**Props:**
```ts
interface FilterBarProps {
  search: string;
  onSearchChange: (v: string) => void;
  statusFilter: Status | 'all';
  onStatusChange: (v: Status | 'all') => void;
  categoryFilter: Category | 'all';
  onCategoryChange: (v: Category | 'all') => void;
}
```

---

### 📋 TASK 4: Component ContractsTable (Tablet Landscape & Desktop)
**Files cần tạo:**
- `src/components/contracts/ContractsTable.tsx`
- `src/components/contracts/TableRow.tsx`
- `src/components/contracts/TableHeader.tsx`

**Yêu cầu:**
- [ ] Header sticky khi scroll
- [ ] Có thể sort theo: Mã HĐ, Ngày ký, Tổng cộng, Còn nợ
- [ ] Zebra striping (hàng chẵn nền gray-50)
- [ ] Hover state: bg primary-50
- [ ] Chevron mở rộng row để xem chi tiết
- [ ] Click row → mở drawer chi tiết

---

### 📋 TASK 5: Component ContractsCardList (Mobile & Tablet Portrait)
**Files cần tạo:**
- `src/components/contracts/ContractsCardList.tsx`
- `src/components/contracts/ContractCard.tsx`

**Yêu cầu:**
- [ ] Card full-width, padding 16px
- [ ] Hiển thị: Mã HĐ + Status badge (header)
- [ ] Hiển thị: Avatar + tên (title)
- [ ] Hiển thị: Ngày + category tag
- [ ] Divider
- [ ] Hiển thị: Tổng + Còn nợ (nợ highlight đỏ)
- [ ] Nút "Chi tiết" ở góc phải dưới

---

### 📋 TASK 6: Component ContractDetailDrawer
**Files cần tạo:**
- `src/components/contracts/ContractDetailDrawer.tsx`

**Yêu cầu:**
- [ ] Slide-in từ phải, width 480px trên tablet
- [ ] Full-width trên mobile
- [ ] Backdrop mờ
- [ ] Hiển thị đầy đủ thông tin như mockup 3.3
- [ ] Actions: Sửa, Thanh toán, Xóa

---

### 📋 TASK 7: Page tích hợp
**Files cần sửa:**
- `src/app/contracts/page.tsx` (hoặc đường dẫn tương ứng)

**Yêu cầu:**
- [ ] Compose các components trên
- [ ] Quản lý state: filters, selected contract
- [ ] Responsive: table ở `md:`, card ở `<md`

---

## 📦 7. TECH STACK ĐỀ XUẤT

```json
{
  "framework": "Next.js 14+ (App Router)",
  "language": "TypeScript",
  "styling": "Tailwind CSS + shadcn/ui",
  "icons": "lucide-react",
  "state": "Zustand hoặc React Query (nếu có API)",
  "form": "react-hook-form + zod (cho Create/Edit)",
  "date": "date-fns",
  "table": "@tanstack/react-table (optional, nếu cần sort/filter phức tạp)"
}
```

> **Lưu ý**: Nếu dự án đang dùng stack khác (Vue, Nuxt, Svelte...) thì báo lại để em điều chỉnh plan.

---

## ✅ 8. ACCEPTANCE CRITERIA TỔNG THỂ

- [ ] Bảng hiển thị đầy đủ cột trên iPad landscape, không bị cắt
- [ ] Touch target tối thiểu 44×44pt cho mọi nút
- [ ] Filter/search hoạt động mượt, có sticky bar
- [ ] Status badge phân biệt rõ 3 trạng thái bằng màu + icon
- [ ] Số tiền format chuẩn VNĐ (1.000.000 VNĐ)
- [ ] Ngày tháng format dd/mm/yyyy
- [ ] Trên mobile, layout chuyển sang card view, không vỡ
- [ ] Row expand/drawer mở chi tiết hợp đồng đầy đủ
- [ ] Có trạng thái loading/empty state
- [ ] Lighthouse score > 90 trên iPad

---

## 📤 9. PROMPT MẪU GỬI CHO CLAUDE/CODEX

```
Bạn là frontend engineer. Hãy implement trang Quản lý Hợp đồng cho ứng dụng Mood Studio.

TECH STACK:
- Next.js 14 App Router + TypeScript
- Tailwind CSS
- shadcn/ui (Button, Input, Badge, DropdownMenu, Sheet, Dialog)
- lucide-react (icons)
- date-fns (format date)

DỮ LIỆU MẪU:
Type Contract = {
  id: string;
  code: string;            // "HD-2026-001"
  customerName: string;    // "Hoàng - Vinh"
  customerPhone?: string;
  customerAvatar?: string;
  signedDate: string;      // ISO date
  category: 'studio' | 'wedding' | 'family' | 'other';
  totalAmount: number;     // VNĐ
  paidAmount: number;
  services: { name: string; price: number }[];
}

YÊU CẦU CHI TIẾT:
1. Đọc kỹ file DESIGN_PROPOSAL.md đính kèm
2. Tạo các components theo thứ tự TASK 1 → TASK 7
3. Dùng dữ liệu mock (10 hợp đồng) trong src/lib/mock-data.ts
4. Đảm bảo responsive: table ≥ md, card < md
5. Tuân thủ design tokens trong DESIGN_PROPOSAL.md mục 2
6. KHÔNG dùng icon font-awesome, chỉ dùng lucide-react
7. Mỗi component phải có file .stories.tsx hoặc demo trên trang

DELIVERABLES:
- Source code đầy đủ
- File demo chạy được: npm run dev → http://localhost:3000/contracts
- Không cần backend, dùng mock data
```

---

