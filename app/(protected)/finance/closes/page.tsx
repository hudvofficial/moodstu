import { redirect } from "next/navigation";
import { listCloses } from "@/app/actions/finance-close-actions";
import { ClosesClient } from "@/components/finance/closes/closes-client";
import { getAuthenticatedUserContext } from "@/lib/auth_utils";
import type { ActionResult, CloseListItem } from "@/types/finance-operations";

function unwrap<T>(result: ActionResult<T>, fallback: T): T {
  return result.success ? result.data : fallback;
}

export const metadata = { title: "Chốt sổ" };
export const dynamic = "force-dynamic";

export default async function ClosesPage() {
  const context = await getAuthenticatedUserContext();
  if (!context) redirect("/login");
  if (context.shellRole !== "admin" && context.shellRole !== "manager") {
    redirect("/finance");
  }

  const year = new Date().getFullYear();
  const data = await listCloses(year);
  return <ClosesClient initialYear={year} initialData={unwrap<CloseListItem[]>(data, [])} />;
}

