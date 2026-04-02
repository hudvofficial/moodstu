import { Suspense } from "react";
import { getSettingsPageData } from "@/app/actions/settings-queries";
import SettingsView from "@/components/settings/settings-view";
import SettingsLoading from "./loading";

async function SettingsDataSection() {
  const data = await getSettingsPageData();

  return (
    <SettingsView
      employee={data.employee}
      notificationPrefs={data.notificationPrefs}
      canManageSettings={data.canManageSettings}
      canManageMembers={data.canManageMembers}
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
