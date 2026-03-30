# Audit Report - 30/03/2026 (Services CSS Architecture)

## Summary
- 🔴 Critical Architecture Mismatches: 3
- 🟡 Components Needs Refactoring: 2
- 🟢 UX/UI Continuity Issues: 1

## 🔴 Critical Issues (Sai lệch so với chuẩn /contracts)
1. **Header Layout Mismatch (Cấu trúc đầu trang)**
   - **Tình trạng:** `/services` dùng cụm `<h1 class="text-h2">` + `<button>` rời rạc, bên dưới lại gắn `<ServiceStatsBar>`.
   - **Chuẩn `/contracts`:** Toàn bộ Header phải được gom vào một thẻ Card chung `bg-bg-card rounded-xl shadow-xs py-3 px-5`, bao gồm `CompactStats` bên trái và nút `Tạo mới` bên phải. Không dùng thẻ `<h1>` cứng ở trang list.

2. **Mobile CTA Missing (Thiếu FAB)**
   - **Tình trạng:** `/services` dùng nút thêm ẩn text (`hidden sm:inline`) lơ lửng ở Header trên giao diện Mobile. Cực kỳ khó bấm.
   - **Chuẩn `/contracts`:** Bắt buộc dùng Component `<FAB label="Thêm dịch vụ" />` lอย lửng ở góc dưới phải màn hình cho Mobile. Trên Desktop dùng nút `.btn-primary` trong Header Card.

3. **Dirty Filter & Layout Logic (Bộ lọc tự chế)**
   - **Tình trạng:** `service-filters.tsx` tự code tay hệ thống tab (dùng `map` render ra các button `.tab-pill`), tự code Search bar với class rác như `w-4.5`, `text-sm`, `icon-btn`. Layout trộn lẫn Mobile + Desktop trong một nùi JSX.
   - **Chuẩn `/contracts`:** Phân tách rõ ràng:
     - Mobile: `<div className="lg:hidden"><TabsFilter variant="pills" /> <SelectPill /></div>`
     - Desktop: `<div className="hidden lg:flex"><TabsFilter /> <DropdownFilters /></div>`
   - *Lưu ý:* Cần map Categories vào chuẩn data truyền cho `<TabsFilter>`.

## 🟡 Warnings (Vấn đề Code Smell)
1. **Search Bar Redundancy:** 
   Tại `service-filters.tsx`, ô Search di động ẩn hiện manual. Cần đóng gói Search Bar thành một component nhất quán hoặc tái sử dụng chuẩn SSOT đã có thay vì viết chay thẻ `<input>` với full Tailwind class.
2. **Hardcoded Strings & Icons:** 
   Các icons (List, Grid) và logic đổi ViewMode đang set cứng class `p-1.5 rounded-md`.

## Next Steps
Báo cáo lại cho người dùng theo menu.
