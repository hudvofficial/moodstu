# Vendor Bundle Optimization Plan
**Goal:** Remove vendor gap (309ms → 0ms)

## 🎯 Strategy: Dynamic Imports + Code Splitting

### Phase 1: Dynamic Import Heavy Libraries (Quick Win)

#### 1.1 Chart Libraries (recharts - ~180kB)
```typescript
// Before: import { LineChart } from "recharts"
// After: const LineChart = dynamic(() => import("recharts").then(m => ({ default: m.LineChart })))
```

**Files to update:**
- `components/dashboard/**/*chart*.tsx`
- Any analytics/stats components

#### 1.2 PDF Generation (html2pdf.js - ~120kB)
```typescript
// Only load when user clicks "Export PDF"
const generatePDF = async () => {
  const html2pdf = (await import("html2pdf.js")).default;
  // ... generate PDF
};
```

**Files to update:**
- Contract print components
- Any PDF export features

#### 1.3 QR Code Libraries
```typescript
// qr-code-styling: Load on modal open
// qr-scanner: Load when scanner activates
```

**Files to update:**
- `components/contracts/gallery/share-gallery-modal.tsx` (already lazy!)
- Any QR scanner components

### Phase 2: Remove Unused Dependencies

Check if these are actually used:
- `graphology` + `graphology-communities-louvain` (graph analysis - heavy!)
- `@tanstack/react-virtual` (might be unused)
- `next-view-transitions` (experimental, might not be used)

**Action:** Grep codebase, remove if unused

### Phase 3: Optimize Sentry

```typescript
// next.config.ts - reduce Sentry bundle size
{
  hideSourceMaps: true,
  disableLogger: true,
  widenClientFileUpload: false,
}
```

### Phase 4: Route-based Code Splitting

Ensure heavy routes are split:
- `/finance/*` - Financial charts
- `/gallery/*` - Image libraries
- `/print/*` - PDF generation

**Auto-handled by Next.js App Router ✅**

---

## 📊 Expected Results:

| Library | Size | Strategy | Savings |
|---------|------|----------|---------|
| recharts | ~180kB | Dynamic import | 180kB |
| html2pdf.js | ~120kB | Lazy load | 120kB |
| graphology | ~80kB | Remove if unused | 80kB |
| Sentry | ~50kB | Optimize config | 20kB |

**Total Potential:** ~400kB reduction → **Vendor gap: 309ms → <50ms**

---

## ⚡ Implementation Order:

1. ✅ Audit: Check what's actually used
2. 🔧 Quick wins: Dynamic import recharts + html2pdf
3. 🗑️ Remove unused: graphology, etc.
4. 🎛️ Fine-tune: Sentry config

**ETA:** 2-3 hours
