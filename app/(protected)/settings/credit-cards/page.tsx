import { Suspense } from "react";
import { redirect } from "next/navigation";
import type { CreditCardOption } from "@/app/actions/finance-operations-queries";
import CreditCardsClient from "@/components/settings/credit-cards/credit-cards-client";
import { getAuthenticatedUserContext } from "@/lib/auth_utils";
import { createAdminClient } from "@/lib/supabase/server";

// 
export const dynamic = "force-dynamic";

export const metadata = {
  title: "Thẻ tín dụng",
};

async function CreditCardsDataSection() {
  // Authentication and the independent read start together. Nothing is returned
  // until the cached protected-layout context confirms settings-admin access.
  const contextPromise = getAuthenticatedUserContext();
  const cardsPromise = createAdminClient().then((adminClient) =>
    adminClient
      .from("credit_cards")
      .select("id, bank_name, last_4, statement_day, due_day, credit_limit, updated_at")
      .is("deleted_at", null)
      .order("bank_name", { ascending: true }),
  );
  const [context, cardsResult] = await Promise.all([contextPromise, cardsPromise]);

  if (!context) redirect("/login");
  if (!context.canManageSettings) redirect("/settings");
  if (cardsResult.error) {
    throw new Error(`Không thể tải danh sách thẻ tín dụng: ${cardsResult.error.message}`);
  }
  const cards = (cardsResult.data || []) as CreditCardOption[];

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
