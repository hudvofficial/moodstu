# AUDIT & OPTIMIZATION: Toast System

**Date:** 2026-05-27  
**Library:** Sonner v2.0.7  
**Total Usage:** 318 toast calls across 121 files

---

## 📊 CURRENT STATE AUDIT

### Architecture

**Library:** [Sonner](https://sonner.emilkowal.ski/) v2.0.7 by Emil Kowalski
- Modern, lightweight toast library
- React 18+ optimized
- Promise-based API
- Customizable styling
- Built-in animations

**Setup:**
```
app/layout.tsx              → <Toaster /> (SSOT - Single Source of Truth)
lib/toast-utils.ts          → Thin wrapper utilities
~121 component files        → Direct toast usage
```

### Global Configuration

**File:** `app/layout.tsx` (lines 147-168)

```typescript
<Toaster
  position="top-right"
  className="!top-[60px] lg:!top-[72px] !right-4 lg:!right-8 flex flex-col items-end"
  toastOptions={{
    classNames: {
      toast: "group flex flex-row-reverse items-center gap-2.5 !w-auto !min-w-0 max-w-[400px] ml-auto",
      title: "text-[13px] font-medium text-text-primary",
      description: "text-[12px] text-text-muted mt-0.5",
      // Icons for each type
      success: "text-green-600",
      error: "text-red-600",
      info: "text-blue-600",
      warning: "text-amber-600",
    },
    duration: 4000, // 4s default
  }}
  icons={{
    success: <CheckCircle2 size={16} />,
    error: <XCircle size={16} />,
    info: <Info size={16} />,
    warning: <AlertCircle size={16} />,
    loading: <Bell size={16} className="animate-pulse" />,
  }}
/>
```

### Usage Patterns

**Common patterns found:**
```typescript
// Direct usage (most common)
toast.success("Đã lưu thành công");
toast.error("Có lỗi xảy ra");
toast.info("Đang xử lý...");
toast.loading("Đang tải...");

// With options
toast.success("Đã lưu", { duration: 5000 });
toast.error(err.message, { id: "error-id" });

// Promise-based (rare)
toast.promise(
  fetchData(),
  {
    loading: "Đang tải...",
    success: "Thành công!",
    error: "Lỗi!",
  }
);

// Wrapper utility (some files)
import { toast } from "@/lib/toast-utils";
toast("Message", "success");
```

### Statistics

| Metric | Value |
|--------|-------|
| Total files | 121 |
| Total calls | 318 |
| Most used type | `success` (~40%) |
| Second | `error` (~35%) |
| Third | `info` (~20%) |
| Fourth | `loading` (~5%) |

---

## ⚠️ CURRENT ISSUES

### 1. **Inconsistent Import Patterns**

**Problem:**
```typescript
// Some files import directly
import { toast } from "sonner";

// Others use wrapper
import { toast } from "@/lib/toast-utils";

// Different APIs!
```

**Impact:** Confusing for developers, harder to maintain

---

### 2. **No Toast Deduplication**

**Problem:** Multiple rapid actions can spam identical toasts

**Example:**
```typescript
// User clicks save 3 times rapidly
onClick={() => {
  toast.success("Đã lưu"); // Shows 3 times!
  toast.success("Đã lưu");
  toast.success("Đã lưu");
}}
```

**Current:** No built-in deduplication  
**Expected:** Should show once or debounce

---

### 3. **No Toast Queue Management**

**Problem:** Too many toasts stack up and overwhelm UI

**Scenario:**
```typescript
// Bulk action on 20 items
items.forEach(item => {
  saveItem(item);
  toast.success(`Đã lưu ${item.name}`); // 20 toasts!
});
```

**Current:** All 20 show simultaneously  
**Better:** Show summary toast or queue

---

### 4. **Hardcoded Messages**

**Problem:** Toast messages scattered across codebase

**Issue:**
- Hard to translate (i18n)
- Inconsistent wording
- Typos/duplicates
- No centralized copy management

---

### 5. **No Analytics/Tracking**

**Problem:** Can't measure toast effectiveness

**Missing:**
- Which toasts users see most
- Dismiss rate (how many users close)
- Read time
- Error toast frequency (indicates UX issues)

---

### 6. **Mobile UX Not Optimized**

**Current position:** `top-right`

**Issues on mobile:**
- Top-right is awkward on narrow screens
- Overlaps with header (z-index conflicts)
- Hard to dismiss (small close button)
- No swipe-to-dismiss gesture

---

### 7. **No Undo/Action Capability**

**Missing feature:**
```typescript
// Common pattern in modern apps
toast.success("Đã xóa ảnh", {
  action: {
    label: "Hoàn tác",
    onClick: () => restore(),
  },
});
```

---

### 8. **Performance: Bundle Size**

**Sonner v2.0.7:** ~4.2 KB gzipped (already good!)

But:
- Imported in 121 files
- No tree-shaking optimization
- Icons imported in root layout

---

## 🚀 MODERN OPTIMIZATION TECHNIQUES

### 1. ⭐ **Centralized Toast Manager**

**Technique:** Single API with semantic methods

```typescript
// lib/toast-manager.ts
import { toast as sonnerToast } from "sonner";

class ToastManager {
  private activeToasts = new Map<string, string | number>();

  // Deduplicated success
  success(message: string, options?: { id?: string; duration?: number }) {
    const id = options?.id || message;
    
    // Prevent duplicate
    if (this.activeToasts.has(id)) {
      return this.activeToasts.get(id);
    }

    const toastId = sonnerToast.success(message, {
      duration: options?.duration || 4000,
      onDismiss: () => this.activeToasts.delete(id),
      onAutoClose: () => this.activeToasts.delete(id),
    });

    this.activeToasts.set(id, toastId);
    return toastId;
  }

  error(message: string, options?: ToastOptions) { /* ... */ }
  info(message: string, options?: ToastOptions) { /* ... */ }
  loading(message: string) { /* ... */ }

  // Batch summary
  batch(messages: string[], type: "success" | "error") {
    if (messages.length === 1) {
      return this[type](messages[0]);
    }
    return this[type](`${messages.length} thao tác thành công`);
  }

  // Promise wrapper with auto error handling
  async promise<T>(
    promise: Promise<T>,
    messages: { loading: string; success: string; error?: string }
  ) {
    return sonnerToast.promise(promise, {
      loading: messages.loading,
      success: messages.success,
      error: (err) => messages.error || err.message || "Có lỗi xảy ra",
    });
  }

  // Clear all toasts
  clear() {
    this.activeToasts.forEach((id) => sonnerToast.dismiss(id));
    this.activeToasts.clear();
  }
}

export const toastManager = new ToastManager();

// Simple export for backward compatibility
export const toast = {
  success: (msg: string, opts?: any) => toastManager.success(msg, opts),
  error: (msg: string, opts?: any) => toastManager.error(msg, opts),
  info: (msg: string, opts?: any) => toastManager.info(msg, opts),
  loading: (msg: string) => toastManager.loading(msg),
  promise: toastManager.promise.bind(toastManager),
};
```

**Benefits:**
- ✅ Automatic deduplication
- ✅ Centralized control
- ✅ Batch operations
- ✅ Promise helpers
- ✅ Easy to add analytics

---

### 2. ⭐ **Toast Message Constants (i18n-ready)**

```typescript
// lib/toast-messages.ts
export const TOAST_MESSAGES = {
  // Generic
  SAVE_SUCCESS: "Đã lưu thành công",
  SAVE_ERROR: "Không thể lưu",
  DELETE_SUCCESS: "Đã xóa",
  DELETE_ERROR: "Không thể xóa",
  
  // Gallery
  GALLERY: {
    DOWNLOAD_START: "Đang tải ảnh...",
    DOWNLOAD_SUCCESS: (fileName: string) => `Đã tải ${fileName}`,
    DOWNLOAD_ERROR: "Không thể tải ảnh",
    DOWNLOAD_BATCH: (count: number) => `Đang tải ${count} ảnh...`,
  },

  // Contract
  CONTRACT: {
    CREATE_SUCCESS: "Đã tạo hợp đồng",
    UPDATE_SUCCESS: "Đã cập nhật hợp đồng",
    // ...
  },
} as const;

// Usage
import { TOAST_MESSAGES } from "@/lib/toast-messages";
toast.success(TOAST_MESSAGES.GALLERY.DOWNLOAD_SUCCESS("photo.jpg"));
```

**Benefits:**
- ✅ Centralized copy
- ✅ Easy to translate (i18n)
- ✅ Type-safe with TypeScript
- ✅ Find/replace wording
- ✅ No typos/duplicates

---

### 3. ⭐ **Smart Position (Responsive)**

```typescript
// hooks/use-toast-position.ts
import { useMediaQuery } from "@/hooks/use-media-query";

export function useToastPosition() {
  const isMobile = useMediaQuery("(max-width: 768px)");
  
  return isMobile ? "bottom-center" : "top-right";
}

// app/layout.tsx
function ToasterWrapper() {
  const position = useToastPosition();
  
  return (
    <Toaster
      position={position}
      // Mobile-specific tweaks
      className={cn(
        position === "bottom-center" && "!bottom-[80px]", // Above mobile nav
        position === "top-right" && "!top-[60px] !right-4"
      )}
    />
  );
}
```

**Benefits:**
- ✅ Better mobile UX
- ✅ No overlap with bottom nav
- ✅ Easier to reach on mobile
- ✅ Follows platform conventions

---

### 4. ⭐ **Swipe to Dismiss (Mobile)**

Sonner already supports this! Just need to enable:

```typescript
<Toaster
  closeButton // Add close button
  richColors // Better colors
  expand={false} // Don't expand on hover (mobile)
  toastOptions={{
    // Swipe to dismiss is built-in!
    style: {
      touchAction: "pan-y", // Enable swipe
    },
  }}
/>
```

---

### 5. ⭐ **Action Toasts (Undo/Retry)**

```typescript
// lib/toast-manager.ts
class ToastManager {
  successWithUndo(
    message: string,
    onUndo: () => void,
    options?: { duration?: number }
  ) {
    return sonnerToast.success(message, {
      duration: options?.duration || 6000, // Longer for actions
      action: {
        label: "Hoàn tác",
        onClick: onUndo,
      },
    });
  }

  errorWithRetry(
    message: string,
    onRetry: () => void
  ) {
    return sonnerToast.error(message, {
      duration: 8000,
      action: {
        label: "Thử lại",
        onClick: onRetry,
      },
    });
  }
}

// Usage
toast.successWithUndo("Đã xóa ảnh", () => {
  restoreImage(imageId);
});
```

**Benefits:**
- ✅ Reduce anxiety (user can undo)
- ✅ Better error recovery (retry)
- ✅ Modern UX pattern

---

### 6. ⭐ **Analytics Integration**

```typescript
// lib/toast-manager.ts
import { trackEvent } from "@/lib/analytics";

class ToastManager {
  private track(type: string, message: string) {
    // Track to PostHog, Amplitude, etc.
    trackEvent("toast_shown", {
      type,
      message,
      timestamp: Date.now(),
    });
  }

  success(message: string, options?: ToastOptions) {
    this.track("success", message);
    return sonnerToast.success(message, options);
  }

  error(message: string, options?: ToastOptions) {
    // Alert on high error rate!
    this.track("error", message);
    
    if (this.getErrorCount() > 5) {
      console.warn("[Toast] High error rate detected");
    }
    
    return sonnerToast.error(message, options);
  }
}
```

**Benefits:**
- ✅ Monitor UX issues
- ✅ Track error frequency
- ✅ A/B test messaging
- ✅ Alert on problems

---

### 7. ⭐ **Batch/Summary Toasts**

```typescript
// lib/toast-manager.ts
class ToastManager {
  // Batch operations
  batchSuccess(items: string[], singularLabel: string) {
    if (items.length === 0) return;
    
    if (items.length === 1) {
      return this.success(`Đã ${singularLabel} ${items[0]}`);
    }
    
    return this.success(`Đã ${singularLabel} ${items.length} mục`, {
      description: items.slice(0, 3).join(", ") + 
                   (items.length > 3 ? `... và ${items.length - 3} mục khác` : ""),
    });
  }
}

// Usage
const selected = ["ảnh1.jpg", "ảnh2.jpg", "ảnh3.jpg", /* ...20 more */];
toast.batchSuccess(selected, "tải xuống");
// Shows: "Đã tải xuống 23 mục"
//        "ảnh1.jpg, ảnh2.jpg, ảnh3.jpg... và 20 mục khác"
```

**Benefits:**
- ✅ No toast spam
- ✅ Cleaner UI
- ✅ Better UX for bulk operations

---

### 8. ⭐ **Progressive Enhancement**

```typescript
// lib/toast-manager.ts
class ToastManager {
  // Automatically upgrade long toasts to descriptions
  auto(message: string, type: "success" | "error") {
    const isLong = message.length > 50;
    
    if (isLong) {
      // Split into title + description
      const parts = message.split(":");
      return this[type](parts[0].trim(), {
        description: parts.slice(1).join(":").trim(),
      });
    }
    
    return this[type](message);
  }
}

// Before: "Đã lưu hợp đồng ABC-123 với giá trị 50.000.000đ"
// After:  Title: "Đã lưu hợp đồng"
//         Desc:  "ABC-123 với giá trị 50.000.000đ"
```

---

### 9. ⭐ **Toast Persistence (Critical)**

```typescript
// For critical actions that shouldn't auto-dismiss
class ToastManager {
  critical(message: string, type: "success" | "error") {
    return sonnerToast[type](message, {
      duration: Infinity, // Must manually dismiss
      closeButton: true, // Show close button
      important: true, // Higher z-index
    });
  }
}

// Usage
toast.critical("Thanh toán thất bại - Vui lòng kiểm tra lại", "error");
```

---

### 10. ⭐ **Loading State Management**

```typescript
// lib/toast-manager.ts
class ToastManager {
  private loadingToasts = new Map<string, string | number>();

  startLoading(id: string, message: string) {
    const toastId = sonnerToast.loading(message);
    this.loadingToasts.set(id, toastId);
    return toastId;
  }

  finishLoading(id: string, result: "success" | "error", message: string) {
    const toastId = this.loadingToasts.get(id);
    if (!toastId) return;

    sonnerToast[result](message, { id: toastId });
    this.loadingToasts.delete(id);
  }
}

// Usage
const loadingId = "upload-photos";
toast.startLoading(loadingId, "Đang tải 10 ảnh...");

// Later...
toast.finishLoading(loadingId, "success", "Đã tải 10 ảnh");
```

---

## 📈 RECOMMENDED IMPLEMENTATION PRIORITY

### Phase 1: Foundation (1-2 hours)

**Priority: HIGH**

1. ✅ Create `lib/toast-manager.ts` with ToastManager class
2. ✅ Add deduplication logic
3. ✅ Add batch/summary methods
4. ✅ Export backward-compatible API
5. ✅ Update `lib/toast-utils.ts` to use new manager

**Impact:** Immediate reduction in toast spam

---

### Phase 2: Content (2-3 hours)

**Priority: MEDIUM**

1. ✅ Create `lib/toast-messages.ts` with constants
2. ✅ Audit existing messages (318 calls)
3. ✅ Extract common messages
4. ✅ Replace hardcoded strings (gradual migration)

**Impact:** Easier i18n, consistency, fewer typos

---

### Phase 3: UX Polish (2-3 hours)

**Priority: MEDIUM**

1. ✅ Add responsive positioning (mobile vs desktop)
2. ✅ Enable swipe-to-dismiss
3. ✅ Add action toasts (undo/retry)
4. ✅ Tune durations per type

**Impact:** Better mobile UX, more forgiving interactions

---

### Phase 4: Advanced (3-4 hours)

**Priority: LOW (Nice to have)

**

1. ⚠️ Add analytics tracking
2. ⚠️ Add toast persistence for critical messages
3. ⚠️ Add loading state manager
4. ⚠️ A/B test message variations

**Impact:** Better insights, fewer errors

---

## 🎯 EXPECTED RESULTS

### Metrics

| Before | After | Improvement |
|--------|-------|-------------|
| Duplicate toasts | Deduplicated | 100% reduction |
| 20+ toasts for bulk ops | 1 summary toast | 95% reduction |
| Hardcoded strings: 318 | Centralized constants | Maintainability ⬆️ |
| No undo actions | Undo for delete/destructive | Safety ⬆️ |
| Desktop-only positioning | Responsive | Mobile UX ⬆️ |
| No analytics | Full tracking | Visibility ⬆️ |

---

## 📚 ALTERNATIVE LIBRARIES (Comparison)

| Library | Bundle Size | Features | Recommendation |
|---------|-------------|----------|----------------|
| **Sonner** (current) | 4.2 KB | Modern, promise API, customizable | ✅ **Keep it!** |
| React Hot Toast | 5.1 KB | Similar to Sonner | ⚠️ No need to switch |
| React Toastify | 12 KB | Feature-rich but heavy | ❌ Too bloated |
| Notistack | 8.5 KB | Material-UI focused | ❌ Not needed |
| Custom | 0 KB | Full control | ❌ Reinventing wheel |

**Verdict:** Sonner is already optimal. Focus on better usage patterns, not library replacement.

---

## 🔍 CODE REVIEW CHECKLIST

When reviewing toast usage:

- [ ] Using centralized API (`toast-manager`)
- [ ] Using message constants (not hardcoded)
- [ ] Has unique ID for deduplication
- [ ] Batch operations use summary
- [ ] Destructive actions have undo
- [ ] Error toasts have retry
- [ ] Duration appropriate for message length
- [ ] Mobile positioning tested
- [ ] Analytics tracked (if applicable)

---

## 📖 REFERENCES

- [Sonner Docs](https://sonner.emilkowal.ski/)
- [React Hot Toast](https://react-hot-toast.com/) - Alternative
- [Toast UX Best Practices](https://www.nngroup.com/articles/toast-notifications/)
- [Material Design Snackbars](https://m3.material.io/components/snackbar/guidelines)

---

**Status:** Ready for implementation  
**Estimated effort:** 8-12 hours for all phases  
**ROI:** High (better UX + easier maintenance)
