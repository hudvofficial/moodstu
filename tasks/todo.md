# Plan: CSS Architecture Restructuring (Standardization)
Status: 🟡 Planning Approved
Created: 2026-04-01

## Mở Đầu (The Why)
Sau audit toàn diện, hệ thống CSS hiện tại đang gặp 3 vấn đề chí mạng:
1. **Typography overrides Color:** Typography classes hardcode `color`, khiến utility classes (như `text-interactive-light`) bị vô hiệu hóa.
2. **Monolithic Files:** `components.css` và `pages.css` quá lớn (~13KB/file), gây khó khăn cho bảo trì.
3. **Cascade Conflict:** Thứ tự import chưa tối ưu, utilities load trước typography.

Mục tiêu: Tách 6 file cũ -> 15 file chuyên biệt, xóa color khỏi typography, đưa utilities xuống cuối.

---

## Các Giai Đoạn (Phases)

| Phase | Tên Phase | Mô tả công việc (What) | Status |
|---|---|---|---|
| **Phase 01** | **Foundation & Component Splitting** | Tạo 12 file mới (`theme.css`, `base.css`, `buttons.css`, `cards.css`, `badges.css`, `modals.css`, `dropdowns.css`, `tabs.css`, `animations.css`, `breadcrumb.css`, `tables.css`, `layout.css`). Di chuyển CSS từ files cũ sang. | ✅ Complete |
| **Phase 02** | **Typography & Utilities Refactor** | Xóa `color` khỏi tất cả typography classes. Di chuyển các rule không phải utility từ `utilities.css` sang đúng chỗ. | ⏳ Pending |
| **Phase 03** | **Architecture Index Update** | Cập nhật `design-system.css` với thứ tự import mới (Foundation -> Typography -> Components -> Utilities). | ⏳ Pending |
| **Phase 04** | **Cleanup & Optimization** | Xóa bỏ `components.css` và `pages.css` sau khi đã migrate hết. Dọn dẹp duplicate comments. | ⏳ Pending |
| **Phase 05** | **Verification Gate** | `npm run build` + Visual Audit trên 5 module core (Dashboard, Contracts, Services, Employees, Inventory). | ⏳ Pending |

---

## Quick Commands
👉 Bước tiếp theo: **`/code phase-01`** (Bắt đầu tách file và xây dựng nền tảng mới).
