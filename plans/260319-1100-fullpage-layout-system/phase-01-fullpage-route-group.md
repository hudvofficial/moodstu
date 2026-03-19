# Phase 01: (fullpage) Route Group + Layout
Status: ✅ Complete
Dependencies: None

## Objective
Tạo route group `(fullpage)` với layout riêng — chỉ auth check + Toaster,
không có AppShell (Sidebar + Header bị loại bỏ hoàn toàn).

## Tasks
- [ ] Tạo `app/(fullpage)/layout.tsx`
  - Copy auth logic từ `(protected)/layout.tsx`
  - Bỏ `<AppShell>` wrapper
  - Giữ `<Toaster>` + `bg-bg-base` + `min-h-screen`
- [ ] Verify: route group không ảnh hưởng URL (Next.js transparent)

## Files to Create
- `app/(fullpage)/layout.tsx` — auth-only layout, no AppShell

## Layout Code Spec
```tsx
// app/(fullpage)/layout.tsx
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { Toaster } from "sonner";

export default async function FullpageLayout({ children }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  return (
    <div className="min-h-screen bg-bg-base">
      {children}
      <Toaster position="top-right" toastOptions={{ ... }} />
    </div>
  );
}
```

## Test Criteria
- [ ] `/contracts/create` vẫn accessible sau login
- [ ] Không có Sidebar trên trang create
- [ ] Không có Header (app header) trên trang create
- [ ] Redirect về `/login` nếu chưa đăng nhập

---
Next Phase: phase-02-fullpage-form-shell.md
