# Plan: Fix Image Upload System — Eager Upload + Cleanup

Created: 2026-03-26T18:34
Status: 🟡 Pending Review

## Vấn đề

ImageUpload component upload ảnh lên Supabase Storage **ngay khi chọn file** (Eager Upload).
Toast "Upload thành công" khiến user tưởng xong → đóng form → ảnh trên Storage nhưng DB chưa lưu.

**Root cause:** Upload tách rời khỏi Save. User không biết phải bấm "Cập nhật" nữa.

## Nguyên tắc

- ✅ Giữ Eager Upload (industry standard: Notion, Slack, Shopify)
- ❌ KHÔNG đổi DB schema
- ❌ KHÔNG đổi flow upload (vẫn upload ngay khi chọn file)
- ✅ Backward compatible — module nào đang dùng vẫn chạy

## Phases

| Phase | Name | Est | Status |
|-------|------|-----|--------|
| 01 | Toast UX + Size limit | 5 min | ⬜ |
| 02 | Generic ImageUpload | 15 min | ⬜ |
| 03 | Cleanup on Cancel | 20 min | ⬜ |
| 04 | Verification | 5 min | ⬜ |

---

## Phase 01: Toast UX + Size Limit (~5 min)

### Files:
- `components/ui/image-upload.tsx` — sửa toast + size limit client
- `app/actions/dress-mutations.ts` — sửa size limit server

### Tasks:
- [ ] L60: Toast "Upload thành công" → "Đã tải ảnh lên. Bấm Lưu để hoàn tất"
- [ ] L41: Size limit `5 * 1024 * 1024` → `10 * 1024 * 1024`
- [ ] L42: Toast "vượt quá 5MB" → "vượt quá 10MB"
- [ ] dress-mutations.ts L416: Size limit server `5 * 1024 * 1024` → `10 * 1024 * 1024`
- [ ] dress-mutations.ts L416: Error message "5MB" → "10MB"

---

## Phase 02: Generic ImageUpload (~15 min)

### Mục tiêu:
Bỏ hardcode `uploadDressImage` trong UI component.
ImageUpload trở thành component reusable cho mọi module.

### File: `components/ui/image-upload.tsx`

**Thay đổi interface:**
```tsx
// TRƯỚC (hardcode dress mutation)
interface ImageUploadProps {
  value?: string;
  onChange: (url: string) => void;
}

// SAU (generic — caller quyết định upload đi đâu)
interface ImageUploadProps {
  value?: string;
  onChange: (url: string) => void;
  onUpload: (formData: FormData) => Promise<{ success: boolean; data?: { url: string }; error?: string }>;
  maxSizeMB?: number;  // default 10
}
```

**Thay đổi logic:**
- Xóa `import { uploadDressImage }` — component UI không biết về dress
- `handleFile()` gọi `onUpload(formData)` thay vì `uploadDressImage(formData)`
- `maxSizeMB` prop cho phép mỗi module set limit riêng

### File: `components/dresses/dress-form-modal.tsx`

**Caller truyền upload function:**
```tsx
<ImageUpload
  value={form.image_url || undefined}
  onChange={(url) => update({ image_url: url })}
  onUpload={uploadDressImage}  // ← truyền mutation vào
/>
```

---

## Phase 03: Cleanup on Cancel (~20 min)

### Mục tiêu:
Khi user upload ảnh rồi đóng form KHÔNG bấm Lưu → xóa ảnh vừa upload khỏi Storage.

### File: `components/dresses/dress-form-modal.tsx`

**Thêm state tracking:**
```tsx
const [pendingUploadUrl, setPendingUploadUrl] = useState<string | null>(null);
```

**Logic:**
1. Khi `ImageUpload.onChange(url)` được gọi → lưu url vào `pendingUploadUrl`
2. Khi user bấm Lưu thành công → clear `pendingUploadUrl` (ảnh đã persist)
3. Khi user bấm Đóng/Hủy mà `pendingUploadUrl` còn giá trị:
   - Nếu `pendingUploadUrl !== editItem?.image_url` (ảnh mới, không phải ảnh cũ)
   - → Gọi server action `deleteStorageFile(bucket, url)` để xóa orphan

### File: `app/actions/dress-mutations.ts`

**Thêm server action:**
```tsx
export async function deleteDressImage(imageUrl: string) {
  return withAuth(async (supabase) => {
    const path = imageUrl.split("/dresses/")[1]?.split("?")[0];
    if (path) await supabase.storage.from("dresses").remove([path]);
    return null;
  });
}
```

### Edge cases:
- User upload ảnh A → upload ảnh B (thay thế) → đóng form
  - `uploadDressImage` đã xóa ảnh A khi upload B (L420-422)
  - Cleanup chỉ cần xóa ảnh B (pendingUploadUrl cuối cùng)
- User edit dress đã có ảnh → upload ảnh mới → đóng form
  - Ảnh cũ KHÔNG bị xóa (vì `pendingUploadUrl !== editItem.image_url`)
  - Chỉ xóa ảnh mới vừa upload

---

## Phase 04: Verification (~5 min)

- [ ] Mở form → chọn ảnh → thấy toast "Đã tải ảnh lên. Bấm Lưu để hoàn tất"
- [ ] Bấm Lưu → ảnh hiện trên card list (SWR refetch)
- [ ] Mở form → chọn ảnh → bấm Đóng → ảnh KHÔNG còn trên Storage
- [ ] Upload ảnh > 5MB < 10MB → upload thành công
- [ ] Upload ảnh > 10MB → toast "vượt quá 10MB"
- [ ] `npm run build` — no errors

## Quick Commands
- Phase 1: `/code phase-01` (Toast + Size)
- Phase 2: `/code phase-02` (Generic)
- Phase 3: `/code phase-03` (Cleanup)
