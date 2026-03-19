# Plan: Contract Create Form — Visual Alignment with Stitch

**Created:** 2026-03-18 15:30
**Status:** 🟡 Planning
**Audit Report:** `docs/reports/audit_contract_create_visual_20260318.md`
**Stitch HTML:** `docs/stitch/create-contract-desktop.html`
**Stitch Mobile:** `docs/stitch/create-contract-mobile.html`

---

## Overview

Đồng bộ visual DNA của form `/contracts/create` với Stitch design, giữ nguyên
full-page layout (đúng V2 architecture). Chỉ sửa visual + thêm thiếu, KHÔNG
đổi layout architecture.

### Nguyên tắc Adopt:
- ✅ GIỮ full-page layout (tài liệu gốc + toàn bộ V2 pages)
- ✅ ADOPT gold accent section headers (#C9A96E border-left)
- ✅ ADOPT numbered sections (1. 2. 3.)
- ✅ ADOPT couple info cards (earth-tone variant)
- ✅ ADD "Lưu bản nháp" button
- ✅ ALIGN financial summary layout (right-aligned)
- ⚠️ DEFER Section 4 "Giao việc" → phase riêng sau
- ❌ SKIP modal container (phá đồng bộ V2)
- ❌ SKIP Material Symbols (dùng lucide-react per design-specs)

---

## Phases

| Phase | Name | Status | Files | Est |
|-------|------|--------|-------|-----|
| 01 | Section Headers + Gold Accent | ✅ Complete | 3 files | 15min |
| 02 | Customer Couple Cards | ✅ Complete | 2 files | 30min |
| 03 | Financial Summary Redesign | ✅ Complete | 2 files | 20min |
| 04 | FormActions + Save Draft | ✅ Complete | 3 files | 10min |
| 05 | SSOT Compliance Sweep | ✅ Complete | 2 files | 20min |
| 06 | Visual Verification | ✅ Complete | 0 files | 15min |

**Tổng:** ~1h50min | 6 phases | **✅ ALL DONE**

---

## Quick Commands
- Start Phase 1: `/code phase-01`
- Check progress: `/next`
