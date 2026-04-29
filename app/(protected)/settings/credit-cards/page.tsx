import { Suspense } from "react";
import { redirect } from "next/navigation";
import { fetchCreditCards } from "@/app/actions/finance-operations-queries";
import CreditCardsClient from "@/components/settings/credit-cards/credit-cards-client";
import { getAuthenticatedUserContext } from "@/lib/auth_utils";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Thẻ tín dụng",
};

export default async function CreditCardsPage() {
  const context = await getAuthenticatedUserContext({ bootstrapProfile: true });
  if (!context) redirect("/login");
  if (!context.canManageSettings) redirect("/settings");

  const response = await fetchCreditCards();
  const cards = response.success ? response.data : [];

  return (
    <div className="main-container py-6 lg:py-10">
      <Suspense fallback={<div>Đang tải...</div>}>
        <CreditCardsClient initialCards={cards} />
      </Suspense>
    </div>
  );
}
