# Phase 01: Header + Layout Shell

**Status:** ⬜ Pending
**Dependencies:** None
**Files:** `index.tsx`, `page.tsx`

## Objective

Cập nhật header và layout container theo Stitch mockup.

## Changes

### 1. `app/(protected)/contracts/create/page.tsx`
- **Không đổi gì** — layout `p-4 sm:p-6` đã OK

### 2. `components/contracts/form/index.tsx`

#### 2a. Container width
```diff
- <div className="mx-auto max-w-3xl space-y-6 pb-8">
+ <div className="mx-auto max-w-4xl space-y-6 pb-8">
```
**Lý do:** Stitch Desktop dùng max-w-4xl để tận dụng màn hình rộng hơn.

#### 2b. Header — thêm breadcrumb + subtitle
Thay header hiện tại bằng:
```tsx
{/* Header */}
<div>
  {/* Breadcrumb back link */}
  <button
    type="button"
    onClick={form.handleCancel}
    className="inline-flex items-center gap-1 text-body-sm text-text-secondary 
               hover:text-text-primary transition-colors mb-2"
  >
    <ArrowLeft className="h-4 w-4" />
    Quay lại danh sách
  </button>

  <div className="flex items-start justify-between gap-4">
    <div>
      <h2 className="text-h2">
        {mode === "create" ? "Tạo hợp đồng" : "Sửa hợp đồng"}
      </h2>
      <p className="text-body-sm text-text-secondary mt-0.5">
        {mode === "create" 
          ? "Điền thông tin để tạo hợp đồng mới" 
          : "Chỉnh sửa thông tin hợp đồng"}
      </p>
    </div>

    {/* Contract code badge — float right */}
    {previewCode && (
      <div className="flex items-center gap-1.5 rounded-radius-sm 
                      bg-bg-secondary px-3 py-1.5 shrink-0">
        <Fingerprint className="h-3.5 w-3.5 text-text-muted" />
        <span className="text-body-sm font-semibold text-text-secondary">
          {previewCode}
        </span>
      </div>
    )}
  </div>
</div>
```

**Chi tiết thay đổi:**
- ✅ Thêm breadcrumb "← Quay lại danh sách" (dùng `form.handleCancel` có sẵn)
- ✅ Thêm subtitle mô tả
- ✅ Badge mã HĐ giữ nguyên logic (create: previewCode, edit: contract_code)
- ✅ Thêm import `ArrowLeft` từ lucide-react
- ✅ Gộp badge logic create/edit thành 1 block (DRY)

## Imports cần thêm
```diff
- import { Loader2, Fingerprint } from "lucide-react";
+ import { Loader2, Fingerprint, ArrowLeft } from "lucide-react";
```

## Test Criteria
- [ ] Desktop: breadcrumb hiện, title + subtitle, badge phải
- [ ] Mobile: breadcrumb hiện, layout stacked tự nhiên
- [ ] Click breadcrumb → về danh sách contracts
- [ ] Create mode: hiện previewCode
- [ ] Edit mode: hiện contract_code
- [ ] Form width rộng hơn trên desktop

## Risk: THẤP
- Chỉ thay đổi JSX trong header
- Không ảnh hưởng logic, hooks, hay API
