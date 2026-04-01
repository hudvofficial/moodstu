import { Suspense } from "react";
import { redirect } from "next/navigation";
import { getStudioInfoAdmin } from "@/app/actions/settings-queries";
import StudioInfoForm from "@/components/settings/studio-info-form";

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

  return <StudioInfoForm studioInfo={result.data} />;
}

export default function StudioSettingsPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-bg-base pb-24 lg:pb-12">
          <div className="h-14 bg-bg-card" />
          <div className="px-4 py-4 lg:max-w-2xl lg:mx-auto space-y-4">
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
