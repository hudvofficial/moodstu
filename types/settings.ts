export interface BankInfo {
  bank_name?: string;
  account_number?: string;
  account_name?: string;
  branch?: string;
}

export interface SocialLinks {
  website?: string;
  facebook?: string;
  instagram?: string;
}

export interface WorkingHours {
  monday_friday?: string;
  saturday_sunday?: string;
}

export interface GoogleCalendarAuth {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  updated_at: string;
}

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

export interface NotificationPreferences {
  employee_id?: string;
  onsite_reminder: boolean;
  deadline_reminder: boolean;
  overdue_alert: boolean;
  task_assignment: boolean;
  system_alerts: boolean;
  updated_at?: string;
}

export const DEFAULT_NOTIFICATION_PREFERENCES: NotificationPreferences = {
  onsite_reminder: true,
  deadline_reminder: true,
  overdue_alert: true,
  task_assignment: true,
  system_alerts: true,
};

export interface SettingsPageData {
  employee: EmployeeProfile;
  notificationPrefs: NotificationPreferences;
  canManageSettings: boolean;
  canManageMembers: boolean;
}

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
}
