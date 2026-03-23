@[/code] Di chuyển badge mã HĐ từ header xuống section heading

## Bối cảnh

Badge mã HĐ (HĐ-2026-0009) đang trong header rightSlot → chồng title trên mobile. Plan đã duyệt: di chuyển badge xuống cùng line với heading "1. Thông tin hợp đồng" (giống V1).

## CHỈ SỬA 2 FILES

### File 1: components/contracts/form/ContractInfoSection.tsx

**Thay đổi 1: Thêm prop badgeCode (L31-35)**
```diff
  interface Props {
    formData: ContractFormData;
    updateField: ...;
    showDeliveryDate: boolean;
+   badgeCode?: string;
  }
```

**Thay đổi 2: Heading + badge cùng line (L39-42)**
```diff
- <h3 className="form-section-heading">
-   1. Thông tin hợp đồng
- </h3>
+ <div className="flex items-center justify-between">
+   <h3 className="form-section-heading">
+     1. Thông tin hợp đồng
+   </h3>
+   {badgeCode && (
+     <div className="flex items-center gap-1.5 text-interactive text-caption">
+       <span className="text-text-muted">Mã HĐ</span>
+       <Fingerprint className="h-3.5 w-3.5" />
+       <span className="font-bold tracking-wider">{badgeCode}</span>
+     </div>
+   )}
+ </div>
```

**Thay đổi 3: Xóa block badge mobile cũ (L94-106)**
```diff
- {/* Contract code — mobile only */}
- {formData.contract_code && (
-   <div className="lg:hidden">
-     <Field label="Mã hợp đồng">
-       ...
-     </Field>
-   </div>
- )}
```

### File 2: components/contracts/form/index.tsx

**Thay đổi 1: Xóa rightSlot khỏi setHeaderSlots (L54-61)**
```diff
  setHeaderSlots({
    leftSlot: (...),
    titleOverride: ...,
    hideSearch: true,
-   rightSlot: badgeCode ? (
-     <div className="...">...</div>
-   ) : undefined,
  });
```

**Thay đổi 2: Truyền badgeCode prop (L148-152)**
```diff
  <ContractInfoSection
    formData={form.formData}
    updateField={form.updateField}
    showDeliveryDate={form.shouldShowDeliveryDate}
+   badgeCode={badgeCode}
  />
```

## Gate

1. Đọc tasks/pre-code-checklist.md + tasks/lessons.md + tasks/gates/before-edit.md
2. Mở browser 375px /contracts/create TRƯỚC khi sửa

## Verify

1. npm run build — pass
2. Mobile 375px /contracts/create:
   - Header: chỉ ← Back + "Tạo hợp đồng mới" (KHÔNG badge)
   - Section 1 heading: "1. Thông tin hợp đồng" + badge "HĐ-2026-0009" bên phải
   - Bell ẩn (rightSlot đã xóa → bell vẫn ẩn? Kiểm tra: rightSlot = undefined → bell hiện lại)
3. Desktop 1440px: badge vẫn hiện cạnh heading
4. /dashboard, /contracts — không ảnh hưởng

## LƯU Ý: Kiểm tra bell behavior
Sau khi xóa rightSlot, `header.tsx` L216 `cn(rightSlot && "max-lg:hidden")` → rightSlot = undefined → bell HIỆN lại trên mobile. Đây là hành vi ĐÚNG (form page không cần ẩn bell khi badge đã xuống body).
