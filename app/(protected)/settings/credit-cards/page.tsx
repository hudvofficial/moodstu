import { Suspense } from "react";
import { fetchCreditCards } from "@/app/actions/finance-operations-queries";
import CreditCardsClient from "@/components/settings/credit-cards/credit-cards-client";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Quản lý thẻ tín dụng",
};

export default async function CreditCardsPage() {
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
