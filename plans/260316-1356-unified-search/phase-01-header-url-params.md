# Phase 01: Header → URL Params
Status: ⬜ Pending
Dependencies: None

## Objective
Header search ghi vào URL `?q=xxx` thay vì local state.
Mobile search overlay cũng ghi vào URL.

## Files to Modify
- `components/layout/header.tsx`

## Implementation Steps

1. [ ] Import `useRouter`, `useSearchParams` từ `next/navigation`
2. [ ] Đọc initial value từ URL: `searchParams.get('q') || ""`
3. [ ] Thay `setSearchTerm` → debounced `router.replace` 
4. [ ] Desktop input: `value` đọc từ URL param, `onChange` debounce → URL
5. [ ] Mobile overlay: Cùng logic — gõ → debounce → URL
6. [ ] Mobile close (✕): Clear URL param `router.replace(pathname)`
7. [ ] Input value hiển thị từ local state (instant), URL update debounced

## Technical Notes
- Dùng `useRef` cho debounce timer (không cần library)
- `router.replace` KHÔNG `router.push` (tránh history spam)
- Local state vẫn cần cho instant input feedback, URL là debounced mirror
- ⌘K badge giữ nguyên
- Lesson #57: wrapper div cho responsive — ĐÃ CÓ SẴN, không sửa

## Test Criteria
- [ ] Desktop: gõ search → URL cập nhật sau 300ms
- [ ] Mobile: mở overlay → gõ → URL cập nhật
- [ ] Mobile close: URL param cleared
- [ ] F5: search term persist
- [ ] ⌘K badge vẫn hiện

---
Next Phase: phase-02-pages-read-url.md
