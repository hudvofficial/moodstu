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

import {
  Settings,
  History,
  ChevronRight,
} from "lucide-react";

/* ═══════════════════════════════════════════
   Settings View — Main Client Component
   V2 = detail-grid 8/4 + SSOT tokens
   ═══════════════════════════════════════════ */

interface SettingsViewProps {
  employee: EmployeeProfile;
  notificationPrefs: NotificationPreferences;
  isAdmin: boolean;
}

export default function SettingsView({
  employee,
  notificationPrefs,
  isAdmin,
}: SettingsViewProps) {
  const router = useRouter();
  const [editOpen, setEditOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const [prefs, setPrefs] = useState(notificationPrefs);
  const [isPending, startTransition] = useTransition();

  // ─── Toggle notification preference (optimistic) ───
  const togglePref = useCallback(
    (key: keyof NotificationPreferences, value: boolean) => {
      // Optimistic update
      setPrefs((prev) => ({ ...prev, [key]: value }));

      startTransition(async () => {
        const result = await updateNotificationPreferences({ [key]: value });
        if (!result.success) {
          // Revert on failure
          setPrefs((prev) => ({ ...prev, [key]: !value }));
          toast.error(result.error || "Lỗi cập nhật");
        }
      });
    },
    [],
  );

  // ─── Logout ───
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

  // ── Shared sidebar content (reused for mobile) ──
  const sidebarContent = (
    <>
      {/* Admin Links */}
      {isAdmin && (
        <section className="card-base p-4 lg:p-6">
          <h3 className="section-heading mb-3">
            <Settings className="w-4 h-4 inline-block mr-1.5 align-middle" />
            Quản trị hệ thống
          </h3>
          <div className="space-y-1">
            <Link
              href="/settings/studio"
              className="flex items-center justify-between py-3 min-h-[44px] hover:bg-bg-hover -mx-2 px-2 rounded-lg transition-colors"
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
              className="flex items-center justify-between py-3 min-h-[44px] hover:bg-bg-hover -mx-2 px-2 rounded-lg transition-colors"
            >
              <div className="flex items-center gap-3">
                <History className="w-5 h-5 text-text-secondary" />
                <span className="text-sm text-text-primary">
                  Nhật ký hoạt động
                </span>
              </div>
              <ChevronRight className="w-5 h-5 text-text-muted" />
            </Link>
          </div>
        </section>
      )}

      {/* Members (Admin only) */}
      {isAdmin && (
        <MembersSection currentUserEmail={employee.email || ""} />
      )}
    </>
  );

  return (
    <div className="main-container pb-28 lg:pb-12">
      {/* ── Desktop: Grid 8/4 ── */}
      <div className="detail-grid">
        <div className="detail-main">
          {/* ═══ CARD 1: Profile + Logout ═══ */}
          <ProfileCard
            employee={employee}
            onEdit={() => setEditOpen(true)}
            onLogout={handleLogout}
            loggingOut={loggingOut}
          />

          {/* ═══ CARD 2: Notification Prefs ═══ */}
          <NotificationPrefs
            prefs={prefs}
            onToggle={togglePref}
            disabled={isPending}
          />

          {/* ═══ CARD 3: Changelog ═══ */}
          <ChangelogSection />

          {/* Version */}
          <p className="text-center text-xs text-text-muted pt-2 pb-4">
            Mood Studio v{changelog[0]?.version || "?"}
          </p>
        </div>

        {/* Sidebar — Desktop only (detail-sidebar hidden on mobile by CSS) */}
        <div className="detail-sidebar">
          {sidebarContent}
        </div>
      </div>

      {/* ── Mobile-only: sidebar content (detail-sidebar is hidden < lg) ── */}
      <div className="lg:hidden flex flex-col gap-4">
        {sidebarContent}
      </div>

      {/* ═══ EDIT PROFILE MODAL ═══ */}
      <EditProfileModal
        key={String(editOpen)}
        isOpen={editOpen}
        onClose={() => setEditOpen(false)}
        profile={employee}
        isAdmin={isAdmin}
      />
    </div>
  );
}

