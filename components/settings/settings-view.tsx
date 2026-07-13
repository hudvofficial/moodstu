"use client";

import { useState, useCallback, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import dynamic from "next/dynamic";
import { createClient } from "@/lib/supabase/client";
import { updateNotificationPreferences } from "@/app/actions/notification-actions";
import { toast } from "@/lib/toast-manager";
import type {
  EmployeeProfile,
  NotificationPreferences,
} from "@/types/settings";
import ProfileCard from "./profile-card";
import NotificationPrefs from "./notification-prefs";
import MembersSection from "./members-section";
import ChangelogSection from "./changelog-section";
import { Settings, History, ChevronRight, CreditCard } from "lucide-react";
import type { AuthUsersPage } from "@/app/actions/user-management";
import { useRealtimeSignal } from "@/hooks/use-realtime-signal";

const EditProfileModal = dynamic(() => import("./edit-profile-modal"), {
  ssr: false,
});

interface SettingsViewProps {
  employee: EmployeeProfile;
  notificationPrefs: NotificationPreferences;
  canManageSettings: boolean;
  canManageMembers: boolean;
  initialMembers?: AuthUsersPage;
}

export default function SettingsView({
  employee,
  notificationPrefs,
  canManageSettings,
  canManageMembers,
  initialMembers,
}: SettingsViewProps) {
  const router = useRouter();
  const [currentEmployee, setCurrentEmployee] = useState(employee);
  const [editOpen, setEditOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const [prefs, setPrefs] = useState(notificationPrefs);
  const [isPending, startTransition] = useTransition();
  const appVersion = process.env.NEXT_PUBLIC_APP_VERSION || "?";
  const buildDate = process.env.NEXT_PUBLIC_BUILD_DATE;

  const [syncedEmployee, setSyncedEmployee] = useState(employee);
  if (syncedEmployee !== employee) {
    setSyncedEmployee(employee);
    setCurrentEmployee(employee);
  }

  const [syncedNotificationPrefs, setSyncedNotificationPrefs] = useState(notificationPrefs);
  if (syncedNotificationPrefs !== notificationPrefs) {
    setSyncedNotificationPrefs(notificationPrefs);
    setPrefs(notificationPrefs);
  }

  const refreshSettings = useCallback(() => {
    router.refresh();
  }, [router]);

  useRealtimeSignal("employees", {
    channelName: "settings-profile-realtime",
    debounceMs: 250,
    onChange: refreshSettings,
  });
  useRealtimeSignal("notification_preferences", {
    channelName: "settings-notification-preferences-realtime",
    debounceMs: 250,
    onChange: refreshSettings,
  });

  const togglePref = useCallback(
    (key: keyof NotificationPreferences, value: boolean) => {
      setPrefs((prev) => ({ ...prev, [key]: value }));

      startTransition(async () => {
        const result = await updateNotificationPreferences({ [key]: value });
        if (!result.success) {
          setPrefs((prev) => ({ ...prev, [key]: !value }));
          toast.error(result.error || "Lỗi cập nhật");
        }
      });
    },
    [],
  );

  const handleLogout = async () => {
    setLoggingOut(true);
    try {
      const supabase = createClient();
      await supabase.auth.signOut();
      router.push("/login");
      router.refresh();
    } catch {
      toast.error("Lỗi đăng xuất");
      setLoggingOut(false);
    }
  };

  const sidebarContent = (
    <>
      {canManageSettings && (
        <section className="card-base p-4 lg:p-6">
          <h3 className="section-heading mb-3">
            <Settings className="w-4 h-4 inline-block mr-1.5 align-middle" />
            Quản trị hệ thống
          </h3>
          <div className="space-y-1">
            <Link
              href="/settings/studio"
              prefetch
              className="flex items-center justify-between py-3 min-h-11 hover:bg-bg-hover -mx-2 px-2 rounded-lg transition-colors"
            >
              <div className="flex items-center gap-3">
                <Settings className="w-5 h-5 text-text-secondary" />
                <span className="text-sm text-text-primary">
                  Cài đặt hệ thống
                </span>
              </div>
              <ChevronRight className="w-5 h-5 text-text-muted" />
            </Link>
            <Link
              href="/audit-logs"
              prefetch
              className="flex items-center justify-between py-3 min-h-11 hover:bg-bg-hover -mx-2 px-2 rounded-lg transition-colors"
            >
              <div className="flex items-center gap-3">
                <History className="w-5 h-5 text-text-secondary" />
                <span className="text-sm text-text-primary">
                  Nhật ký hoạt động
                </span>
              </div>
              <ChevronRight className="w-5 h-5 text-text-muted" />
            </Link>
            <Link
              href="/settings/credit-cards"
              prefetch
              className="flex items-center justify-between py-3 min-h-11 hover:bg-bg-hover -mx-2 px-2 rounded-lg transition-colors"
            >
              <div className="flex items-center gap-3">
                <CreditCard className="w-5 h-5 text-text-secondary" />
                <span className="text-sm text-text-primary">
                  Quản lý thẻ tín dụng
                </span>
              </div>
              <ChevronRight className="w-5 h-5 text-text-muted" />
            </Link>
          </div>
        </section>
      )}

      {canManageMembers && (
        <MembersSection
          currentUserEmail={employee.email || ""}
          initialData={initialMembers}
        />
      )}
    </>
  );

  return (
    <div className="main-container pb-28 lg:pb-12">
      <div className="detail-grid">
        <div className="detail-main">
          <ProfileCard
            employee={currentEmployee}
            onEdit={() => setEditOpen(true)}
            onLogout={handleLogout}
            loggingOut={loggingOut}
          />

          <NotificationPrefs
            prefs={prefs}
            onToggle={togglePref}
            disabled={isPending}
          />

          <ChangelogSection />

          <p className="text-center text-xs text-text-muted pt-2 pb-4">
            Mood Studio v{appVersion}
            {buildDate ? (
              <span className="block mt-1">
                Build {new Date(buildDate).toLocaleString("vi-VN")}
              </span>
            ) : null}
          </p>

        </div>

        <div className="detail-sidebar flex!">{sidebarContent}</div>
      </div>

      {editOpen ? (
        <EditProfileModal
          isOpen
          onClose={() => setEditOpen(false)}
          profile={currentEmployee}
          canManageSettings={canManageSettings}
          onSaved={(nextProfile) => setCurrentEmployee(nextProfile)}
        />
      ) : null}
    </div>
  );
}
