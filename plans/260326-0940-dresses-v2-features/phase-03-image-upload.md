# Phase 03: ImageUpload (Server-side)
Status: ⬜ Pending
Dependencies: None (independent)
Effort: ~20 min

## Audit Decision
- V1 ImageUpload = client-side `createClient()` → bypass auth → ❌ REWRITE
- V2 pattern = server actions only (P-3 rule)
- Reference: `profile-actions.ts` L79-87 (server-side storage upload)

## Implementation Steps

### 1. Server Action: `uploadDressImage()`
- File: `app/actions/dress-mutations.ts` (add to existing)
- Input: `FormData` (file + optional oldPath for replace)
- Steps:
  1. withAuth
  2. Extract file from FormData, validate type (image/*) + size (<5MB)
  3. Generate unique path: `dresses/{timestamp}-{random}.{ext}`
  4. `supabase.storage.from("dresses").upload(path, file)`
  5. If oldPath → `supabase.storage.from("dresses").remove([oldPath])`
  6. Return `{ publicUrl }` via `getPublicUrl()`
- No revalidatePath needed (upload only, form handles save)

### 2. ImageUpload Component
- File: `components/ui/image-upload.tsx` [NEW]
- Props: `{ value?: string; onChange: (url: string) => void; bucket?: string }`
- UI: aspect-3/4 frame, dashed border, click to select file
- Flow:
  1. File selected → instant local preview via `URL.createObjectURL()`
  2. Call `uploadDressImage(formData)` server action
  3. On success → `onChange(publicUrl)`
  4. Show loading spinner during upload
- Tokens: `bg-bg-hover`, `border-border` dashed, `text-text-muted`, `text-caption`
- Icons: lucide `ImagePlus` (empty), `Loader2` (uploading), `Pencil` (hover overlay)

### 3. Integrate into `dress-form-modal.tsx`
- Import `ImageUpload` component
- Add before "Tên trang phục" field:
  ```tsx
  <div>
    <label className="label-base">Hình ảnh</label>
    <ImageUpload value={form.image_url} onChange={(url) => update({ image_url: url })} />
  </div>
  ```

## SSOT Compliance
- NO `@/lib/supabase/client` import
- Server action pattern: `withAuth` + error handling
- Toast via `@/lib/toast-utils`
- All tokens from design-system.css

## Files to Create/Modify
- [MODIFY] `app/actions/dress-mutations.ts` — add `uploadDressImage` (~25 lines)
- [NEW] `components/ui/image-upload.tsx` (~70 lines)
- [MODIFY] `components/dresses/dress-form-modal.tsx` — add ImageUpload field (~5 lines)

## Test Criteria
- [ ] Select image → instant preview appears
- [ ] Image uploads to Supabase Storage "dresses" bucket
- [ ] Save dress → image_url persisted
- [ ] Replace image → old file removed from storage
- [ ] Error handling: file too large, wrong type

---
Next Phase: phase-04-qr-barcode.md
