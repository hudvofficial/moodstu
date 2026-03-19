# Plan: Typography SSOT Fix — Critical
**Tạo:** 2026-03-19 15:44
**Status:** 🟡 Pending

## Mục tiêu
Thay thế 6 raw Tailwind font-size bằng SSOT tokens từ `typography.css`.
Không thay đổi visual output — chỉ chuẩn hóa class theo SSOT.

## Files cần sửa

| Phase | File | Line | Thay đổi |
|-------|------|------|---------|
| A1 | `ContractFinancialSummary.tsx` | 108 | `font-bold` → `text-body font-bold` |
| A2 | `ContractFinancialSummary.tsx` | 109 | `text-xl font-black text-interactive` → `text-amount text-interactive` |
| A3 | `financial-dashboard.tsx` | 51 | `text-2xl font-bold text-text-primary` → `text-amount text-text-primary` |
| A4 | `summary-card.tsx` | 39 | `text-xl font-bold text-text-primary` → `text-h2 text-text-primary` |
| A5 | `compact-stats.tsx` | 86 | `text-xl font-bold ${iconColor}` → `text-amount ${iconColor}` |
| A6 | `compact-stats.tsx` | 103 | `text-base font-bold text-text-main` → `text-body font-bold text-text-main` |

## Không làm
- Không thay đổi logic, behavior, màu sắc
- Không đụng Warning/Info tier (text-xs, text-sm) — để sau

## Verify sau fix
- Browser: visual không thay đổi
- No build errors
