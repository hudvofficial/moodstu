"use server";

import { withDressesAccess } from "@/lib/auth_utils";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database.types";
import type { DressRental } from "@/types/dress";

export type { DressRental } from "@/types/dress";

const RENTAL_STATUSES = new Set(["reserved", "renting", "returned", "overdue", "cancelled"]);

function cleanText(value: string | undefined | null, maxLength = 120) {
  const text = value?.trim();
  return text ? text.slice(0, maxLength) : undefined;
}

function cleanPage(value: number | undefined) {
  return Number.isFinite(value) && Number(value) > 0 ? Math.floor(Number(value)) : 1;
}

function cleanPageSize(value: number | undefined) {
  const size = Number.isFinite(value) && Number(value) > 0 ? Math.floor(Number(value)) : 20;
  return Math.min(Math.max(size, 1), 100);
}

function isMissingRpc(error: { message?: string; code?: string } | null) {
  const message = error?.message?.toLowerCase() || "";
  return message.includes("could not find the function") || error?.code === "PGRST202";
}

export async function fetchRentalsByItem(itemId: string) {
  return withDressesAccess(async (supabase: SupabaseClient<Database>) => {
    const { data, error } = await supabase
      .from("dress_rentals")
      .select("*")
      .eq("item_id", itemId)
      .order("created_at", { ascending: false })
      .limit(50);

    if (error) throw new Error(error.message);
    return (data || []) as DressRental[];
  });
}

export async function fetchAllRentals(filters?: {
  status?: string;
  search?: string;
  itemId?: string;
  page?: number;
  pageSize?: number;
}) {
  return withDressesAccess(async (supabase: SupabaseClient<Database>) => {
    const page = cleanPage(filters?.page);
    const pageSize = cleanPageSize(filters?.pageSize);
    const status =
      filters?.status && RENTAL_STATUSES.has(filters.status) ? filters.status : undefined;
    const search = cleanText(filters?.search);
    const itemId = filters?.itemId || undefined;

    const rpc = await supabase.rpc("dress_rental_list", {
      p_status: status ?? undefined,
      p_search: search ?? undefined,
      p_page: page,
      p_limit: pageSize,
      p_item_id: itemId ?? undefined,
    });

    if (!rpc.error && rpc.data && typeof rpc.data === "object") {
      const payload = rpc.data as {
        rentals?: DressRental[];
        total?: number;
        page?: number;
        pageSize?: number;
        limit?: number;
      };

      return {
        rentals: payload.rentals || [],
        total: Number(payload.total || 0),
        page: Number(payload.page || page),
        pageSize: Number(payload.pageSize || payload.limit || pageSize),
      };
    }

    if (rpc.error && !isMissingRpc(rpc.error)) {
      throw new Error(rpc.error.message);
    }

    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    let query = supabase
      .from("dress_rentals")
      .select("*, dresses!inner(name, item_code, image_url)", { count: "exact" });

    if (status) query = query.eq("status", status);
    if (itemId) query = query.eq("item_id", itemId);

    if (search) {
      const safe = search.replace(/%/g, "\\%").replace(/_/g, "\\_");
      query = query.or(`customer_name.ilike.%${safe}%,phone.ilike.%${safe}%`);
    }

    const { data, error, count } = await query
      .order("created_at", { ascending: false })
      .range(from, to);

    if (error) throw new Error(error.message);

    const rentals: DressRental[] = (data || []).map((row: Record<string, unknown>) => {
      const item = row.dresses as Record<string, unknown> | null;
      return {
        ...row,
        item_name: (item?.name as string) || "",
        item_code: (item?.item_code as string) || "",
        item_image: (item?.image_url as string | null) || null,
        dresses: undefined,
      } as unknown as DressRental;
    });

    return { rentals, total: count || 0, page, pageSize };
  });
}

export async function fetchActiveRental(itemId: string) {
  return withDressesAccess(async (supabase: SupabaseClient<Database>) => {
    const { data, error } = await supabase
      .from("dress_rentals")
      .select("*")
      .eq("item_id", itemId)
      .in("status", ["reserved", "renting", "overdue"])
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) throw new Error(error.message);
    return data as DressRental | null;
  });
}
