# Phase 02: FullpageFormShell Component
Status: ✅ Complete
Dependencies: Phase 01

## Objective
Tạo shared component `FullpageFormShell` — encapsulate sticky header + scrollable
content + (optional) right panel. Đây là "token" design pattern dùng chung cho
mọi fullpage form trong hệ thống (contract create/edit, invoice create, v.v.)

## Component API (Props)
```tsx
interface FullpageFormShellProps {
  // Header slots
  breadcrumb: React.ReactNode;      // ← Quay lại danh sách
  headerRight?: React.ReactNode;    // badge, avatar, etc.

  // Content
  children: React.ReactNode;        // LEFT column content

  // Right panel (optional — enables two-column mode on desktop)
  rightPanel?: React.ReactNode;     // Financial summary + actions

  // Config
  maxWidth?: "4xl" | "6xl" | "7xl"; // default: "6xl"
}
```

## Layout Structure
```
<div class="flex h-screen flex-col bg-bg-base">
  <!-- Sticky Header -->
  <header class="sticky top-0 z-50 bg-bg-card/80 backdrop-blur-md border-b border-border-light">
    <div class="mx-auto max-w-6xl px-6 h-16 flex items-center justify-between">
      {breadcrumb}
      {headerRight}
    </div>
  </header>

  <!-- Scrollable Body -->
  <div class="flex-1 overflow-y-auto">
    <div class="mx-auto max-w-6xl px-6 py-8">

      <!-- Two-column on desktop, single on mobile -->
      <div class="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_380px]">

        <!-- LEFT: main form content -->
        <div class="space-y-6">
          {children}
        </div>

        <!-- RIGHT: sticky panel (only if rightPanel prop given) -->
        {rightPanel && (
          <div class="hidden lg:block">
            <div class="sticky top-[80px] space-y-4">
              {rightPanel}
            </div>
          </div>
        )}
      </div>

    </div>
  </div>
</div>
```

## Files to Create
- [x] Tạo `components/layout/fullpage-form-shell.tsx`
  - Props: `breadcrumb`, `headerRight`, `children`, `rightPanel`, `maxWidth`
  - Two-column grid `lg:grid-cols-[1fr_380px]` on desktop
  - Right panel `sticky top-[80px]`, hidden on mobile
  - Single-column fallback nếu không có `rightPanel`

## Tokens Used
- `bg-bg-base`, `bg-bg-card/80`
- `border-border-light`
- `max-w-6xl`, `px-6`, `py-8`
- `gap-6`, `space-y-6`, `space-y-4`
- `z-50`, `backdrop-blur-md`
- `sticky top-0`, `sticky top-[80px]`

## Test Criteria
- [ ] Component render đúng 1 cột khi không có `rightPanel`
- [ ] Component render đúng 2 cột (lg+) khi có `rightPanel`
- [ ] Right panel sticky và không scroll theo content trái
- [ ] Mobile (< lg): right panel ẩn, all content single column
- [ ] Header sticky khi scroll

---
Next Phase: phase-03-contract-form-two-column.md
