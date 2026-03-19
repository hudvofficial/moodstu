# Design Pattern: Shared Scroll Container (Explicit Ref Tracking)

## Problem
In applications where the layout root is set to `overflow-hidden` (common for sidebar/header persistence on mobile), `window.scrollY` remains `0` even when the user scrolls the content area.

Traditional hooks that listen to `window` scroll events will fail to detect movement.

## Solution: Context-Based Ref Sharing
Instead of hardcoding element IDs or using `document.getElementById`, we use a React Context to share the `RefObject` of the actual scrollable element.

### 1. Create the Context
```tsx
const ScrollContainerContext = createContext<RefObject<HTMLElement | null>>({ current: null });
```

### 2. Provide the Ref in the Root Layout
```tsx
const mainRef = useRef<HTMLElement>(null);
// ...
<ScrollContainerProvider value={mainRef}>
  <Header />
  <main ref={mainRef}>
    {children}
  </main>
</ScrollContainerProvider>
```

### 3. Consume in Hooks/Components
The hook should be modified to accept an optional `containerRef` and attach listeners to `ref.current` instead of `window`.

```tsx
const scrollRef = useScrollContainer();
const { isVisible } = useScrollDirection({ containerRef: scrollRef });
```

## Benefits
- **Backward Compatibility**: Hooks can still fall back to `window` if no ref is provided.
- **Decoupling**: Components don't need to know the ID or structure of the shell to track its scroll.
- **Reliability**: Works with React's ref lifecycle, preventing errors on unmount/remount.

## Implementation (V2 Mood Studio)
- Context: `contexts/scroll-container.tsx`
- Provider: `components/layout/app-shell.tsx`
- Consumer: `components/layout/header.tsx` & `components/layout/fullpage-form-shell.tsx`
