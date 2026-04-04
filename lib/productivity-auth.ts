// ═══════════════════════════════════════════
// productivity-auth.ts — RBAC resolution & timezone helpers
// Extracted from productivity-actions.ts (C1 Audit Fix)
// ═══════════════════════════════════════════

import {
  DEFAULT_STUDIO_TIMEZONE,
} from "@/lib/studio-date";
import { createAdminClient } from "@/lib/supabase/server";
import { getAuthenticatedUserContext } from "@/lib/auth_utils";
import type { ActionResult } from "@/types/common";
import type { ProductivityViewer } from "@/types/productivity";
import {
  PRODUCTIVITY_ALLOWED_ROLES,
  PRODUCTIVITY_TEAM_ROLES,
} from "@/types/productivity-constants";

export type ProductivityViewerContext = ProductivityViewer;

export function isAllowedProductivityRole(role: string): boolean {
  return PRODUCTIVITY_ALLOWED_ROLES.includes(
    role as (typeof PRODUCTIVITY_ALLOWED_ROLES)[number],
  );
}

export function canViewTeam(role: string): boolean {
  return PRODUCTIVITY_TEAM_ROLES.includes(
    role as (typeof PRODUCTIVITY_TEAM_ROLES)[number],
  );
}

export async function getStudioTimezone(
  adminClient: Awaited<ReturnType<typeof createAdminClient>>,
): Promise<string> {
  const { data, error } = await adminClient
    .from("studio_info")
    .select("timezone")
    .limit(1)
    .single();

  if (error) {
    return DEFAULT_STUDIO_TIMEZONE;
  }

  return data?.timezone || DEFAULT_STUDIO_TIMEZONE;
}

export async function resolveProductivityViewerContext(): Promise<
  ActionResult<ProductivityViewerContext>
> {
  const context = await getAuthenticatedUserContext();
  if (!context) {
    return { success: false, error: "Chưa đăng nhập" };
  }

  if (!isAllowedProductivityRole(context.shellRole)) {
    return { success: false, error: "Bạn không có quyền truy cập module này" };
  }

  const adminClient = await createAdminClient();
  const timezone = await getStudioTimezone(adminClient);
  const isLinkedEmployee = Boolean(context.employee?.id);
  const viewMode = canViewTeam(context.shellRole) ? "team" : "self";

  return {
    success: true,
    data: {
      role: context.shellRole,
      viewMode,
      currentEmployeeId: context.employee?.id || null,
      canViewCost: viewMode === "team",
      timezone,
      isLinkedEmployee,
    },
  };
}
