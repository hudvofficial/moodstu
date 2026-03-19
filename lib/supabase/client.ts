// ═══════════════════════════════════════════
// Supabase Browser Client (Client Components)
// Pattern from V1 — proven stable
// ═══════════════════════════════════════════

import { createBrowserClient } from "@supabase/ssr";

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
