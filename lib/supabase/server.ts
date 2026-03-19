// ═══════════════════════════════════════════
// Supabase Server Client (Server Components / Actions)
// Pattern from V1 — uses cookies for session
// ═══════════════════════════════════════════

import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { cache } from "react";

// Regular client — uses user's JWT, subject to RLS
export const createClient = cache(async () => {
  const cookieStore = await cookies();

  return createServerClient(
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
export const createAdminClient = cache(async () => {
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      cookies: {
        getAll() { return []; },
        setAll() { },
      },
    }
  );
});

