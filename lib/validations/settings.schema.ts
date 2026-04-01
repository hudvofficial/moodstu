/**
 * 📦 Settings Zod Schemas (V2)
 *
 * Validates settings form submissions before DB operations.
 * Follows Gold Standard: contract.schema.ts patterns.
 *
 * @see docs/specs/settings.md §3.5
 */

import { z } from "zod";

// ─── Studio Info Schema ─────────────────────────────

export const bankInfoSchema = z.object({
  bank_name: z.string().max(100, "Tên ngân hàng tối đa 100 ký tự").optional(),
  account_number: z.string().max(50, "Số tài khoản tối đa 50 ký tự").optional(),
  account_name: z.string().max(100, "Tên chủ TK tối đa 100 ký tự").optional(),
  branch: z.string().max(100, "Chi nhánh tối đa 100 ký tự").optional(),
});

export const socialLinksSchema = z.object({
  website: z.string().url("URL website không hợp lệ").or(z.literal("")).optional(),
  facebook: z.string().max(200, "Link Facebook tối đa 200 ký tự").optional(),
  instagram: z.string().max(200, "Link Instagram tối đa 200 ký tự").optional(),
});

export const workingHoursSchema = z.object({
  monday_friday: z.string().optional(),
  saturday_sunday: z.string().optional(),
});

export const studioInfoSchema = z.object({
  name: z.string().min(1, "Tên studio không được trống").max(100, "Tên tối đa 100 ký tự"),
  hotline: z.string().min(1, "Hotline không được trống").max(20, "Hotline tối đa 20 ký tự"),
  address: z.string().max(500, "Địa chỉ tối đa 500 ký tự").optional(),
  representative: z.string().max(100, "Tên người đại diện tối đa 100 ký tự").optional(),
  timezone: z.string().default("Asia/Ho_Chi_Minh"),
  bank_info: bankInfoSchema.optional(),
  social_links: socialLinksSchema.optional(),
  working_hours: workingHoursSchema.optional(),
  // Optimistic lock field
  expected_updated_at: z.string().optional(),
});

export type ValidatedStudioInfo = z.infer<typeof studioInfoSchema>;

// ─── Profile Schema ─────────────────────────────────

export const profileSchema = z.object({
  full_name: z.string().min(1, "Tên không được để trống").max(100, "Tên tối đa 100 ký tự"),
  phone: z.string().max(20, "SĐT tối đa 20 ký tự").optional(),
  gender: z.string().max(20).optional(),
  bank_name: z.string().max(100, "Tên NH tối đa 100 ký tự").optional(),
  bank_account_no: z.string().max(50, "STK tối đa 50 ký tự").optional(),
  bank_account_name: z.string().max(100, "Tên chủ TK tối đa 100 ký tự").optional(),
});

export type ValidatedProfile = z.infer<typeof profileSchema>;

// ─── Notification Preferences Schema ────────────────

export const notificationPrefsSchema = z.object({
  onsite_reminder: z.boolean().optional(),
  deadline_reminder: z.boolean().optional(),
  overdue_alert: z.boolean().optional(),
  task_assignment: z.boolean().optional(),
  system_alerts: z.boolean().optional(),
});

export type ValidatedNotificationPrefs = z.infer<typeof notificationPrefsSchema>;
