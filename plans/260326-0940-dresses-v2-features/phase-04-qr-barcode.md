# Phase 04: QR Scanner + QR Label Print
Status: ⬜ Pending
Dependencies: Phase 02 (drawer to show QR label)
Effort: ~40 min

## Audit Decisions
- Package: Install `qrcode.react` (15KB, SSR-safe, React native SVG)
- Print: CSS `@media print` + `useRef` — NOT `window.open()` (V1 anti-pattern)
- Scan: V1 hidden input pattern OK but fix `setInterval` → `useEffect` focus-once

## Implementation Steps

### 0. Install dependency
```bash
npm install qrcode.react
```

### 1. QR Label Component
- File: `components/dresses/dress-qr-label.tsx` [NEW]
- Props: `{ dressCode: string; dressName: string; size?: string; color?: string; price?: number }`
- Render: `<QRCodeSVG value={dressCode} size={150} level="H" />`
- Print button → `window.print()` with CSS `@media print` scoping
- Add print-only CSS to `app/styles/pages.css`:
  ```css
  @media print {
    body > *:not(.print-target) { display: none !important; }
    .print-target { display: block !important; }
  }
  ```
- Tokens: `card-interactive`, `text-caption`, `text-body-sm`, `tag-badge`
- Icons: lucide `QrCode`, `Printer`

### 2. Scan Input Component
- File: `components/dresses/dress-scan-input.tsx` [NEW]
- Pattern: hidden `sr-only` input, auto-focus on mount
- Fix V1 anti-pattern: `useEffect(() => inputRef.current?.focus(), [isActive])` — NO setInterval
- On scan (Enter key / onChange debounced):
  1. Search `fetchDressList({ search: scannedCode })`
  2. If found → open DressDrawer with result
  3. If not → toast("Không tìm thấy trang phục với mã này")
- Tokens: `btn btn-ghost` (toggle button), animated pulse when active
- Icons: lucide `ScanBarcode`

### 3. Integrate QR Label into Drawer
- Add QR label section to `dress-drawer-content.tsx`
- Only show when dress has `item_code`

### 4. Integrate Scanner into Filter Bar
- Add scan toggle button to `dresses-filters.tsx` or `dresses-list-client.tsx`
- State: `scanActive` → render `<DressScanInput>`

## SSOT Compliance
- Icons: lucide only (QrCode, Printer, ScanBarcode)
- Buttons: `btn btn-ghost` for toggle
- No DOM manipulation (`innerHTML`, `document.getElementById`)
- No `window.open()` for print

## Files to Create/Modify
- [NEW] `components/dresses/dress-qr-label.tsx` (~60 lines)
- [NEW] `components/dresses/dress-scan-input.tsx` (~40 lines)
- [MODIFY] `app/styles/pages.css` — add `@media print` rules (~5 lines)
- [MODIFY] `components/dresses/dress-drawer-content.tsx` — add QR section
- [MODIFY] `components/dresses/dresses-list-client.tsx` — add scan toggle

## Test Criteria
- [ ] QR code renders correctly with dress code
- [ ] Print button → only QR label printed (page hidden)
- [ ] Scan toggle → input focused → scan/type code → dress found → drawer opens
- [ ] Scan not found → toast error
- [ ] No console errors, no memory leaks

---
Next Phase: phase-05-rental-history.md
