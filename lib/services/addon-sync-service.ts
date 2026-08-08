import type { withAuth } from "@/lib/auth_utils";
import type { Database } from "@/types/database.types";

type AdminSupabase = Parameters<Parameters<typeof withAuth>[0]>[0];

export async function upsertAddonHistoryItems(
  supabase: AdminSupabase,
  items: Array<{
    item_name: string;
    is_addon?: boolean | null;
    addon_category?: string | null;
    unit_price?: number | null;
  }>,
) {
  // Collect addon items that need history tracking
  const addonItems = items.filter(
    (item) => item.is_addon && item.item_name.trim(),
  );
  if (addonItems.length === 0) return;

  // Build lookup keys for batch SELECT
  const lookupKeys = addonItems.map((item) => ({
    name: item.item_name.trim(),
    category: item.addon_category || "khac",
    price: item.unit_price || 0,
  }));

  // Batch SELECT: get all existing records at once
  const { data: existingRecords } = await supabase
    .from("addon_history")
    .select("id, addon_name, addon_category, usage_count")
    .in("addon_name", lookupKeys.map((k) => k.name));

  const existingMap = new Map(
    (existingRecords || []).map((r) => [`${r.addon_name}::${r.addon_category}`, r]),
  );

  const now = new Date().toISOString();
  const toInsert: Database["public"]["Tables"]["addon_history"]["Insert"][] = [];
  const updatePromises: Array<PromiseLike<{ error: { message?: string } | null }>> = [];

  for (const key of lookupKeys) {
    const existing = existingMap.get(`${key.name}::${key.category}`);
    if (existing) {
      updatePromises.push(
        supabase
          .from("addon_history")
          .update({
            last_price: key.price,
            usage_count: (existing.usage_count || 0) + 1,
            last_used_at: now,
            updated_at: now,
          })
          .eq("id", existing.id),
      );
    } else {
      toInsert.push({
        addon_name: key.name,
        addon_category: key.category as Database["public"]["Enums"]["addon_category_enum"],
        last_price: key.price,
        usage_count: 1,
        last_used_at: now,
      });
    }
  }

  // Batch INSERT new + parallel UPDATE existing
  const results = await Promise.all([
    ...(toInsert.length > 0 ? [supabase.from("addon_history").insert(toInsert)] : []),
    ...updatePromises,
  ]);

  const failed = results.find((result) => result.error);
  if (failed?.error) {
    throw new Error(failed.error.message || "Loi cap nhat lich su phat sinh");
  }
}
