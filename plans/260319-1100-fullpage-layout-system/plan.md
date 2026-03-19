# Plan: Fullpage Layout System
Created: 2026-03-19T11:00
Status: 🟡 In Progress

## Context / Vấn đề
Trang `/contracts/create` (và `/contracts/[id]/edit`) đang render bên trong
`AppShell` → Header + Sidebar của app vẫn hiện → 2 header chồng nhau, sai Stitch design.

Stitch thiết kế `contracts/create` là **fullpage takeover**: không có AppShell, chỉ
có sticky header riêng của form.

Đồng thời trên desktop wide (1440px), content `max-w-4xl` để lại dead zone 2 bên
quá lớn → cần two-column layout để tận dụng màn hình.

## Brief đã chốt
- **Option D**: Route Group `(fullpage)` — Next.js convention chuẩn, zero runtime overhead
- **Option 2**: Two-column layout — left: form sections, right: sticky financial summary + actions
- **FullpageFormShell**: Shared component cho mọi fullpage form trong hệ thống

## Scope
| # | Deliverable | Files |
|---|-------------|-------|
| 1 | `(fullpage)/layout.tsx` | `app/(fullpage)/layout.tsx` |
| 2 | `FullpageFormShell` component | `components/layout/fullpage-form-shell.tsx` |
| 3 | Refactor ContractForm → two-column | `components/contracts/form/index.tsx` |
| 4 | Move routes vào `(fullpage)` | `app/(fullpage)/contracts/create/`, `app/(fullpage)/contracts/[id]/edit/` |
| 5 | Verify + cleanup | `app/(protected)/contracts/create/` (xóa), `FormActions.tsx` (adjust) |

## Luồng hai cột (Desktop ≥ lg)
```
┌──────────────────────────────────────────────────────────────┐
│ ← Quay lại danh sách                      HD-2026-0042      │ h-16 sticky
├──────────────────────────────┬───────────────────────────────┤
│   LEFT (flex-1, scrollable)  │   RIGHT (sticky, ~380px)      │
│                              │                               │
│  S1: Thông tin hợp đồng      │  💰 Tổng kết tài chính (S4)  │
│  S2: Khách hàng              │  💳 Thanh toán ban đầu (S5)   │
│  S3: Dịch vụ & sản phẩm      │  [Hủy] [Lưu nháp] [Tạo HĐ]  │
│  S6: Ghi chú                 │                               │
└──────────────────────────────┴───────────────────────────────┘
```

## Mobile (<lg) — fallback single column
```
S1 → S2 → S3 → S4 → S5 → S6
+ Fixed footer: [Hủy] · [Lưu nháp] · [Tạo hợp đồng]
```

## Container
- Desktop fullpage: `max-w-6xl` (1152px) thay `max-w-4xl` (896px)
- Header + Footer vẫn `max-w-6xl` đồng bộ

## Constraints
- ❌ Không inline style — dùng shared tokens
- ❌ Không break URL (`/contracts/create` vẫn là URL sau khi move)
- ❌ Không đụng AppShell / Header hiện tại
- ✅ Auth check vẫn đầy đủ trong `(fullpage)/layout.tsx`
- ✅ Mobile phải hoạt động đúng (single column + fixed footer)

## Phases

| Phase | Name | Status | Progress |
|-------|------|---------| --------|
| 01 | `(fullpage)` Route Group + Layout | ✅ Complete | 100% |
| 02 | `FullpageFormShell` Component | ✅ Complete | 100% |
| 03 | ContractForm Two-column Refactor | ✅ Complete | 100% |
| 04 | Move Routes + Cleanup | ✅ Complete | 100% |
| 05 | Verify Desktop + Mobile | ⬜ Pending | 0% |

## Quick Commands
- Start Phase 1: `/code phase-01`
- Check progress: `/next`
