"use client";

import { Switch } from "@/components/ui/switch";
import type { NotificationPreferences } from "@/types/settings";
import { Calendar, Clock, AlertTriangle, UserCheck, Info, Bell, BellOff } from "lucide-react";
import { usePushSubscription } from "@/hooks/use-push-subscription";
import { Loader2 } from "lucide-react";

interface NotificationPrefsProps {
  prefs: NotificationPreferences;
  onToggle: (key: keyof NotificationPreferences, value: boolean) => void;
  disabled: boolean;
}

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

function PushNotificationToggle() {
  const { isSupported, isSubscribed, isLoading, permission, subscribe, unsubscribe } = usePushSubscription();

  if (!isSupported) {
    return (
      <div className="flex items-center justify-between py-3 min-h-11 opacity-50">
        <div className="flex items-center gap-3">
          <BellOff className="w-5 h-5 text-text-secondary shrink-0" />
          <div>
            <span className="text-sm text-text-primary">Push notification</span>
            <p className="text-micro text-text-muted">Trình duyệt không hỗ trợ</p>
          </div>
        </div>
      </div>
    );
  }

  const handleToggle = async (value: boolean) => {
    if (value) {
      await subscribe();
    } else {
      await unsubscribe();
    }
  };

  return (
    <div className="flex items-center justify-between py-3 min-h-11">
      <div className="flex items-center gap-3">
        <Bell className="w-5 h-5 text-text-secondary shrink-0" />
        <div>
          <span className="text-sm text-text-primary">Push notification</span>
          {permission === "denied" && (
            <p className="text-micro text-warning">Đã bị chặn trong trình duyệt</p>
          )}
        </div>
      </div>
      {isLoading ? (
        <Loader2 className="w-5 h-5 animate-spin text-text-muted" />
      ) : (
        <Switch
          checked={isSubscribed}
          onCheckedChange={handleToggle}
          disabled={permission === "denied"}
          id="pref-push"
          aria-label="Push notification"
        />
      )}
    </div>
  );
}

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
        <PushNotificationToggle />
        <hr className="border-border my-2" />
        {PREF_ITEMS.map(({ key, label, icon: Icon }) => (
          <div
            key={key}
            className="flex items-center justify-between py-3 min-h-11"
          >
            <div className="flex items-center gap-3">
              <Icon className="w-5 h-5 text-text-secondary shrink-0" />
              <span className="text-sm text-text-primary">{label}</span>
            </div>
            <Switch
              checked={!!prefs[key]}
              onCheckedChange={(value) => onToggle(key, value)}
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
