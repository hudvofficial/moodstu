// ═══════════════════════════════════════════
// Supabase Server Client (Server Components / Actions)
// Pattern from V1 — uses cookies for session
// ═══════════════════════════════════════════

import { createServerClient } from "@supabase/ssr";
import type { Database } from "@/types/database.types";
import { cookies } from "next/headers";
import { cache } from "react";

// Regular client — uses user's JWT, subject to RLS
export const createClient = cache(async () => {
  const cookieStore = await cookies();

  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // Called from Server Component — can't set cookies
          }
        },
      },
    }
  );
});

// Admin client — bypasses RLS. Use ONLY in Server Actions after manual auth check.
//
// #19 (T-20260911-audit-co-danh-tinh): `actorId` tuỳ chọn = auth.users.id của người đang thao tác.
// Khi có, client gắn header `x-actor-id`; PostgREST đưa header vào `request.headers`, nhờ đó TRIGGER
// nhật ký trong DB (log_audit_action) biết ai làm — trước đây trigger đọc auth.uid(), mà đường ghi của
// app dùng service role nên luôn rỗng (64% dòng nhật ký vô danh vì lý do này).
// Giữ nguyên chữ ký cũ: 110 nơi gọi không tham số vẫn chạy y như trước, chỉ là dòng trigger của chúng
// không mang danh tính. `cache()` của React tách theo tham số nên mỗi actor có client riêng trong request.
export const createAdminClient = cache(async (actorId?: string) => {
  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      cookies: {
        getAll() { return []; },
        setAll() { },
      },
      ...(actorId ? { global: { headers: { "x-actor-id": actorId } } } : {}),
    }
  );
});

