import { Suspense } from "react";
import { redirect } from "next/navigation";
import { fetchCreditCards } from "@/app/actions/finance-operations-queries";
import CreditCardsClient from "@/components/settings/credit-cards/credit-cards-client";
import { getAuthenticatedUserContext } from "@/lib/auth_utils";

// 
export const dynamic = "force-dynamic";

export const metadata = {
  title: "Thẻ tín dụng",
};

async function CreditCardsDataSection() {
  const context = await getAuthenticatedUserContext({ bootstrapProfile: true });
  if (!context) redirect("/login");
  if (!context.canManageSettings) redirect("/settings");

  const response = await fetchCreditCards();
  const cards = response.success ? response.data : [];

  return <CreditCardsClient initialCards={cards} />;
}

export default function CreditCardsPage() {
  return (
    <div className="main-container py-6 lg:py-10">
      <Suspense
        fallback={
          <div className="grid gap-4 sm:grid-cols-2 animate-pulse">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="card-base p-5 space-y-4">
                <div className="h-5 w-32 bg-bg-hover rounded" />
                <div className="h-4 w-40 bg-bg-hover rounded" />
                <div className="h-3 w-24 bg-bg-hover rounded" />
              </div>
            ))}
          </div>
        }
      >
        <CreditCardsDataSection />
      </Suspense>
    </div>
  );
}
