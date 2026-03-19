# Plan: Split design-system.css
Created: 2026-03-19T14:14
Status: 🟡 In Progress

## Objective
`design-system.css` đang 1200+ lines → khó maintain.
Split thành các file nhỏ theo domain, không thay đổi bất kỳ CSS class nào.

## Strategy
- Tách từng section ra file riêng trong `app/styles/`
- `design-system.css` thay bằng `@import` tất cả
- Verify build sau mỗi phase → zero risk

## Safety Rules
- KHÔNG đổi tên class
- KHÔNG đổi thứ tự `@layer` (phải giữ đúng cascade)
- Verify `npm run build` sau mỗi phase
- Rollback ngay nếu fail

## File map (1203 lines → 7 files)

| Lines | Section | Target File |
|-------|---------|-------------|
| 1–100 | Utilities, typography | `styles/typography.css` |
| 100–350 | Cards, badges, buttons, nav | `styles/components.css` |
| 350–460 | `@layer base`: inputs, forms | `styles/forms.css` |
| 460–580 | Form sections, tables, modals | `styles/layout.css` |
| 580–720 | Radix Select System | `styles/select.css` |
| 720–1000 | Detail page, workflow, stepper | `styles/pages.css` |
| 1000–1203 | Service colors, mobile, utilities | `styles/utilities.css` |

## Phases

| Phase | Name | Status | Progress |
|-------|------|--------|----------|
| 01 | Setup folder + typography | ⬜ Pending | 0% |
| 02 | Components (cards, badges, buttons) | ⬜ Pending | 0% |
| 03 | Forms (@layer base) | ⬜ Pending | 0% |
| 04 | Layout (form sections, tables) | ⬜ Pending | 0% |
| 05 | Select system (Radix) | ⬜ Pending | 0% |
| 06 | Pages (detail, stepper, workflow) | ⬜ Pending | 0% |
| 07 | Utilities + finalize design-system.css | ⬜ Pending | 0% |

## Quick Commands
- Start: `/code p1`
- Continue: `/code p2` ... `/code p7`
