import { Suspense } from "react";
import { redirect } from "next/navigation";
import { getStudioInfoAdmin } from "@/app/actions/settings-queries";
import StudioInfoForm from "@/components/settings/studio-info-form";

export const metadata = { title: "Thông tin studio" };

export const dynamic = "force-dynamic";

/* ═══════════════════════════════════════════
   Studio Settings Page — Admin Only
   Server Component with admin guard
   ═══════════════════════════════════════════ */

async function StudioDataSection() {
  const result = await getStudioInfoAdmin();

  // withAdmin returns { success, data, error }
  if (!result.success) {
    redirect("/settings");
  }

  return (
    <StudioInfoForm
      studioInfo={result.data.studioInfo}
      moodieAiSettings={result.data.moodieAiSettings}
      moodieProviderSettings={result.data.moodieProviderSettings}
      moodieVoiceSettings={result.data.moodieVoiceSettings}
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
