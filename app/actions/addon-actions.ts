"use server";

import { withAuth } from "@/lib/auth_utils";

// ═══════════════════════════════════════════
// Addon History Actions — Search + Upsert
// V1 ref: addon.ts (75 lines)
// V2: withAuth (V1 already used withAuth)
// ═══════════════════════════════════════════

export interface AddonHistoryItem {
  id: string;
  addon_name: string;
  addon_category: string;
  last_price: number;
  usage_count: number;
}

export async function searchAddonHistory(term: string, category?: string): Promise<AddonHistoryItem[]> {
  if (!term || term.length < 2) return [];

  const result = await withAuth(async (supabase) => {
    let query = supabase
      .from("addon_history")
      .select("id, addon_name, addon_category, last_price, usage_count")
      .ilike("addon_name", `%${term}%`)
      .order("usage_count", { ascending: false })
      .limit(5);

    if (category && category !== "other") query = query.eq("addon_category", category);
    const { data, error } = await query;
    if (error) throw error;
    return (data as AddonHistoryItem[]) || [];
  });

  if (!result.success) return [];
  return result.data;
}

export async function upsertAddonHistory(name: string, category: string, price: number): Promise<void> {
  if (!name.trim()) return;

  await withAuth(async (supabase) => {
    const { data: existing } = await supabase
      .from("addon_history")
      .select("id, usage_count")
      .eq("addon_name", name.trim())
      .eq("addon_category", category)
      .single();

    if (existing) {
      await supabase.from("addon_history").update({ last_price: price, usage_count: existing.usage_count + 1, updated_at: new Date().toISOString() }).eq("id", existing.id);
    } else {
      await supabase.from("addon_history").insert({ addon_name: name.trim(), addon_category: category, last_price: price, usage_count: 1 });
    }
  });
}
