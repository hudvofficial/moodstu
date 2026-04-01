"use client";

import { Switch } from "@/components/ui/switch";
import type { NotificationPreferences } from "@/types/settings";
import { Calendar, Clock, AlertTriangle, UserCheck, Info } from "lucide-react";

/* ═══════════════════════════════════════════
   Notification Preferences — V2 Gold Standard
   V1 logic 100% + Radix Switch + SSOT tokens
   ═══════════════════════════════════════════ */

interface NotificationPrefsProps {
  prefs: NotificationPreferences;
  onToggle: (key: keyof NotificationPreferences, value: boolean) => void;
  disabled: boolean;
}

// ─── Pref config (SSOT — single source for label + icon + key)
const PREF_ITEMS: {
  key: keyof NotificationPreferences;
  label: string;
  icon: React.ElementType;
}[] = [
  { key: "onsite_reminder", label: "Nhắc lịch on-set", icon: Calendar },
  { key: "deadline_reminder", label: "Nhắc deadline", icon: Clock },
  { key: "overdue_alert", label: "Cảnh báo trễ hạn", icon: AlertTriangle },
  { key: "task_assignment", label: "Phân công công việc", icon: UserCheck },
  { key: "system_alerts", label: "Thông báo hệ thống", icon: Info },
];

export default function NotificationPrefs({
  prefs,
  onToggle,
  disabled,
}: NotificationPrefsProps) {
  return (
    <section className="card-base p-4 lg:p-6">
      <h3 className="section-heading mb-3">
        <Info className="w-4 h-4 inline-block mr-1.5 align-middle" />
        Cài đặt thông báo
      </h3>
      <div className="space-y-1">
        {PREF_ITEMS.map(({ key, label, icon: Icon }) => (
          <div
            key={key}
            className="flex items-center justify-between py-3 min-h-[44px]"
          >
            <div className="flex items-center gap-3">
              <Icon className="w-5 h-5 text-text-secondary shrink-0" />
              <span className="text-sm text-text-primary">{label}</span>
            </div>
            <Switch
              checked={!!prefs[key]}
              onCheckedChange={(v) => onToggle(key, v)}
              disabled={disabled}
              id={`pref-${key}`}
              aria-label={label}
            />
          </div>
        ))}
      </div>
    </section>
  );
}
