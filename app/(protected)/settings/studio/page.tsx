import { Suspense } from "react";
import { redirect } from "next/navigation";
import StudioInfoForm from "@/components/settings/studio-info-form";
import { getAuthenticatedUserContext } from "@/lib/auth_utils";
import { loadStudioSettingsAdminData } from "@/lib/settings-studio-admin";
import { createAdminClient } from "@/lib/supabase/server";

export const metadata = { title: "Thông tin studio" };

export const dynamic = "force-dynamic";

/* ═══════════════════════════════════════════
   Studio Settings Page — Admin Only
   Server Component with admin guard
   ═══════════════════════════════════════════ */

async function StudioDataSection() {
  const contextPromise = getAuthenticatedUserContext();
  const dataPromise = createAdminClient().then(loadStudioSettingsAdminData);
  const [context, data] = await Promise.all([contextPromise, dataPromise]);

  if (!context?.canManageSettings) redirect("/settings");

  return (
    <StudioInfoForm
      studioInfo={data.studioInfo}
      moodieAiSettings={data.moodieAiSettings}
      moodieProviderSettings={data.moodieProviderSettings}
      moodieVoiceSettings={data.moodieVoiceSettings}
      moodieBraveSettings={data.moodieBraveSettings}
    />
  );
}

export default function StudioSettingsPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-bg-base pb-24 lg:pb-12">
          <div className="h-14 bg-bg-card" />
          <div className="main-container">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="card-base p-6 animate-pulse">
                <div className="h-5 w-32 bg-bg-hover rounded mb-4" />
                <div className="space-y-3">
                  <div className="h-11 bg-bg-hover rounded" />
                  <div className="h-11 bg-bg-hover rounded" />
                </div>
              </div>
            ))}
          </div>
        </div>
      }
    >
      <StudioDataSection />
    </Suspense>
  );
}
