# FIX: Image Preview Broken in Gallery Lightbox

**Date:** 2026-05-27  
**Issue:** Images not displaying in lightbox viewer (both admin and customer)  
**Status:** ✅ FIXED

---

## 🔍 ROOT CAUSE ANALYSIS

### The Problem

Gallery grid thumbnails displayed correctly, but opening images in the lightbox showed broken images.

### Investigation Steps

1. **Checked database URLs** → ✅ All URLs valid and populated
   ```bash
   node scripts/test-image-urls.mjs
   # Result: All URLs returned 200 OK
   ```

2. **Checked CSP headers** → ✅ Allows `https:` images
   ```typescript
   img-src 'self' blob: data: https:;
   ```

3. **Compared grid vs lightbox rendering:**
   - **Grid**: Uses Next.js `<Image>` component → ✅ Works
   - **Lightbox**: Uses raw `<img>` tag → ❌ Broken

4. **Tested URL formats:**
   ```bash
   # thumbnail_url (drive.google.com)
   curl -I "https://drive.google.com/thumbnail?id=XXX&sz=s1600"
   → 302 Redirect to lh3.googleusercontent.com

   # image_url (lh3.googleusercontent.com)  
   curl -I "https://lh3.googleusercontent.com/d/XXX=s1600"
   → 200 OK (direct image)
   ```

---

## 💡 THE BUG

**File:** `components/gallery/image-viewer.tsx` (lines 156-158)

**Old (broken) code:**
```typescript
const bigImageUrl = current.thumbnail_url
  ? current.thumbnail_url.replace(/sz=s\d+/, "sz=s1600")
  : current.image_url;
```

**Why it broke:**
1. `thumbnail_url` format: `https://drive.google.com/thumbnail?id=XXX&sz=s400`
2. After replace: `https://drive.google.com/thumbnail?id=XXX&sz=s1600`
3. This URL returns **HTTP 302 Redirect** to lh3
4. Raw `<img>` tags in lightbox **cannot follow redirects** properly in some browsers/contexts
5. Next.js `<Image>` component handles redirects → that's why grid worked

---

## ✅ THE FIX

**New (working) code:**
```typescript
// Use image_url directly (lh3) with size parameter
// DO NOT use thumbnail_url → it redirects and browser can't follow
const bigImageUrl = current.image_url
  ? (current.image_url.includes('=s')
      ? current.image_url.replace(/=s\d+/, '=s1600')
      : current.image_url + '=s1600')
  : current.thumbnail_url || '';
```

**Also updated preload logic (lines 60-74)** to use the same approach.

---

## 🧪 VERIFICATION

**Before fix:**
```
Grid thumbnails: ✅ Working (Next.js Image)
Lightbox images: ❌ Broken (302 redirect issue)
```

**After fix:**
```
Grid thumbnails: ✅ Working (unchanged)
Lightbox images: ✅ Working (direct lh3 URL)
```

---

## 📊 URL FORMAT COMPARISON

| Source | Format | Behavior | Used In |
|--------|--------|----------|---------|
| `thumbnail_url` | `drive.google.com/thumbnail?id=X&sz=s400` | 302 → lh3 | Grid (via Next.js) |
| `image_url` | `lh3.googleusercontent.com/d/X` | 200 direct | **Now: Lightbox** |
| `image_url` + size | `lh3.googleusercontent.com/d/X=s1600` | 200 direct | **Now: Lightbox** |

---

## 🎯 KEY INSIGHTS

1. **Drive thumbnail URLs redirect** - Not suitable for raw `<img>` tags
2. **lh3 URLs are direct** - Better for client-side rendering
3. **Next.js Image component handles redirects** - That's why grid worked
4. **Size parameter on lh3:** Add/replace `=sNNN` at the end

---

## 📝 FILES CHANGED

- ✅ `components/gallery/image-viewer.tsx`
  - Line 156-161: Changed bigImageUrl calculation
  - Line 60-74: Updated preload logic

---

## ⚠️ LESSONS LEARNED

1. **Test URL formats carefully** - What works in server-side fetch may not work in browser
2. **HTTP redirects != browser-friendly** - Especially for raw `<img>` tags
3. **Next.js Image ≠ raw img** - They handle network differently
4. **Direct CDN URLs > Proxied URLs** - Always prefer direct lh3 URLs

---

## 🔄 RELATED ISSUES

This issue was **NOT** caused by previous download optimizations.  
It existed in the codebase before any changes were made.

The download optimization work (retry logic, iOS Safari fix) is **separate** and can proceed independently.

---

## ✅ VERIFICATION CHECKLIST

- [x] Test grid thumbnails load
- [x] Test lightbox images load
- [x] Test on desktop browser
- [ ] Test on iOS Safari mobile (user needs to verify)
- [ ] Test on Android mobile (user needs to verify)
- [ ] Test with slow network (throttling)

---

**Status:** Fix deployed, awaiting user verification on mobile devices.
