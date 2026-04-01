/**
 * 📦 Settings Module Types (V2)
 *
 * Centralized types for studio_info, notification_preferences,
 * and Settings module data structures.
 *
 * SSOT: This is the ONLY place StudioInfo is defined.
 * @see docs/specs/settings.md §4.1
 */

// ─── JSONB Sub-Types ──────────────────────────────

/** Bank info (JSONB column in studio_info) */
export interface BankInfo {
  bank_name?: string;
  account_number?: string;
  account_name?: string;
  branch?: string;
}

/** Social links (JSONB column in studio_info) */
export interface SocialLinks {
  website?: string;
  facebook?: string;
  instagram?: string;
}

/** Working hours (JSONB column in studio_info) */
export interface WorkingHours {
  monday_friday?: string;
  saturday_sunday?: string;
}

/** Google Calendar OAuth tokens (JSONB column in studio_info) */
export interface GoogleCalendarAuth {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  updated_at: string;
}

// ─── Studio Info (DB Row) ─────────────────────────

/** Studio info from `studio_info` table (single row) */
export interface StudioInfo {
  id: string;
  name: string;
  address: string | null;
  hotline: string | null;
  representative: string | null;
  logo_url: string | null;
  bank_info: BankInfo | null;
  social_links: SocialLinks | null;
  working_hours: WorkingHours | null;
  timezone: string | null;
  google_calendar_auth: GoogleCalendarAuth | null;
  created_at: string | null;
  updated_at: string | null;
}

// ─── Notification Preferences ─────────────────────

/** Notification preferences per employee */
export interface NotificationPreferences {
  employee_id?: string;
  onsite_reminder: boolean;
  deadline_reminder: boolean;
  overdue_alert: boolean;
  task_assignment: boolean;
  system_alerts: boolean;
  updated_at?: string;
}

// ─── Settings Page Data ───────────────────────────

/** Combined data for the settings page (parallel fetch) */
export interface SettingsPageData {
  employee: EmployeeProfile;
  notificationPrefs: NotificationPreferences;
  isAdmin: boolean;
}

/** Employee profile fields editable in Settings */
export interface EmployeeProfile {
  id: string;
  full_name: string;
  email: string | null;
  phone: string | null;
  avatar_url: string | null;
  department: string | null;
  position: string | null;
  role: string | null;
  gender: string | null;
  bank_name: string | null;
  bank_account_no: string | null;
  bank_account_name: string | null;
}
