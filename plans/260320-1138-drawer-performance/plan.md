# Plan: Contract Drawer V2 — Best of Both Worlds
Created: 2026-03-20T12:14
Status: 🟡 In Progress
Mockup: drawer_v2_mockup (approved)

## Overview
Redesign drawer để kết hợp V1's UX + V2's data.  
Giữ nguyên 0ms data pattern (đã build phase 01-05).  
Chỉ thay đổi UI layout — KHÔNG thay đổi data flow.

## Phases

| Phase | Name | Status | Items |
|-------|------|--------|-------|
| 01-05 | 0ms Data Pattern | ✅ Done | 8 |
| **06** | **Drawer UI Redesign** | ⬜ Pending | 5 |
| **07** | **Build verify** | ⬜ Pending | 1 |

---

## Phase 06: Drawer UI Redesign (5 items)

Ref mockup: drawer_v2_mockup

### 6.1. Header: Status badge IN header
**File:** `components/contracts/contract-drawer.tsx`

Thay đổi:
- Đưa status badge lên cạnh title trong header bar
- Thêm edit icon vào headerRight (cạnh print)
- Bỏ status badge riêng biệt trong body

```
TRƯỚC: [📄 HĐ-2026-0016] [🖨️] [×]
        ● Đang thực hiện     ← badge riêng 1 dòng

SAU:   [📄 HĐ-2026-0016 ● Đang thực hiện] [✏️] [🖨️] [×]
```

### 6.2. Customer section: Avatar + compact info
**File:** `components/contracts/contract-drawer.tsx`

Thay đổi:
- Thêm avatar circle (chữ cái đầu) clickable → link to detail
- Phone + address trên cùng hàng compact
- Dịch vụ + Ngày làm: 2 pill cards ngang (thay vì list dọc)

```
TRƯỚC:                          SAU:
👤 Tên KH                      [N] Nguyễn Văn An  →
📱 0901...                      📍 123 Nguyễn Huệ  📱 0901...
📸 Studio                       [📸 Studio] [📅 15/04]
📅 Ngày làm: 15/04
```

### 6.3. Finance section: Gộp payment schedule vào
**File:** `components/contracts/contract-drawer.tsx`

Thay đổi:
- Giữ 3-column + progress bar (hiện tại đã có)
- Thêm payment schedule inline bên dưới progress bar
- Bỏ section "Lịch thanh toán" riêng biệt

```
TRƯỚC:                          SAU:
[Section: Tài chính]            [Section: Thanh toán]
  Tổng | Đã thu | Còn lại        Tổng | Đã thu | Còn lại
  ████████░░ 85%                  ████████░░ 85%
                                  ✓ Đợt 1: 20tr
[Section: Lịch thanh toán]        ✓ Đợt 2: 22.5tr
  ✓ Đợt 1: 20tr                  ○ Đợt 3: 7.5tr (hạn 20/05)
  ✓ Đợt 2: 22.5tr
  ○ Đợt 3: 7.5tr
```

### 6.4. Operations: Tabs thay vì 3 sections cuộn
**File:** `components/contracts/contract-drawer.tsx`

Thay đổi:
- Tạo tabbed UI với 3 tabs: 📅 Sự kiện | ✅ Checklist | 👥 Nhân sự
- Mỗi tab hiện component tương ứng
- Default tab: Sự kiện
- Giảm scroll ~60% (3 sections → 1 tabbed section)

```
TRƯỚC (scroll dài):             SAU (tabs compact):
[Section: Events]               [📅 Sự kiện] [✅ CL] [👥 NS]
  ...                           ┌──────────────────────┐
[Section: Checklist]            │ Event content here   │
  ...                           └──────────────────────┘
[Section: Nhân sự]
  ...
```

### 6.5. Footer actions giữ nguyên
Không thay đổi — "Xem chi tiết" + "Sửa" đã đúng.

---

## Phase 07: Build Verify (1 item)
- `npm run build` → Exit code 0
- Manual test: drawer layout khớp mockup

---

## Quick Commands
- Start: `/code p06`
