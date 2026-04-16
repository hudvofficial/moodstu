import { Suspense } from "react";
import { fetchCreditCards } from "@/app/actions/finance-operations-queries";
import CreditCardsClient from "@/components/settings/credit-cards/credit-cards-client";

export const metadata = {
    title: "Quản lý thẻ tín dụng",
};

export default async function CreditCardsPage() {
    const resp = await fetchCreditCards();
    const cards = (resp as any).data || [];

    return (
        <div className="main-container py-6 lg:py-10">
            <Suspense fallback={<div>Loading...</div>}>
                <CreditCardsClient initialCards={cards} />
            </Suspense>
        </div>
    );
}
