# Phase 04: Move Routes + Cleanup
Status: ⬜ Pending
Dependencies: Phase 03

## Objective
Di chuyển route pages từ `(protected)/contracts/` vào `(fullpage)/contracts/`
và xóa các file cũ để tránh duplicate route conflict.

## Tasks

### Tạo mới (copy + adjust)
- [ ] Tạo `app/(fullpage)/contracts/create/page.tsx`
  - Copy từ `app/(protected)/contracts/create/page.tsx`
  - Bỏ wrapper `<div className="p-4 sm:p-6">` (FullpageFormShell tự xử lý padding)
  - Content: `<ContractForm mode="create" />`

- [ ] Tạo `app/(fullpage)/contracts/[id]/edit/page.tsx`
  - Copy từ `app/(protected)/contracts/[id]/edit/page.tsx`
  - Bỏ wrapper `<div className="p-4 sm:p-6">`
  - Content: `<ContractForm mode="edit" contractId={id} />`

### Xóa cũ
- [ ] Xóa `app/(protected)/contracts/create/page.tsx`
- [ ] Xóa `app/(protected)/contracts/[id]/edit/page.tsx`

### Verify folder structure sau khi xong
```
app/
  (protected)/
    layout.tsx              ← AppShell (giữ nguyên)
    contracts/
      page.tsx              ← Contract LIST (giữ nguyên trong protected)
      [id]/
        page.tsx            ← Contract DETAIL (giữ nguyên)
        loading.tsx         ← giữ nguyên
        print/
          page.tsx          ← giữ nguyên
        # edit/ đã MOVE sang (fullpage)

  (fullpage)/
    layout.tsx              ← Auth-only, no AppShell (Phase 01)
    contracts/
      create/
        page.tsx            ← NEW ✅
      [id]/
        edit/
          page.tsx          ← NEW ✅
```

## URL Verification
Sau khi move, test các URL sau vẫn hoạt động đúng:

| URL | Expected behavior |
|-----|-------------------|
| `/contracts` | Contract list — có AppShell ✅ |
| `/contracts/create` | Fullpage form — KHÔNG có AppShell ✅ |
| `/contracts/[id]` | Contract detail — có AppShell ✅ |
| `/contracts/[id]/edit` | Fullpage form — KHÔNG có AppShell ✅ |
| `/contracts/[id]/print` | Print page — có AppShell ✅ |

## Test Criteria
- [ ] Tất cả URLs trong bảng trên hoạt động đúng
- [ ] Không có duplicate route warning từ Next.js
- [ ] Auth redirect hoạt động cho `(fullpage)` routes

---
Next Phase: phase-05-verify.md
