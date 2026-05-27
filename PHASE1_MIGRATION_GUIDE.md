# 🚀 Phase 1 Migration Guide: Toast Manager

**Status:** ✅ Complete  
**Date:** 2026-05-27

---

## 📦 What's New

Phase 1 introduces **ToastManager** - a centralized toast system với:

✅ **Automatic deduplication** (no more toast spam)  
✅ **Batch operations** (summary toasts)  
✅ **Loading → Success/Error flow** (with toast ID updates)  
✅ **Server action integration** (toastResult maintained)  
✅ **React Query compatible** (use in mutation callbacks)  
✅ **Action toasts** (undo/retry buttons)  
✅ **Critical toasts** (no auto-dismiss)  
✅ **100% backward compatible** (existing code still works)

---

## 🔄 Migration Strategy

### Option A: Gradual Migration (Recommended)

Existing code **continues to work** without changes. Migrate gradually:

1. **New features:** Use `@/lib/toast-manager` directly
2. **Existing code:** Keep using `@/lib/toast-utils` (now powered by ToastManager)
3. **Refactor:** Update to new patterns when touching files

### Option B: Immediate Migration

Replace all imports at once:

```bash
# Find all toast imports
grep -r "from \"sonner\"" --include="*.ts" --include="*.tsx"

# Replace with toast-manager
# from "sonner" → from "@/lib/toast-manager"
```

---

## 📚 Import Patterns

### ✅ Recommended (New Code)

```typescript
// Best: Import from toast-manager
import { toast } from "@/lib/toast-manager";

toast.success("Đã lưu");
toast.batchSuccess(files, "tải xuống");
toast.startLoading("upload", "Đang tải...");
```

### ✅ Still Valid (Existing Code)

```typescript
// OK: Import from toast-utils (backward compatible)
import { toast } from "@/lib/toast-utils";

toast("Đã lưu", "success"); // V2 API still works
toastResult(result, "Thành công"); // Still works
```

### ⚠️ Avoid (Direct Sonner Import)

```typescript
// Avoid: Direct sonner import (bypasses deduplication)
import { toast } from "sonner";
toast.success("Message"); // No deduplication, no batch support
```

**Action:** Update files importing `sonner` directly to use `@/lib/toast-manager`

---

## 🔧 Common Patterns

### 1. Simple Toasts

```typescript
// Before (V2)
import { toast } from "@/lib/toast-utils";
toast("Đã lưu", "success");
toast("Lỗi", "error");

// After (V3) - MORE FEATURES
import { toast } from "@/lib/toast-manager";
toast.success("Đã lưu"); // Auto-deduplicated
toast.error("Lỗi");
```

**Migration:** Change import, update syntax. Optional but recommended.

---

### 2. Server Actions

```typescript
// Before
import { toastResult } from "@/lib/toast-utils";
const result = await createGallery(...);
toastResult(result, "Tạo album thành công");

// After - SAME API (no change needed!)
import { toast } from "@/lib/toast-manager";
const result = await createGallery(...);
toast.result(result, "Tạo album thành công");
```

**Migration:** Update import, use `toast.result()`. Functionally identical.

---

### 3. React Query Mutations

```typescript
// Before
import { toast } from "sonner";

const mutation = useMutation({
  mutationFn: createGallery,
  onSuccess: () => toast.success("Thành công"),
  onError: () => toast.error("Lỗi"),
});

// After - AUTO DEDUPLICATION
import { toast } from "@/lib/toast-manager";

const mutation = useMutation({
  mutationFn: createGallery,
  onSuccess: () => toast.success("Thành công"), // Won't spam if called multiple times
  onError: (err) => toast.error(err.message),
});
```

**Migration:** Change import. Behavior improves (deduplication).

---

### 4. Loading → Success/Error Flow

```typescript
// Before (gallery-download.ts pattern)
import { toast } from "sonner";

const toastId = toast.loading("Đang tải...");
try {
  await download();
  toast.success("Xong", { id: toastId });
} catch {
  toast.error("Lỗi", { id: toastId });
}

// After - SAME PATTERN (fully compatible)
import { toast } from "@/lib/toast-manager";

const toastId = toast.loading("Đang tải...");
try {
  await download();
  toast.success("Xong", { id: toastId });
} catch {
  toast.error("Lỗi", { id: toastId });
}

// Or use named loading (better for complex flows)
toast.startLoading("download-photos", "Đang tải 10 ảnh...");
try {
  await download();
  toast.finishLoading("download-photos", "success", "Đã tải 10 ảnh");
} catch {
  toast.finishLoading("download-photos", "error", "Lỗi");
}
```

**Migration:** Change import. Optionally use `startLoading`/`finishLoading`.

---

### 5. Batch Operations (NEW!)

```typescript
// Before - TOAST SPAM
items.forEach((item) => {
  saveItem(item);
  toast.success(`Đã lưu ${item.name}`); // Shows 20+ toasts!
});

// After - SUMMARY TOAST
import { toast } from "@/lib/toast-manager";

const names = items.map((item) => item.name);
await Promise.all(items.map(saveItem));
toast.batchSuccess(names, "lưu");
// Result: "Đã lưu 23 mục"
//         "item1, item2, item3... và 20 mục khác"
```

**Migration:** Identify bulk operations, replace forEach loops with `batchSuccess`.

---

### 6. Retry Pattern (gallery-download.ts)

```typescript
// Before (manual toast updates)
const toastId = toast.loading("Đang tải...");
for (let i = 0; i < maxRetries; i++) {
  try {
    await download();
    toast.success("Xong", { id: toastId });
    break;
  } catch {
    if (i < maxRetries - 1) {
      toast.loading(`Thử lại... (${i + 2}/${maxRetries})`, { id: toastId });
    } else {
      toast.error("Lỗi", { id: toastId });
    }
  }
}

// After - SAME PATTERN (fully compatible)
import { toast } from "@/lib/toast-manager";
// ... exact same code, just change import
```

**Migration:** Change import. Pattern already supported.

---

### 7. Action Toasts (NEW!)

```typescript
// Before (no undo/retry buttons)
function deleteImage(id: string) {
  performDelete(id);
  toast.success("Đã xóa ảnh");
}

// After - WITH UNDO
import { toast } from "@/lib/toast-manager";

function deleteImage(id: string) {
  performDelete(id);
  toast.successWithUndo("Đã xóa ảnh", () => {
    restoreImage(id);
  });
}

// Error with retry
async function download(id: string) {
  try {
    await downloadImage(id);
    toast.success("Đã tải");
  } catch {
    toast.errorWithRetry("Không thể tải", () => download(id));
  }
}
```

**Migration:** Identify destructive actions, add `successWithUndo`. Add `errorWithRetry` for retryable errors.

---

## 🎯 Priority Migration List

### 🔴 High Priority (Do First)

1. **Files importing `sonner` directly**
   ```bash
   grep -r "from \"sonner\"" --include="*.ts" --include="*.tsx"
   ```
   → Replace with `@/lib/toast-manager`

2. **Bulk operations** (forEach with toast)
   - `components/gallery/*` - batch downloads
   - Any file with `forEach(...toast...)`
   → Use `toast.batchSuccess()`

3. **Destructive actions** (delete, remove)
   - Gallery image deletion
   - Contract deletion
   → Add `successWithUndo()`

### 🟡 Medium Priority (Next)

4. **React Query mutations** with toast
   - `hooks/use-*-queries.ts`
   → Verify deduplication works

5. **Loading flows** (already compatible)
   - `lib/gallery-download.ts`
   → Optional: use `startLoading`/`finishLoading`

### 🟢 Low Priority (Optional)

6. **Simple toasts** (already work via toast-utils)
   - Can migrate gradually when touching files

---

## 🧪 Testing Checklist

After migration, verify:

- [ ] No duplicate toasts on rapid clicks
- [ ] Batch operations show summary (not 20+ toasts)
- [ ] Loading → Success/Error transitions smoothly
- [ ] Server action toasts work (`toast.result()`)
- [ ] React Query mutation toasts work
- [ ] Undo buttons work (if added)
- [ ] Retry buttons work (if added)
- [ ] No console errors

---

## 📝 Files to Update

### Priority 1: Direct Sonner Imports

```
components/auth/login-page-client.tsx
components/auth/reset-password-form.tsx
components/auth/forgot-password-form.tsx
components/settings/studio-info-form.tsx
components/settings/studio/studio-identity-section.tsx
components/settings/settings-view.tsx
components/settings/member-card.tsx
components/settings/link-employee-modal.tsx
components/settings/google-calendar-card.tsx
components/settings/edit-profile-modal.tsx
components/settings/credit-cards/credit-card-form-modal.tsx
lib/gallery-download.ts
```

**Action:**
```typescript
// Change this
import { toast } from "sonner";

// To this
import { toast } from "@/lib/toast-manager";
```

### Priority 2: Files Already Using toast-utils

```
hooks/use-gallery-queries.ts
components/ui/image-upload.tsx
```

**Action:** No change needed (already compatible via toast-utils wrapper)

---

## 🚨 Breaking Changes

**None!** Phase 1 is 100% backward compatible.

All existing patterns continue to work:
- ✅ `toast("Message", "success")` - works
- ✅ `toastResult(result, "Success")` - works
- ✅ `toast.loading() → toast.success({ id })` - works
- ✅ Files importing from `@/lib/toast-utils` - work

---

## 📚 Next Steps

After Phase 1 migration:

1. **Phase 2:** Message constants (`lib/toast-messages.ts`)
2. **Phase 3:** Mobile UX (responsive positioning, swipe-to-dismiss)
3. **Phase 4:** Analytics tracking

---

## 🆘 Troubleshooting

### Issue: Toasts not deduplicating

**Cause:** Still importing from `sonner` directly  
**Fix:** Import from `@/lib/toast-manager`

### Issue: Loading → Success not updating

**Cause:** Mismatch between toast IDs  
**Fix:** Use same `id` in loading and success calls:
```typescript
const id = toast.loading("Loading...");
toast.success("Done", { id }); // Same ID!
```

### Issue: Batch toast not showing

**Cause:** Empty array passed  
**Fix:** Check array length before calling `batchSuccess()`

---

## 📞 Need Help?

- **Examples:** See `lib/toast-manager.examples.ts`
- **API Docs:** See `lib/toast-manager.ts` JSDoc comments
- **Questions:** Ask in #engineering channel

---

**Status:** Phase 1 complete ✅  
**Backward compatible:** Yes ✅  
**Required changes:** None (optional improvements)  
**Estimated migration time:** 1-2 hours for all files
