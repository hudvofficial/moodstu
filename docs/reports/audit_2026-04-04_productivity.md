# Audit Report — /productivity Module

**Date:** 2026-04-04 | **Scope:** Performance Focus + SSOT Compliance

## Summary

- 🔴 Critical Issues: 4
- 🟡 Warnings: 3
- 🟢 Suggestions: 3

---

## 📸 UI Screenshot

![Productivity Mobile UI hiện tại](file:///C:/Users/Admin/.gemini/antigravity/brain/19a79576-aeaf-450e-a63e-291eabfb5bdf/productivity_page_full_1775267982534.png)

---

## Stitch Reference

Stitch project `3342062284752503492` có 2 screens liên quan:

- **Mobile**: `Mood Studio Mobile Team Task Board` (screen `42fcdc17`)
- **Desktop**: `Mood Studio Team Task Board Desktop` (screen `16672d36`)

> [!NOTE]
> Không có Stitch screen riêng cho /productivity. 2 screens "Team Task Board" ở trên là reference gần nhất.

---

## 🔴 Critical Issues (Phải sửa ngay)

### C1: Mobile progress bar KHÔNG dùng SSOT token

- **File:** `components/productivity/productivity-mobile-cards.tsx` L24-41
- **Vấn đề:** `WorkloadBar` component viết inline classes thay vì dùng SSOT `progress-track` + `progress-fill` từ `typography.css`
- **Code hiện tại:**

```tsx
<div className="h-1 flex-1 rounded-full bg-border/30 overflow-hidden">
  <div
    className={`h-full rounded-full transition-all ${color}`}
    style={{ width: `${pct}%` }}
  />
</div>
```

- **Chuẩn SSOT (team-table đã dùng đúng tại L189-197):**

```tsx
<div className="progress-track h-2">
  <div
    className="progress-fill"
    style={{ width: `${pct}%`, background: color }}
  />
</div>
```

- **Hậu quả:** Duplicated styling, nhất quán visual giữa mobile vs desktop bị lệch (h-1 vs h-2, border/30 vs bg-hover)

### C2: Header title hiển thị "Năng suất ekip" — lệch so với Stitch "Team Task Board"

- **File:** `lib/navigation.ts` L61
- **Vấn đề:** User phản hồi header /productivity "sai trầm trọng". Hiện tại label = `"Năng suất ekip"`, description = `"Theo dõi hiệu suất đội ngũ"`. Stitch screens đặt tên "Team Task Board"
- **Root cause:** Header lấy từ `navigation.ts` SSOT (đúng cơ chế), nhưng **nội dung label** chưa đồng bộ với plan/Stitch context
- **Cần user xác nhận:** Label nào là đúng? "Năng suất ekip" hay "Quản lý công việc" hay label khác?

### C3: `gap-3!` important override trên main-container

- **File:** `productivity-page-client.tsx` L174
- **Vấn đề:** `className="main-container gap-3!"` — dùng `!important` override gap mặc định của `main-container` SSOT (16px mobile, 24px desktop)
- **Hậu quả:** Phá vỡ responsive spacing system. Mobile gap bị giảm từ 16px → 12px. Desktop gap giảm từ 24px → 12px — lệch chuẩn toàn hệ thống

### C4: `productivity-detail-content.tsx` inline `style={{ background }}` cho progress bar trong team-table

- **File:** `productivity-team-table.tsx` L192-195
- **Vấn đề:** Progress fill dùng `style={{ background: getProgressColor(...) }}` override SSOT `progress-fill` background
- **Phân loại:** Đây là dynamic value nên inline style cho `width` là chấp nhận (Lesson #56 exception). Tuy nhiên `background` cũng inline thay vì dùng data-attribute + CSS variant
- **Giải pháp gợi ý:** Dùng CSS class variant `.progress-fill-success`, `.progress-fill-warning`, `.progress-fill-error` (đã có `.progress-fill-interactive` trong SSOT)

---

## 🟡 Warnings (Nên sửa)

### W1: Period control desktop layout không dùng `card-base`

- **File:** `productivity-toolbar.tsx` L48
- **Vấn đề:** Desktop dùng `lg:card-base` — responsive prefix trên custom CSS class **không hoạt động** (Lesson #55, #57)
- **Code:** `className="flex flex-wrap items-center gap-3 lg:card-base lg:flex-row lg:justify-between lg:px-4 lg:py-4"`
- **Hậu quả:** Desktop không có card background + shadow, mobile không có card wrapper → visual inconsistency

### W2: `text-tiny` không phải SSOT token

- **File:** `productivity-team-table.tsx` L185
- **Vấn đề:** `className="text-tiny font-semibold text-text-muted"` — `text-tiny` không thuộc SSOT typography scale
- **SSOT tokens có:** `text-display`, `text-h1`..`text-h3`, `text-body`, `text-body-sm`, `text-caption`, `text-label`, `text-overline`, `text-amount`
- **Fix:** Dùng `text-caption` thay thế

### W3: `productivity-detail-content.tsx` gần limit 250 lines (226 lines)

- **File:** `productivity-detail-content.tsx`
- **Vấn đề:** 226/250 lines — gần ngưỡng max file, nên plan tách trước khi phình thêm

---

## 🟢 Suggestions (Tùy chọn)

### S1: Mobile cards entrance animation — 5 items hard limit

- **File:** `productivity-mobile-cards.tsx` L59-60
- **Code:** `const entranceClass = index < 5 ? \`entrance entrance-${index + 1}\` : "";`
- **Gợi ý:** OK pattern, nhưng nếu danh sách > 20 nhân sự sẽ có batch lớn items không animated. Xem xét `IntersectionObserver` lazy animation

### S2: SWR realtime bindings — 5 channels cho 1 page

- **File:** `productivity-realtime.tsx`
- **Gợi ý:** Đang subscribe 5 Supabase channels (work_tasks, employees, contracts, customers, contract_events). Các channel `contracts`, `customers`, `contract_events` chỉ cần khi drawer open — đã làm đúng conditional. OK.

### S3: Thiếu `memo()` cho `EmployeeCard`

- **File:** `productivity-mobile-cards.tsx` L45
- **Gợi ý:** `EmployeeCard` là list item render trong `.map()`, nên wrap `memo()` để skip unnecessary re-renders khi parent state changes

---

## Next Steps

Anh muốn làm gì tiếp theo?

1️⃣ Xem báo cáo chi tiết trước
2️⃣ Sửa lỗi Critical ngay (dùng /code)
3️⃣ Dọn dẹp code smell (dùng /refactor)
4️⃣ Bỏ qua, lưu báo cáo vào /save-brain
5️⃣ 🔧 FIX ALL - Tự động sửa TẤT CẢ lỗi có thể sửa

Gõ số (1-5) để chọn:
