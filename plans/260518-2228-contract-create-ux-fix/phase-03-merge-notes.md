# Phase 03: Merge Section 6 (Ghi chú) vào Section 1

Status: ⬜ Pending  
Dependencies: Phase 01, 02  
Effort: ~20 dòng move

## Objective

Gộp textarea "Ghi chú" (S6) vào cuối Section 1 (Thông tin HĐ), ngay dưới "Mô tả". Xóa card S6 riêng biệt → giảm 1 section, form compact hơn.

## Vấn đề hiện tại

Section 1 đã có textarea "Mô tả" (`description`) ở cuối (line 172-181 `ContractInfoSection.tsx`).  
Section 6 là card riêng cuối form, chỉ chứa 1 textarea "Ghi chú" (`notes`) (line 194-204 `index.tsx`).

Hai textarea này cùng tính chất (text tự do), tách thành 2 section riêng gây:
- Thêm 1 card + heading chiếm ~80px vertical
- User phải scroll qua S3, S4, S5 mới tới S6 để ghi chú
- Trên mobile, scroll rất dài

**Phân biệt business**: `description` = mô tả gói DV (có thể hiện trên HĐ in). `notes` = ghi chú nội bộ. Cần giữ label khác nhau nhưng đặt cạnh nhau.

## Implementation

### Bước 1: Thêm `notes` vào `ContractInfoSection`

File: `components/contracts/form/ContractInfoSection.tsx`

Thêm textarea "Ghi chú nội bộ" ngay SAU "Mô tả" (line 181):

```diff
      {/* Description */}
      <Field label="Mô tả">
        <Textarea unstyled
          value={formData.description}
          onChange={(e) => updateField("description", e.target.value)}
          placeholder="Mô tả gói dịch vụ, yêu cầu đặc biệt..."
          rows={3}
          className="input-base resize-none"
        />
      </Field>
+
+     {/* Notes — gộp từ S6, ghi chú nội bộ */}
+     <Field label="Ghi chú nội bộ">
+       <Textarea unstyled
+         value={formData.notes}
+         onChange={(e) => updateField("notes", e.target.value)}
+         placeholder="Ghi chú nội bộ, không hiện trên hợp đồng in..."
+         rows={3}
+         className="input-base resize-none"
+       />
+     </Field>
    </section>
```

### Bước 2: Xóa Section 6 khỏi `index.tsx`

File: `components/contracts/form/index.tsx`

Xóa block S6 (lines 194-204):

```diff
        </div>

-       {/* Section 6: Notes */}
-       <section className="card-base p-6 space-y-4">
-         <h3 className="form-section-heading">6. Ghi chú</h3>
-         <Textarea unstyled
-           value={form.formData.notes}
-           onChange={(e) => form.updateField("notes", e.target.value)}
-           placeholder="Ghi chú nội bộ hoặc yêu cầu đặc biệt từ khách hàng..."
-           rows={4}
-           className="input-base resize-none"
-         />
-       </section>
      </FullpageFormShell>
```

### Bước 3: Kiểm tra import Textarea

`ContractInfoSection.tsx` cần import `Textarea` nếu chưa có. Check line đầu file.

## Không ảnh hưởng

- `formData.notes` vẫn là field trong `ContractFormData` — không đổi type
- Submit logic: `notes` vẫn đọc từ `formData.notes` — không đổi
- Edit mode: `notes` vẫn được load từ `loadContractForEdit` → `formData.notes` — không đổi

## Test Criteria

- [ ] Section 6 card riêng KHÔNG CÒN cuối form
- [ ] "Ghi chú nội bộ" textarea xuất hiện trong S1, ngay dưới "Mô tả"
- [ ] Nhập notes → submit → data lưu đúng
- [ ] Edit mode: notes hiện đúng trong S1
- [ ] Mobile: form ngắn hơn ~80px (bớt 1 card header)

---
End of phases.
