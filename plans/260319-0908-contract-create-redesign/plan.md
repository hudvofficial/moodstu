# Plan: Contract Create Page — UI Redesign (Desktop + Mobile)

**Created:** 2026-03-19 09:08
**Updated:** 2026-03-19 09:12  
**Status:** 🟡 Chờ duyệt

## Overview

Redesign trang `/contracts/create` theo Stitch mockups — Desktop + Mobile Premium.
**100% UI-only** — không thay đổi logic, hooks, API, hay database.

## Stitch Reference

| View | Screen ID |
|------|-----------|
| Desktop 1440px | `fef83c22263343d1a01919232d5398b2` |
| Mobile 375px Premium | `ff4733fd5c184da4b14279ad1a95c1e2` |

## Gap Analysis — Code Hiện Tại vs Stitch

### ✅ Đã OK (Không cần sửa)

| Component | Desktop | Mobile | Lý do |
|-----------|---------|--------|-------|
| S2 Customer Search | ✅ | ✅ | Search bar + dropdown + "Tạo mới" OK |
| S2 Couple Cards | ✅ side-by-side | ✅ stacked | `sm:grid-cols-2` → auto stacked mobile |
| S2 Couple Fields | ✅ 2-col + 3-col | ✅ same | `grid-cols-2`, `grid-cols-3` OK |
| S3 Items | ✅ Table | ✅ Card list | `hidden sm:block` + `sm:hidden` OK |
| S3 Subtotal | ✅ | ✅ | Card flush OK |
| S4 Financial | ✅ | ✅ | Toggle VNĐ/% + total orange OK |
| S5 Payment | ✅ 2×2 grid | ✅ stacked | `sm:grid-cols-2` OK |
| S6 Notes | ✅ | ✅ | Textarea OK |

### ❌ Cần Sửa (Gap)

| # | Component | Gap | Severity |
|---|-----------|-----|----------|
| 1 | **Container width** | `max-w-3xl` → `max-w-4xl` | Desktop |
| 2 | **Header** | Thiếu breadcrumb, subtitle | Desktop + Mobile |
| 3 | **S1 Info Grid** | Mobile 1-col → cần 2-col cho GD+DV | Mobile |
| 4 | **Footer Actions** | Mobile: 3 nút inline → CTA full-width stack | Mobile |

## Phases

| Phase | Name | Files | Desktop Changes | Mobile Changes |
|-------|------|-------|----------------|----------------|
| **01** | Header + Layout | `index.tsx` | ✅ Breadcrumb, subtitle, max-w-4xl, gộp badge | ✅ Same — stacks naturally |
| **02** | S1 Info Grid | `ContractInfoSection.tsx` | ❌ No change (3-col OK) | ✅ 2-col cho Loại GD + Loại DV |
| **03** | Footer Actions | `FormActions.tsx` | ❌ No change (inline OK) | ✅ Full-width CTA + "Hủy · Lưu nháp" row |

## Scope — CHỈ SỬA UI

> [!IMPORTANT]
> **BẢO TỒN 100%:**
> - Tất cả hooks (useContractForm, useContractFinancials, etc.)
> - Tất cả business logic (couple fields, payment conditional, etc.)
> - Tất cả modals (ItemModal, CreateServiceModal, CustomerFormModal)
> - Tất cả API calls và data flow
> - Sections 2-6 không cần sửa layout

**Tổng:** 3 phases | 3 files | ~20 phút | Risk: THẤP

## Quick Commands
- Start: `/code phase-01`
- Check: `/next`
