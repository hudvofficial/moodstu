import { Suspense } from "react";
import { getSettingsPageData } from "@/app/actions/settings-queries";
import SettingsView from "@/components/settings/settings-view";
import SettingsLoading from "./loading";

/* ═══════════════════════════════════════════
   Settings Page — Server Component
   Fetches employee profile + notification prefs + admin check
   ═══════════════════════════════════════════ */

async function SettingsDataSection() {
  const data = await getSettingsPageData();

  if (!data) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <p className="text-body text-text-secondary">Không tìm thấy dữ liệu</p>
      </div>
    );
  }

  return (
    <SettingsView
      employee={data.employee}
      notificationPrefs={data.notificationPrefs}
      isAdmin={data.isAdmin}
    />
  );
}

export default function SettingsPage() {
  return (
    <Suspense fallback={<SettingsLoading />}>
      <SettingsDataSection />
    </Suspense>
  );
}
