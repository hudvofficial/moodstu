import { fetchFinanceCategories } from "@/app/actions/finance-operations-queries";
import { CategoriesClient } from "@/components/finance/categories/categories-client";
import type { ActionResult, FinanceCategory } from "@/types/finance-operations";

function unwrap<T>(result: ActionResult<T>, fallback: T): T {
  return result.success ? result.data : fallback;
}

export const metadata = { title: "Danh mục thu chi | Mood Studio" };
export const dynamic = "force-dynamic";

export default async function CategoriesPage() {
  const categories = await fetchFinanceCategories("all");
  return <CategoriesClient initialData={unwrap<FinanceCategory[]>(categories, [])} />;
}
