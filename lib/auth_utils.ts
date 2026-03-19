// ═══════════════════════════════════════════
// Auth Wrappers for Server Actions
// Pattern: V1 proven — code auth check + admin client for mutations
// ═══════════════════════════════════════════

import { SupabaseClient } from "@supabase/supabase-js";
import { createClient, createAdminClient } from "@/lib/supabase/server";

type ActionResult<T> =
  | { success: true; data: T }
  | { success: false; error: string };

/**
 * 🔓 withAuth — For actions any logged-in employee can do.
 * 1. Checks user is authenticated (via regular client)
 * 2. Uses admin client for DB ops (bypasses RLS)
 */
export async function withAuth<T>(
  action: (supabase: SupabaseClient, userId: string) => Promise<T>,
): Promise<ActionResult<T>> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, error: "Chưa đăng nhập" };
    }

    const adminSupabase = await createAdminClient();
    const result = await action(adminSupabase, user.id);
    return { success: true, data: result };
  } catch (err: unknown) {
    console.error("[withAuth] Error:", err);
    const message = err instanceof Error ? err.message : "Lỗi server";
    return { success: false, error: message };
  }
}

/**
 * 🔒 withAdmin — For admin/manager-only actions.
 * 1. Checks user is authenticated
 * 2. Checks role is admin or manager
 * 3. Uses admin client for DB ops
 */
export async function withAdmin<T>(
  action: (supabase: SupabaseClient, userId: string) => Promise<T>,
): Promise<ActionResult<T>> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, error: "Chưa đăng nhập" };
    }

    // Check role from JWT metadata or employees table
    const jwtRole = user.app_metadata?.role;
    const adminRoles = ["admin", "manager"];

    if (!adminRoles.includes(jwtRole)) {
      // Fallback: check employees table
      const { data: employee } = await supabase
        .from("employees")
        .select("role")
        .eq("auth_user_id", user.id)
        .single();

      if (!employee || !adminRoles.includes(employee.role)) {
        return { success: false, error: "Bạn không có quyền thực hiện thao tác này" };
      }
    }

    const adminSupabase = await createAdminClient();
    const result = await action(adminSupabase, user.id);
    return { success: true, data: result };
  } catch (err: unknown) {
    console.error("[withAdmin] Error:", err);
    const message = err instanceof Error ? err.message : "Lỗi server";
    return { success: false, error: message };
  }
}
