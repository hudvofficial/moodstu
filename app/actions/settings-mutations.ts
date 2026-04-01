"use server";

import { withAdmin } from "@/lib/auth_utils";
import { revalidatePath } from "next/cache";
import { fireAuditLog } from "@/lib/audit";
import { studioInfoSchema } from "@/lib/validations/settings.schema";
import type { StudioInfo } from "@/types/settings";

// ═══════════════════════════════════════════
// Settings Mutations — admin-only write ops
// V2 Gold Standard: withAdmin + Zod + Audit + Locking
// @see docs/specs/settings.md §3.3
// ═══════════════════════════════════════════

// ─── UPDATE STUDIO INFO ──────────────────

/** Update studio info with optimistic locking + Zod + Audit */
export async function updateStudioInfo(rawData: Record<string, unknown>) {
  return withAdmin(async (adminClient) => {
    // ── Zod validation ──
    const parsed = studioInfoSchema.safeParse(rawData);
    if (!parsed.success) {
      const firstError = parsed.error.issues[0]?.message || "Dữ liệu không hợp lệ";
      throw new Error(firstError);
    }

    const { expected_updated_at, ...updateFields } = parsed.data;

    // ── Fetch old data for audit diff ──
    const { data: oldData } = await adminClient
      .from("studio_info")
      .select("*")
      .limit(1)
      .single();

    if (!oldData) throw new Error("Không tìm thấy thông tin studio");

    // ── Atomic optimistic lock: update only if updated_at matches ──
    let query = adminClient
      .from("studio_info")
      .update({
        ...updateFields,
        updated_at: new Date().toISOString(),
      })
      .eq("id", oldData.id);

    // Nếu client gửi expected_updated_at → thêm điều kiện lock
    if (expected_updated_at) {
      query = query.eq("updated_at", expected_updated_at);
    }

    const { data: updated, error } = await query.select("*").single();

    if (error || !updated) {
      // Nếu không update được row nào → conflict
      if (!updated && !error) {
        throw new Error("Dữ liệu đã bị thay đổi bởi người khác. Vui lòng tải lại trang.");
      }
      throw new Error(`Lỗi cập nhật studio: ${error?.message || "Unknown"}`);
    }

    // ── Audit log ──
    fireAuditLog({
      action: "UPDATE",
      tableName: "studio_info",
      recordId: updated.id,
      oldData: oldData as Record<string, unknown>,
      newData: updated as Record<string, unknown>,
      description: `Cập nhật thông tin studio: ${updateFields.name}`,
      source: "server_action",
    });

    revalidatePath("/settings");
    return updated as StudioInfo;
  });
}

// ─── DISCONNECT GOOGLE CALENDAR ──────────

/** Disconnect Google Calendar (admin only) */
export async function disconnectGoogleCalendar() {
  return withAdmin(async (adminClient) => {
    const { data: studio } = await adminClient
      .from("studio_info")
      .select("id, google_calendar_auth")
      .limit(1)
      .single();

    if (!studio) throw new Error("Không tìm thấy thông tin studio");

    const { error } = await adminClient
      .from("studio_info")
      .update({
        google_calendar_auth: null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", studio.id);

    if (error) throw new Error(`Lỗi ngắt kết nối: ${error.message}`);

    // Audit log
    fireAuditLog({
      action: "UPDATE",
      tableName: "studio_info",
      recordId: studio.id,
      description: "Ngắt kết nối Google Calendar",
      oldData: { google_calendar_auth: studio.google_calendar_auth },
      newData: { google_calendar_auth: null },
      source: "server_action",
    });

    revalidatePath("/settings");
    return null;
  });
}
