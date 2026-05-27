# Gallery Performance Optimization Brainstorm (May 2026)

## 🎯 Goal: State-of-the-art Image Gallery Performance

Target: Sub-1s LCP, 60fps scrolling, instant perceived loading

---

## 1. Modern Image Optimization Techniques (2026)

### A. Next-Gen Image Formats
- **AVIF** (better compression than WebP, ~50% smaller)
- **JPEG XL** (if browser support increases)
- **WebP2** (successor to WebP)
- Automatic format selection based on browser support

### B. Image Delivery Optimization
- **Cloudflare Images** / **Vercel Image Optimization**
  - Automatic format conversion
  - Smart compression
  - Global CDN
  - Edge caching
- **Responsive images** with `srcset` and `sizes`
- **Art direction** for mobile vs desktop

### C. Advanced Placeholders
- **BlurHash** (already planned - good!)
- **SQIP** (SVG-based placeholders)
- **ThumbHash** (newer, better than BlurHash)
- **Blurhash + ThumbHash hybrid**

---

## 2. Loading Strategy Optimizations

### A. Priority Hints (2025+ Standard)
```html
<img fetchpriority="high" /> <!-- Above fold -->
<img fetchpriority="low" />  <!-- Below fold -->
```

### B. Resource Hints
```html
<link rel="preconnect" href="https://drive.google.com" />
<link rel="dns-prefetch" href="https://lh3.googleusercontent.com" />
```

### C. Intersection Observer v2
- **Root margin** for aggressive prefetch (already using)
- **Threshold** tuning for optimal trigger
- **Delay** parameter for scroll performance

### D. Request Prioritization
- Load above-the-fold first (eager)
- Prefetch next viewport while idle
- Defer off-screen images

---

## 3. Virtual Scrolling & Layout

### A. Modern Virtual Scrolling Libraries
- **TanStack Virtual** (formerly react-virtual)
  - Better performance than custom
  - Dynamic sizing
  - Bi-directional scrolling
- **React Virtuoso**
  - Built for masonry/grid
  - Auto-sizing
  - Smooth scrolling

### B. Masonry Layout Optimization
- **CSS Grid with masonry** (experimental but fast)
  ```css
  grid-template-rows: masonry;
  ```
- **Packed layout algorithm** (better than column-based)
- **Pre-calculated positions** (server-side)

### C. Layout Shift Prevention
- **Aspect ratio boxes** (already doing)
- **width/height dimensions** (store in DB - already doing)
- **CSS aspect-ratio** property

---

## 4. Network & Caching Strategy

### A. HTTP/3 & QUIC
- **Parallel requests** without HOL blocking
- **0-RTT connection** resumption
- Better mobile performance

### B. Service Worker Caching
```js
// Cache images aggressively
workbox.routing.registerRoute(
  /\.(jpg|jpeg|png|webp|avif)$/,
  new workbox.strategies.CacheFirst({
    cacheName: 'images',
    plugins: [
      new workbox.expiration.ExpirationPlugin({
        maxEntries: 200,
        maxAgeSeconds: 7 * 24 * 60 * 60, // 7 days
      }),
    ],
  })
);
```

### C. React Query / SWR Optimization
- **Stale-while-revalidate**
- **Background refetch**
- **Prefetching** next pages
- **Infinite query** for smooth pagination

### D. Edge Caching
- **Vercel Edge Functions**
- **Cloudflare Workers**
- Cache at edge, close to users

---

## 5. React & Rendering Optimization

### A. React Server Components (RSC)
- **Server-side data fetching** (0ms on client)
- **Streaming SSR** for progressive loading
- **Partial Prerendering** (PPR) - Next.js 14+

### B. Concurrent Rendering
- **useTransition** for non-blocking updates
- **useDeferredValue** for search/filter
- **Suspense boundaries** for progressive loading

### C. Memoization Strategy
```tsx
const MemoizedImageTile = memo(ImageTile, (prev, next) => 
  prev.image.id === next.image.id && 
  prev.isVisible === next.isVisible
);
```

### D. Code Splitting
- **Dynamic imports** for viewer
- **Route-based splitting**
- **Component-level splitting**

---

## 6. Modern CSS Techniques

### A. Content Visibility API
```css
.image-tile {
  content-visibility: auto;
  contain-intrinsic-size: 300px 400px;
}
```

### B. CSS Containment
```css
.image-tile {
  contain: layout style paint;
}
```

### C. GPU Acceleration
```css
.image {
  transform: translateZ(0);
  will-change: transform;
}
```

### D. View Transitions API
```css
::view-transition-old(image),
::view-transition-new(image) {
  animation-duration: 0.3s;
}
```

---

## 7. Database & Backend Optimization

### A. Database Query Optimization
- **Indexed queries** (already have indexes)
- **Cursor-based pagination** (better than offset)
- **Parallel queries** with Promise.all
- **Supabase Realtime** for updates

### B. Image Metadata Pre-computation
- Store: width, height, aspectRatio, dominantColor, blurHash
- Pre-compute on upload, not on-demand
- Use database computed columns

### C. CDN Strategy
```
User → Vercel Edge → Cloudflare CDN → Google Drive
        ↓ cache           ↓ cache         ↓ origin
```

---

## 8. Advanced Techniques (2026)

### A. Predictive Prefetching
- **ML-based prediction** of next image user will click
- **Scroll velocity** prediction
- **Hover prefetch** (preload on hover)

### B. Adaptive Loading
```js
const quality = navigator.connection.effectiveType === '4g' ? 'high' : 'low';
const format = navigator.connection.saveData ? 'webp' : 'avif';
```

### C. Progressive Enhancement
- Load low-res → mid-res → high-res
- **LQIP** (Low Quality Image Placeholder)
- Blur-up technique

### D. WebAssembly for Image Processing
- **wasm-vips** for client-side resizing
- **Sharp.wasm** for format conversion
- Faster than JavaScript

---

## 9. Monitoring & Metrics

### A. Core Web Vitals
- **LCP** < 2.5s (Largest Contentful Paint)
- **INP** < 200ms (Interaction to Next Paint)
- **CLS** < 0.1 (Cumulative Layout Shift)

### B. Real User Monitoring (RUM)
- **Vercel Analytics**
- **Sentry Performance**
- **Custom timing marks**

### C. Lighthouse CI
- Automated performance testing
- Regression detection

---

## 10. Quick Wins (Prioritized)

### Priority 1 (Immediate - 1 day)
1. ✅ Use proxy API for public galleries
2. ⬜ Enable Next.js Image component
3. ⬜ Add resource hints (preconnect)
4. ⬜ Increase initial batch size to 100+
5. ⬜ Add content-visibility CSS

### Priority 2 (Short-term - 1 week)
6. ⬜ Implement TanStack Virtual
7. ⬜ Add Service Worker caching
8. ⬜ Optimize image formats (WebP/AVIF)
9. ⬜ Add React Query for caching
10. ⬜ Implement blur-up placeholders

### Priority 3 (Medium-term - 1 month)
11. ⬜ Migrate to Cloudflare Images
12. ⬜ Implement RSC for gallery pages
13. ⬜ Add predictive prefetching
14. ⬜ Optimize masonry algorithm
15. ⬜ Add progressive loading

---

## 11. Architecture Recommendations

### Current Architecture Issues
1. ❌ Direct Google Drive URLs (slow, unreliable)
2. ❌ No CDN (single point of failure)
3. ❌ Client-side image loading only
4. ❌ No caching layer between Drive and client
5. ❌ No image optimization pipeline

### Recommended Architecture
```
┌─────────────────────────────────────────────────────┐
│ User Browser                                        │
│  ├─ Service Worker (cache layer 1)                 │
│  ├─ React Query (cache layer 2)                    │
│  └─ Next.js Image Component                        │
└──────────────────┬──────────────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────────────┐
│ Vercel Edge Functions (cache layer 3)              │
│  ├─ Image optimization (format, size)              │
│  └─ Edge caching (geographically distributed)      │
└──────────────────┬──────────────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────────────┐
│ Cloudflare Images / R2 (cache layer 4)             │
│  ├─ Automatic optimization                         │
│  ├─ Global CDN                                     │
│  └─ Resize variants                                │
└──────────────────┬──────────────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────────────┐
│ Google Drive (origin)                               │
│  └─ Source of truth                                │
└─────────────────────────────────────────────────────┘
```

---

## 12. Code Examples

### A. Modern Image Component
```tsx
// app/components/optimized-image.tsx
import NextImage from 'next/image';
import { useInView } from 'react-intersection-observer';

export function OptimizedImage({ src, blurDataURL, ...props }) {
  const { ref, inView } = useInView({
    triggerOnce: true,
    rootMargin: '200px', // Prefetch early
  });

  return (
    <div ref={ref}>
      {inView && (
        <NextImage
          src={src}
          placeholder="blur"
          blurDataURL={blurDataURL}
          quality={85}
          sizes="(max-width: 768px) 100vw, 33vw"
          loading="lazy"
          {...props}
        />
      )}
    </div>
  );
}
```

### B. Virtualized Masonry
```tsx
import { useVirtualizer } from '@tanstack/react-virtual';

function VirtualMasonry({ images }) {
  const parentRef = useRef();
  
  const virtualizer = useVirtualizer({
    count: images.length,
    getScrollElement: () => parentRef.current,
    estimateSize: (i) => images[i].height || 300,
    overscan: 5, // Render 5 items outside viewport
  });

  return (
    <div ref={parentRef} style={{ overflow: 'auto' }}>
      <div style={{ height: virtualizer.getTotalSize() }}>
        {virtualizer.getVirtualItems().map(virtualRow => (
          <ImageTile key={virtualRow.key} image={images[virtualRow.index]} />
        ))}
      </div>
    </div>
  );
}
```

### C. Adaptive Image Quality
```tsx
function useAdaptiveQuality() {
  const [quality, setQuality] = useState('high');

  useEffect(() => {
    const connection = navigator.connection;
    if (!connection) return;

    const updateQuality = () => {
      if (connection.saveData) {
        setQuality('low');
      } else if (connection.effectiveType === '4g') {
        setQuality('high');
      } else {
        setQuality('medium');
      }
    };

    updateQuality();
    connection.addEventListener('change', updateQuality);
    return () => connection.removeEventListener('change', updateQuality);
  }, []);

  return quality;
}
```

---

## 13. Estimated Performance Gains

| Optimization | Current | After | Gain |
|-------------|---------|-------|------|
| LCP (First Load) | ~3-5s | ~1-2s | 60-70% |
| LCP (Cached) | ~1-2s | ~0.3-0.5s | 75% |
| Scroll FPS | ~30fps | ~60fps | 100% |
| Images Loaded/s | ~5-10 | ~30-50 | 300-500% |
| Bandwidth | 100% | ~40-60% | 40-60% saved |
| Memory Usage | 100% | ~30-50% | 50-70% saved |

---

## 14. Implementation Phases

### Phase 1: Foundation (Week 1)
- [ ] Migrate to Next.js Image component
- [ ] Add resource hints
- [ ] Implement Service Worker
- [ ] Add React Query

### Phase 2: Optimization (Week 2-3)
- [ ] Migrate to TanStack Virtual
- [ ] Add CDN (Cloudflare Images)
- [ ] Implement AVIF/WebP
- [ ] Add blur-up placeholders

### Phase 3: Advanced (Week 4+)
- [ ] Implement RSC
- [ ] Add predictive prefetching
- [ ] Optimize masonry algorithm
- [ ] Add monitoring

---

## 15. References & Resources

- [Next.js Image Optimization](https://nextjs.org/docs/app/building-your-application/optimizing/images)
- [TanStack Virtual](https://tanstack.com/virtual/latest)
- [Cloudflare Images](https://www.cloudflare.com/products/cloudflare-images/)
- [Web.dev Image Optimization](https://web.dev/fast/)
- [Chrome DevTools Performance](https://developer.chrome.com/docs/devtools/performance/)

---

**Last Updated**: May 27, 2026
