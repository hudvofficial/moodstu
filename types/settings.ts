export interface BankInfo {
  bank_name?: string;
  account_number?: string;
  account_name?: string;
  branch?: string;
  bank_bin?: string;
  qr_code_url?: string;
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

export interface GoogleOAuth {
  access_token: string;
  refresh_token: string;
  granted_scopes?: string;
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
  google_oauth: GoogleOAuth | null;
  created_at: string | null;
  updated_at: string | null;
}

export interface MoodieAiSettings {
  hasGeminiKey: boolean;
  geminiKeyMasked: string;
  geminiModel: string;
}

export interface MoodieProviderSettings {
  providerId: "gemini" | "openai_compatible";
  label: string;
  model: string;
  embeddingModel?: string;
  embeddingEnabled: boolean;
  hasKey: boolean;
  keyMasked?: string;
  baseUrl?: string;
  isLocal: boolean;
}

export interface MoodieBraveSettings {
  enabled: boolean;
  hasApiKey: boolean;
  endpoint: string;
  hasMcpToken: boolean;
  mcpUrl: string;
  timeoutMs: number;
  maxResponseBytes: number;
  source: "database" | "environment" | "none";
}

export interface MoodieBrowserSettings {
  enabled: boolean;
  cdpUrl: string;
  hasCdpToken: boolean;
  timeoutMs: number;
  source: "database" | "environment" | "none";
  preferredEngine: "cloakbrowser" | "fetch";
}

export interface MoodieVoiceSettings {
  hasKey: boolean;
  keyMasked?: string;
  model: string;
  engine?: "live" | "cascade";
  liveVoice?: string;
  liveModel?: string;
  realtimeProvider?: "gemini" | "openai";
  hasOpenAIKey?: boolean;
  openaiKeyMasked?: string;
  openaiModel?: string;
  openaiVoice?: string;
}

export interface StudioSettingsAdminData {
  studioInfo: StudioInfo;
  moodieAiSettings: MoodieAiSettings;
  moodieProviderSettings: MoodieProviderSettings;
  moodieVoiceSettings: MoodieVoiceSettings;
  moodieBraveSettings: MoodieBraveSettings;
  moodieBrowserSettings: MoodieBrowserSettings;
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
  initialMembers?: import("@/app/actions/user-management").AuthUsersPage;
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
