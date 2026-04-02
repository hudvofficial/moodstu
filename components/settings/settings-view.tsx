"use client";

import { useState, useCallback, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { updateNotificationPreferences } from "@/app/actions/notification-actions";
import { toast } from "sonner";
import { changelog } from "@/data/changelog";
import type {
  EmployeeProfile,
  NotificationPreferences,
} from "@/types/settings";
import ProfileCard from "./profile-card";
import NotificationPrefs from "./notification-prefs";
import EditProfileModal from "./edit-profile-modal";
import MembersSection from "./members-section";
import ChangelogSection from "./changelog-section";
import { Settings, History, ChevronRight } from "lucide-react";

interface SettingsViewProps {
  employee: EmployeeProfile;
  notificationPrefs: NotificationPreferences;
  canManageSettings: boolean;
  canManageMembers: boolean;
}

export default function SettingsView({
  employee,
  notificationPrefs,
  canManageSettings,
  canManageMembers,
}: SettingsViewProps) {
  const router = useRouter();
  const [editOpen, setEditOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const [prefs, setPrefs] = useState(notificationPrefs);
  const [isPending, startTransition] = useTransition();

  const togglePref = useCallback(
    (key: keyof NotificationPreferences, value: boolean) => {
      setPrefs((prev) => ({ ...prev, [key]: value }));

      startTransition(async () => {
        const result = await updateNotificationPreferences({ [key]: value });
        if (!result.success) {
          setPrefs((prev) => ({ ...prev, [key]: !value }));
          toast.error(result.error || "Loi cap nhat");
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
      toast.error("Loi dang xuat");
      setLoggingOut(false);
    }
  };

  const sidebarContent = (
    <>
      {canManageSettings && (
        <section className="card-base p-4 lg:p-6">
          <h3 className="section-heading mb-3">
            <Settings className="w-4 h-4 inline-block mr-1.5 align-middle" />
            Quan tri he thong
          </h3>
          <div className="space-y-1">
            <Link
              href="/settings/studio"
              className="flex items-center justify-between py-3 min-h-[44px] hover:bg-bg-hover -mx-2 px-2 rounded-lg transition-colors"
            >
              <div className="flex items-center gap-3">
                <Settings className="w-5 h-5 text-text-secondary" />
                <span className="text-sm text-text-primary">
                  Cai dat he thong
                </span>
              </div>
              <ChevronRight className="w-5 h-5 text-text-muted" />
            </Link>
            <Link
              href="/audit-logs"
              className="flex items-center justify-between py-3 min-h-[44px] hover:bg-bg-hover -mx-2 px-2 rounded-lg transition-colors"
            >
              <div className="flex items-center gap-3">
                <History className="w-5 h-5 text-text-secondary" />
                <span className="text-sm text-text-primary">
                  Nhat ky hoat dong
                </span>
              </div>
              <ChevronRight className="w-5 h-5 text-text-muted" />
            </Link>
          </div>
        </section>
      )}

      {canManageMembers && (
        <MembersSection currentUserEmail={employee.email || ""} />
      )}
    </>
  );

  return (
    <div className="main-container pb-28 lg:pb-12">
      <div className="detail-grid">
        <div className="detail-main">
          <ProfileCard
            employee={employee}
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
            Mood Studio v{changelog[0]?.version || "?"}
          </p>

          <div className="lg:hidden flex flex-col gap-4">{sidebarContent}</div>
        </div>

        <div className="detail-sidebar">{sidebarContent}</div>
      </div>

      <EditProfileModal
        key={String(editOpen)}
        isOpen={editOpen}
        onClose={() => setEditOpen(false)}
        profile={employee}
        canManageSettings={canManageSettings}
      />
    </div>
  );
}
