# 🎯 KẾ HOẠCH DỰNG WEBAPP MOOD STUDIO

## 📋 TỔNG QUAN DỰ ÁN

**Mục tiêu:** Xây dựng hệ thống quản lý Studio chụp ảnh cưới hoàn chỉnh

**Tech Stack:**
- ⚡ **Next.js 14** (App Router) - Framework
- 🔷 **TypeScript** - Type safety
- 🗄️ **Supabase** - Database + Auth + Storage
- 🎨 **Tailwind CSS v4** - @theme tokens
- 📊 **Custom Components** - Coffee pattern (Modal, CurrencyInput, TabsFilter)
- 📈 **Recharts** - Charts & Analytics
- 🔐 **Supabase Auth** - Authentication
- 📱 **Responsive** - Desktop first (theo yêu cầu)

---

## 🏗️ CẤU TRÚC DỰ ÁN

```
0Moodstudio/
├── app/                          # Next.js App Router
│   ├── (auth)/                   # Auth routes
│   │   ├── login/
│   │   └── layout.tsx
│   ├── (dashboard)/              # Main app routes
│   │   ├── dashboard/            # Trang chủ
│   │   ├── contracts/            # Quản lý hợp đồng
│   │   │   ├── page.tsx
│   │   │   ├── create/
│   │   │   └── [id]/edit/
│   │   ├── customers/            # Quản lý khách hàng
│   │   ├── services/             # Quản lý dịch vụ
│   │   ├── employees/            # Quản lý nhân viên
│   │   ├── attendance/           # Chấm công
│   │   ├── schedules/            # Lịch làm việc
│   │   ├── finance/              # Tài chính
│   │   │   ├── receipts/         # Phiếu thu
│   │   │   ├── expenses/         # Phiếu chi
│   │   │   └── reports/          # Báo cáo
│   │   ├── crm/                  # CRM
│   │   ├── settings/             # Cài đặt
│   │   └── layout.tsx
│   ├── api/                      # API routes
│   │   ├── contracts/
│   │   ├── customers/
│   │   └── ...
│   ├── layout.tsx
│   └── page.tsx
├── components/                   # React components
│   ├── ui/                       # Shadcn components
│   ├── layout/                   # Layout components
│   │   ├── Sidebar.tsx
│   │   ├── Header.tsx
│   │   └── Breadcrumb.tsx
│   ├── contracts/                # Contract components
│   ├── customers/                # Customer components
│   └── shared/                   # Shared components
├── lib/                          # Utilities
│   ├── supabase/
│   │   ├── client.ts             # Supabase client
│   │   ├── server.ts             # Server client
│   │   └── types.ts              # Database types
│   ├── utils.ts                  # Helper functions
│   └── constants.ts              # Constants
├── types/                        # TypeScript types
│   └── database.types.ts         # Auto-generated
├── hooks/                        # Custom hooks
│   ├── useContracts.ts
│   ├── useCustomers.ts
│   └── useAuth.ts
├── public/                       # Static files
├── .env.local                    # Environment variables
├── next.config.js
├── tailwind.config.ts
├── tsconfig.json
└── package.json
```

---

## 🎨 THIẾT KẾ GIAO DIỆN

### 1. **Layout chính**
```
┌─────────────────────────────────────────────────────┐
│  Header: Logo | Search | Notifications | User       │
├──────────┬──────────────────────────────────────────┤
│          │                                           │
│ Sidebar  │          Main Content                    │
│          │                                           │
│ - Dashboard                                          │
│ - Hợp đồng                                           │
│ - Khách hàng                                         │
│ - Dịch vụ                                            │
│ - Nhân viên                                          │
│ - Chấm công                                          │
│ - Lịch                                               │
│ - Tài chính                                          │
│ - CRM                                                │
│ - Cài đặt                                            │
│          │                                           │
└──────────┴──────────────────────────────────────────┘
```

Header/footer, typography, and spacing tokens are shared across desktop and mobile so MoodStudio feels like one cohesive professional app. Desktop retains the fixed header + tiered sidebar, whereas mobile relies on a drawer/bottom navigation (5 tabs) paired with a FAB and shared footer; all navigation, cards, and tables reuse the same tokens for font, spacing, and color hierarchy so the transition between breakpoints feels seamless.

### 2. **Màu sắc chủ đạo (V2 Earth-Tone)**
- Primary & CTA: `#8B5E3C` (Earth brown) – anchors CTAs, navigation highlights.
- Dark: `#3D2B1F` – headings, strong text.
- Accent: `#C9A96E` (Gold) – premium highlights.
- Light: `#A67C5B` – secondary actions.
- Surface system: ~60% warm base (`#FAF7F2`), 30% white cards (`#FFFFFF`), 10% accent. Sidebar: `#F5EFE6`.
- Status: success `#4CAF50`, warning `#FF9800`, error `#F44336`, info `#2196F3`.
- Borders: `#E8DDD0` (main), `#F0E8DB` (light).
- Text: `#3D2B1F` (primary), `#8B7355` (secondary), `#B8A898` (muted).
- Accessibility: enforce APCA/WCAG 3.0 contrast. Font: Inter (Vietnamese).
- Component tokens: radius (6/10/14/20px), shadows earth-brown tinted, spacing 4-8-12-16-24-32.

### 2a. **Stitch design brief**
+- Reimagine MoodStudio as a unified admin console with V2 earth-tone design system (#8B5E3C primary, #FAF7F2 base, #F5EFE6 sidebar). Accessibility (APCA/WCAG 3.0) and the 60-30-10 surface balance must guide every screen.
+- Layout & navigation: fixed header (logo/search/notifications/profile) + collapsible sidebar on desktop; mobile uses bottom navigation (5 tabs) plus a FAB. Components use Coffee pattern (custom, lightweight, < 80 lines each). Font: Inter.
+- Modules & milestone flows (describe empty/loading/data states): Dashboard (stat cards, revenue & contract charts, todo list, weekly schedule); Contracts (search/filter/paginate list, create/edit forms, detail/print views, payment tracker, approval/renewal timeline); Customers (list/detail, care timeline, export); Services (catalog/pricing/inventory, service selector); Employees/HR (profiles, permissions, payroll, roster); Attendance/Schedules (kanban/day/week views, shift assignments, reminders, mobile agenda cards); Finance (receipts/expenses/reports/budgets with tables/charts); CRM (leads/customers, interaction log); Settings (company/profile, roles, theming, integrations). Highlight milestone flows for contract lifecycle, payment tracking, customer care follow-ups, and scheduling loops.
+- Data & behavior: emphasize SWR instant transitions (skeletons on cold load, cache hit renders, background revalidation), responsive/resizable tables and charts, accessible modals, and drill-down detail/edit screens. Mobile views should gracefully degrade into cards/bottom sheets while reusing the same tokens.
+- Components to highlight: stat cards, revenue/contract charts, searchable/filterable tables, contract form with progress badges, service selector, payment tracker timeline, schedule timeline/kanban board, bottom navigation, FAB, responsive cards that expand to full-screen modals on mobile, and skeleton loaders.

---

## 📦 CÁC MODULE CHÍNH

### **1. DASHBOARD (Trang chủ)**
**Chức năng:**
- Thống kê tổng quan (Doanh thu, Hợp đồng, Khách hàng)
- Biểu đồ doanh thu theo tháng
- Hợp đồng gần đây
- Công việc cần làm hôm nay
- Lịch làm việc tuần này

**Components:**
- `StatCard` - Card thống kê
- `RevenueChart` - Biểu đồ doanh thu
- `RecentContracts` - Hợp đồng gần đây
- `TodoList` - Danh sách công việc
- `WeeklySchedule` - Lịch tuần

---

### **2. HỢP ĐỒNG**
**Chức năng:**
- Danh sách hợp đồng (filter, search, pagination)
- Tạo hợp đồng mới
- Xem chi tiết hợp đồng
- Sửa hợp đồng
- In hợp đồng PDF
- Theo dõi thanh toán
- Quản lý tiến độ

**Pages:**
- `/contracts` - Danh sách
- `/contracts/create` - Tạo mới
- `/contracts/[id]` - Chi tiết
- `/contracts/[id]/edit` - Sửa

**Components:**
- `ContractList` - Bảng danh sách
- `ContractForm` - Form tạo/sửa
- `ContractDetail` - Chi tiết
- `PaymentTracker` - Theo dõi thanh toán
- `ServiceSelector` - Chọn dịch vụ

---

### **3. KHÁCH HÀNG**
**Chức năng:**
- Danh sách khách hàng
- Thêm/Sửa/Xóa khách hàng
- Xem lịch sử hợp đồng
- Ghi chú chăm sóc khách hàng
- Export danh sách

**Pages:**
- `/customers` - Danh sách
- `/customers/create` - Tạo mới
- `/customers/[id]` - Chi tiết

---

### **4. DỊCH VỤ**
**Chức năng:**
- Quản lý danh mục dịch vụ
- Quản lý giá dịch vụ
- Quản lý trang phục/sản phẩm
- Quản lý kho

**Pages:**
- `/services` - Danh sách
- `/services/create` - Tạo mới
- `/services/[id]/edit` - Sửa

---

### **5. NHÂN VIÊN**
**Chức năng:**
- Quản lý nhân viên
- Phân quyền
- Quản lý ca làm việc
- Xem lịch sử công việc
- Tính lương

**Pages:**
- `/employees` - Danh sách
- `/employees/create` - Tạo mới
- `/employees/[id]` - Chi tiết

---

### **6. CHẤM CÔNG**
**Chức năng:**
- Chấm công hàng ngày
- Xem bảng công tháng
- Tính công
- Export bảng công

**Pages:**
- `/attendance` - Chấm công
- `/attendance/summary` - Tổng hợp

---

### **7. LỊCH LÀM VIỆC**
**Chức năng:**
- Xem lịch theo ngày/tuần/tháng
- Thêm lịch hẹn
- Gán nhân viên
- Nhắc nhở

**Pages:**
- `/schedules` - Lịch
- `/schedules/create` - Tạo lịch

---

### **8. TÀI CHÍNH**
**Chức năng:**
- Quản lý phiếu thu
- Quản lý phiếu chi
- Báo cáo doanh thu
- Báo cáo chi phí
- Báo cáo lợi nhuận
- Tính điểm hòa vốn

**Pages:**
- `/finance/receipts` - Phiếu thu
- `/finance/expenses` - Phiếu chi
- `/finance/reports` - Báo cáo

---

### **9. CRM**
**Chức năng:**
- Quản lý khách hàng tiềm năng
- Theo dõi chăm sóc khách hàng
- Ghi chú tư vấn
- Chuyển đổi thành khách hàng

**Pages:**
- `/crm` - Danh sách leads
- `/crm/[id]` - Chi tiết lead

---

### **10. CÀI ĐẶT**
**Chức năng:**
- Thông tin studio
- Cài đặt hệ thống
- Quản lý tài khoản
- Backup/Restore

**Pages:**
- `/settings` - Cài đặt chung
- `/settings/profile` - Thông tin cá nhân
- `/settings/studio` - Thông tin studio

---

## 🔐 AUTHENTICATION & AUTHORIZATION

### **Authentication (Supabase Auth):**
- Email/Password login
- Remember me
- Forgot password
- Session management

### **Authorization (RLS):**
- **Admin:** Full access
- **Manager:** Xem tất cả, sửa một số
- **Staff:** Xem và sửa công việc của mình
- **Viewer:** Chỉ xem

---

## 📊 DATABASE INTEGRATION

### **Supabase Client Setup:**
```typescript
// lib/supabase/client.ts
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { Database } from '@/types/database.types'

export const supabase = createClientComponentClient<Database>()
```

### **Server Actions:**
```typescript
// app/actions/contracts.ts
'use server'

export async function createContract(data: ContractInsert) {
  const supabase = createServerComponentClient()
  const { data: contract, error } = await supabase
    .from('contracts')
    .insert(data)
    .select()
    .single()
  
  return { contract, error }
}
```

---

## 🎯 ROADMAP PHÁT TRIỂN

### **Phase 1: Setup & Core (1-2 ngày)**
- ✅ Setup Next.js project
- ✅ Setup Supabase connection
- ✅ Generate TypeScript types
- ✅ Setup Tailwind + Shadcn
- ✅ Create layout (Sidebar, Header)
- ✅ Setup authentication

### **Phase 2: Core Modules (3-4 ngày)**
- ✅ Dashboard
- ✅ Contracts (CRUD)
- ✅ Customers (CRUD)
- ✅ Services (CRUD)

### **Phase 3: Advanced Features (2-3 ngày)**
- ✅ Employees & Attendance
- ✅ Schedules
- ✅ Finance (Receipts, Expenses)
- ✅ Reports

### **Phase 4: Polish & Deploy (1-2 ngày)**
- ✅ CRM
- ✅ Settings
- ✅ Testing
- ✅ Deploy to Vercel

---

## 🚀 CÁCH TRIỂN KHAI

### **Bước 1: Tạo project**
```bash
npx create-next-app@latest mood-studio-webapp --typescript --tailwind --app
cd mood-studio-webapp
```

### **Bước 2: Install dependencies**
```bash
npm install @supabase/supabase-js @supabase/auth-helpers-nextjs
npm install @radix-ui/react-* class-variance-authority clsx tailwind-merge
npm install lucide-react recharts date-fns
npm install -D @types/node
```

### **Bước 3: Setup Supabase**
```bash
# .env.local
NEXT_PUBLIC_SUPABASE_URL=your-project-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

### **Bước 4: Generate types**
```bash
npx supabase gen types typescript --project-id your-project-id > types/database.types.ts
```

### **Bước 5: Start development**
```bash
npm run dev
```

---

## 📝 CHECKLIST

### **Setup:**
- [ ] Next.js project created
- [ ] Supabase connected
- [ ] TypeScript types generated
- [ ] Tailwind configured
- [ ] Shadcn/ui installed
- [ ] Layout components created

### **Authentication:**
- [ ] Login page
- [ ] Logout functionality
- [ ] Protected routes
- [ ] RLS policies

### **Core Features:**
- [ ] Dashboard
- [ ] Contracts CRUD
- [ ] Customers CRUD
- [ ] Services CRUD
- [ ] Employees CRUD
- [ ] Attendance
- [ ] Schedules
- [ ] Finance
- [ ] CRM
- [ ] Settings

### **Polish:**
- [ ] Responsive design
- [ ] Loading states
- [ ] Error handling
- [ ] Toast notifications
- [ ] Form validation
- [ ] Search & Filter
- [ ] Pagination
- [ ] Export PDF/Excel

---

## 💡 GỢI Ý BỔ SUNG

1. **Real-time updates** - Supabase Realtime cho notifications
2. **File upload** - Supabase Storage cho ảnh hợp đồng
3. **Email notifications** - Resend hoặc SendGrid
4. **Print templates** - React-to-print cho in hợp đồng
5. **Mobile app** - React Native sau này
6. **Analytics** - Google Analytics
7. **Backup** - Tự động backup database

---

## 🎉 KẾT QUẢ MONG ĐỢI

Một webapp hoàn chỉnh với:
- ✅ Giao diện đẹp, chuyên nghiệp
- ✅ Tốc độ nhanh (Next.js SSR)
- ✅ Bảo mật cao (Supabase RLS)
- ✅ Type-safe (TypeScript)
- ✅ Responsive (Desktop first)
- ✅ Dễ maintain & scale

**Thời gian ước tính:** 7-10 ngày làm việc
