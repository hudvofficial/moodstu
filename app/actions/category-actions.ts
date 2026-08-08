"use server";

import { fireAuditLog } from "@/lib/audit";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  requireContractAccess,
  withAuth,
  withServicesAccess,
} from "@/lib/auth_utils";
import { generateServiceCode } from "@/lib/utils/service-utils";
import {
  categoryDeleteSchema,
  categoryUpsertSchema,
  quickCreateServiceSchema,
} from "@/lib/validations/service.schema";
import { revalidatePath } from "next/cache";
import type { ItemType } from "@/types/contract";
import type { Database, Json } from "@/types/database.types";

type CatalogItemType = Exclude<ItemType, "phat_sinh">;
type QuickCreateItemType = Exclude<ItemType, "trang_phuc" | "phat_sinh">;

const SERVICE_LIKE_UNITS = ["dich_vu", "goi", "lan", "ngay", "gio"];
const PRODUCT_LIKE_UNITS = ["san_pham", "cuon", "bo"];

function sanitizeCatalogSearch(search?: string): string {
  return search?.replace(/[%_,()]/g, " ").trim().slice(0, 100) || "";
}

function toSlug(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\u0111/g, "d")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function normalizeCatalogType(itemType: CatalogItemType): CatalogItemType {
  return itemType === "trang_phuc" || itemType === "san_pham" ? itemType : "dich_vu";
}

function normalizeRpcService(value: Json | null) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("Ket qua tao dich vu khong hop le");
  }

  const record = value as Record<string, unknown>;
  if (typeof record.id !== "string") throw new Error("Thieu service id");
  return {
    id: record.id,
    name: typeof record.name === "string" ? record.name : "",
    service_code:
      typeof record.service_code === "string" ? record.service_code : undefined,
  };
}

export async function upsertCategory(data: { id?: string; name: string; icon?: string }) {
  return withServicesAccess(async (supabase: SupabaseClient<Database>) => {
    const parsed = categoryUpsertSchema.safeParse(data);
    if (!parsed.success) {
      throw new Error(parsed.error.issues[0]?.message || "Danh muc khong hop le");
    }

    const category = parsed.data;
    const payload = {
      name: category.name,
      slug: toSlug(category.name),
      icon: category.icon || null,
    };
    let record;

    if (category.id) {
      const { data: updated, error } = await supabase
        .from("service_categories")
        .update(payload)
        .eq("id", category.id)
        .select()
        .single();
      if (error) throw new Error(`Loi cap nhat danh muc: ${error.message}`);
      record = updated;
    } else {
      const { data: inserted, error } = await supabase
        .from("service_categories")
        .insert(payload)
        .select()
        .single();
      if (error) throw new Error(`Loi tao danh muc: ${error.message}`);
      record = inserted;
    }

    fireAuditLog({
      action: category.id ? "UPDATE" : "CREATE",
      tableName: "service_categories",
      description: `${category.id ? "Cap nhat" : "Tao"} danh muc: ${category.name}`,
    });
    revalidatePath("/services");
    return record;
  });
}

export async function deleteCategory(id: string) {
  return withServicesAccess(async (supabase: SupabaseClient<Database>) => {
    const parsed = categoryDeleteSchema.parse({ id });
    const { count, error: checkError } = await supabase
      .from("services")
      .select("*", { count: "exact", head: true })
      .eq("category_id", parsed.id)
      .is("deleted_at", null);
    if (checkError) throw new Error(`Loi kiem tra: ${checkError.message}`);
    if (count && count > 0) {
      throw new Error(`Danh muc nay dang duoc dung boi ${count} dich vu. Khong the xoa.`);
    }

    const { error } = await supabase.from("service_categories").delete().eq("id", parsed.id);
    if (error) throw new Error(`Loi xoa danh muc: ${error.message}`);

    fireAuditLog({
      action: "DELETE",
      tableName: "service_categories",
      recordId: parsed.id,
      description: `Xoa danh muc #${parsed.id.substring(0, 8)}`,
      severity: "WARNING",
    });
    revalidatePath("/services");
    return null;
  });
}

export async function getAvailableServices(search?: string) {
  return withAuth(async (supabase: SupabaseClient<Database>, userId) => {
    await requireContractAccess(supabase, userId);

    let query = supabase
      .from("services")
      .select("id, name, service_code, service_type, category_id, selling_price, cost_price, unit")
      .is("deleted_at", null)
      .eq("status", "active")
      .order("name")
      .limit(50);

    const sanitized = sanitizeCatalogSearch(search);
    if (sanitized) {
      query = query.or(`name.ilike.%${sanitized}%,service_code.ilike.%${sanitized}%`);
    }

    const { data, error } = await query;
    if (error) throw new Error(`Loi tai dich vu: ${error.message}`);

    return (data || []).map((service) => ({
      id: service.id,
      service_name: service.name,
      service_type: service.service_type || "khac",
      category_id: service.category_id,
      selling_price: Number(service.selling_price) || 0,
      cost_price: Number(service.cost_price) || 0,
      unit: service.unit,
    }));
  });
}

export async function getAvailableCatalogItems(itemType: CatalogItemType, search?: string) {
  return withAuth(async (supabase: SupabaseClient<Database>, userId) => {
    await requireContractAccess(supabase, userId);
    const normalizedType = normalizeCatalogType(itemType);
    const sanitized = sanitizeCatalogSearch(search);

    if (normalizedType === "trang_phuc") {
      let query = supabase
        .from("dresses")
        .select("id, name, item_code, category, size, color, rental_price, sale_price, image_url")
        .is("deleted_at", null)
        .eq("status", "available")
        .order("name")
        .limit(50);

      if (sanitized) {
        query = query.or(`name.ilike.%${sanitized}%,item_code.ilike.%${sanitized}%`);
      }

      const { data, error } = await query;
      if (error) throw new Error(`Loi tai trang phuc: ${error.message}`);

      return (data || []).map((dress) => ({
        id: dress.id,
        source: "dress" as const,
        item_name: dress.name,
        service_name: dress.name,
        code: dress.item_code,
        selling_price: Number(dress.rental_price) || 0,
        item_type: "trang_phuc" as const,
        service_type: "trang_phuc",
        unit: "bo",
        meta: [dress.category, dress.size ? `Size ${dress.size}` : null, dress.color]
          .filter(Boolean)
          .join(" - "),
      }));
    }

    let query = supabase
      .from("services")
      .select("id, name, service_code, service_type, category_id, selling_price, cost_price, unit")
      .is("deleted_at", null)
      .eq("status", "active")
      .order("name")
      .limit(50);

    query =
      normalizedType === "san_pham"
        ? query.in("unit", PRODUCT_LIKE_UNITS)
        : query.in("unit", SERVICE_LIKE_UNITS);

    if (sanitized) {
      query = query.or(`name.ilike.%${sanitized}%,service_code.ilike.%${sanitized}%`);
    }

    const { data, error } = await query;
    if (error) throw new Error(`Loi tai danh muc: ${error.message}`);

    return (data || []).map((service) => ({
      id: service.id,
      source: "service" as const,
      item_name: service.name,
      service_name: service.name,
      code: service.service_code,
      service_type: service.service_type || "khac",
      category_id: service.category_id,
      selling_price: Number(service.selling_price) || 0,
      cost_price: Number(service.cost_price) || 0,
      item_type: normalizedType,
      unit: service.unit,
      meta: service.service_code,
    }));
  });
}

export async function quickCreateService(serviceData: {
  service_name: string;
  service_type: string;
  item_type?: QuickCreateItemType;
  selling_price: number;
  cost_price?: number;
}) {
  return withAuth(async (supabase: SupabaseClient<Database>, userId) => {
    await requireContractAccess(supabase, userId);
    const parsed = quickCreateServiceSchema.safeParse(serviceData);
    if (!parsed.success) {
      throw new Error(parsed.error.issues[0]?.message || "Dich vu khong hop le");
    }

    const data = parsed.data;
    const itemType = data.item_type === "san_pham" ? "san_pham" : "dich_vu";
    const serviceCode = generateServiceCode();
    const servicePayload = {
      name: data.service_name,
      service_code: serviceCode,
      service_type: data.service_type,
      selling_price: data.selling_price,
      cost_price: data.cost_price || 0,
      unit: itemType === "san_pham" ? "san_pham" : "dich_vu",
      fulfillment_type: "single",
      status: "active",
    };

    const { data: rpcData, error } = await supabase.rpc("save_service_atomic", {
      p_actor_id: userId,
      p_bundle_items: undefined,
      p_expected_updated_at: undefined,
      p_service: servicePayload as Json,
    });

    if (error) throw new Error(`Loi tao dich vu: ${error.message}`);
    const service = normalizeRpcService(rpcData);

    fireAuditLog({
      action: "CREATE",
      tableName: "services",
      recordId: service.id,
      description: `Quick create service: ${data.service_name} (${serviceCode})`,
      newData: {
        ...servicePayload,
        item_type: itemType,
      },
      source: "server_action",
    });
    revalidatePath("/services");

    return {
      id: service.id,
      service_name: data.service_name,
      selling_price: data.selling_price,
      service_type: data.service_type,
      unit: itemType === "san_pham" ? "san_pham" : "dich_vu",
    };
  });
}
