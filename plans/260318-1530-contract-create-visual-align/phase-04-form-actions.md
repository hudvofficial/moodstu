# Phase 04: FormActions + Save Draft Button

**Status:** ⬜ Pending
**Dependencies:** None
**Files:** FormActions.tsx, useContractForm.ts

---

## Objective

Thêm nút "Lưu bản nháp" giữa Cancel và Submit (Stitch có 3 buttons).

## Stitch Reference

```html
<!-- Stitch desktop line 393-405 -->
<footer class="px-8 py-5 border-t flex justify-between">
  <button class="border text-slate-500">Huỷ</button>
  <div class="flex gap-3">
    <button class="text-primary">Lưu bản nháp</button>
    <button class="bg-primary text-white shadow-md">Tạo hợp đồng</button>
  </div>
</footer>
```

## Implementation Steps

### Step 1: Add save draft handler

- [ ] Add `onSaveDraft` prop to FormActions
- [ ] In useContractForm: `handleSaveDraft()` = submit with `status: 'draft'`

### Step 2: Update FormActions.tsx

```tsx
<div className="flex items-center justify-between border-t border-main pt-6">
  <button onClick={onCancel} className="btn btn-ghost">
    Huỷ
  </button>
  <div className="flex items-center gap-3">
    {!isEditMode && (
      <button onClick={onSaveDraft} className="btn btn-ghost text-interactive">
        Lưu bản nháp
      </button>
    )}
    <button onClick={onSubmit} disabled={isSubmitting} className="btn btn-primary">
      {isEditMode ? "Cập nhật" : "Tạo hợp đồng"}
    </button>
  </div>
</div>
```

- [ ] Add "Lưu bản nháp" button (only in create mode)
- [ ] Use `.btn .btn-ghost` with `text-interactive` color
- [ ] Keep existing Submit + Cancel buttons

## Test Criteria

- [ ] 3 buttons visible in create mode: Huỷ | Lưu bản nháp | Tạo hợp đồng
- [ ] 2 buttons in edit mode: Huỷ | Cập nhật (no draft option)
- [ ] Draft saves with status='draft'
- [ ] All buttons use SSOT `.btn` classes
- [ ] Proper spacing between buttons (gap-3)

---
Next Phase: Phase 05 (SSOT Compliance Sweep)
