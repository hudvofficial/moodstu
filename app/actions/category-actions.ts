"use server";

import { withAuth } from "@/lib/auth_utils";
import { fireAuditLog } from "@/lib/audit";
import { generateServiceCode } from "@/lib/utils/service-utils";
import { revalidatePath } from "next/cache";
import { SERVICE_TYPES } from "@/types/service-constants";
import type { ItemType } from "@/types/contract";

type CatalogItemType = Exclude<ItemType, "phat_sinh">;
type QuickCreateItemType = Exclude<ItemType, "trang_phuc" | "phat_sinh">;

const SERVICE_LIKE_UNITS = ["dich_vu", "goi", "lan", "ngay", "gio"];
const PRODUCT_LIKE_UNITS = ["san_pham", "cuon", "bo"];

function sanitizeCatalogSearch(search?: string): string {
  return search?.replace(/[%_,()]/g, " ").trim() || "";
}

function normalizeServiceType(serviceType?: string): string {
  return serviceType && (SERVICE_TYPES as readonly string[]).includes(serviceType)
    ? serviceType
    : "khac";
}

function toSlug(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export async function upsertCategory(data: { id?: string; name: string; icon?: string }) {
  return withAuth(async (supabase) => {
    const payload = { name: data.name, slug: toSlug(data.name), icon: data.icon };
    let record;

    if (data.id) {
      const { data: updated, error } = await supabase
        .from("service_categories")
        .update(payload)
        .eq("id", data.id)
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
      action: data.id ? "UPDATE" : "CREATE",
      tableName: "service_categories",
      description: `${data.id ? "Cap nhat" : "Tao"} danh muc: ${data.name}`,
    });
    revalidatePath("/services");
    return record;
  });
}

export async function deleteCategory(id: string) {
  return withAuth(async (supabase) => {
    const { count, error: checkError } = await supabase
      .from("services")
      .select("*", { count: "exact", head: true })
      .eq("category_id", id);
    if (checkError) throw new Error(`Loi kiem tra: ${checkError.message}`);
    if (count && count > 0) {
      throw new Error(`Danh muc nay dang duoc dung boi ${count} dich vu. Khong the xoa.`);
    }

    const { error } = await supabase.from("service_categories").delete().eq("id", id);
    if (error) throw new Error(`Loi xoa danh muc: ${error.message}`);

    fireAuditLog({
      action: "DELETE",
      tableName: "service_categories",
      recordId: id,
      description: `Xoa danh muc #${id.substring(0, 8)}`,
      severity: "WARNING",
    });
    revalidatePath("/services");
    return null;
  });
}

export async function getAvailableServices(search?: string) {
  return withAuth(async (supabase) => {
    let query = supabase
      .from("services")
      .select("id, name, service_code, service_type, category_id, selling_price, cost_price, unit")
      .is("deleted_at", null)
      .eq("status", "active")
      .order("name")
      .limit(50);

    const sanitized = search?.replace(/[%_,()]/g, " ").trim();
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
  return withAuth(async (supabase) => {
    const sanitized = sanitizeCatalogSearch(search);

    if (itemType === "trang_phuc") {
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
          .join(" · "),
      }));
    }

    let query = supabase
      .from("services")
      .select("id, name, service_code, service_type, category_id, selling_price, cost_price, unit")
      .is("deleted_at", null)
      .eq("status", "active")
      .order("name")
      .limit(50);

    query = itemType === "san_pham"
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
      item_type: itemType,
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
  return withAuth(async (supabase, userId) => {
    const name = serviceData.service_name.trim();
    if (!name) throw new Error("Ten dich vu la bat buoc");

    const serviceCode = generateServiceCode();
    const serviceType = normalizeServiceType(serviceData.service_type);
    const itemType = serviceData.item_type === "san_pham" ? "san_pham" : "dich_vu";
    const { data: service, error } = await supabase
      .from("services")
      .insert({
        name,
        service_code: serviceCode,
        service_type: serviceType,
        selling_price: serviceData.selling_price,
        cost_price: serviceData.cost_price || 0,
        unit: itemType === "san_pham" ? "san_pham" : "dich_vu",
        fulfillment_type: "single",
        status: "active",
        created_by: userId,
        updated_by: userId,
      })
      .select("id, name, selling_price, service_type, unit")
      .single();

    if (error) throw new Error(`Loi tao dich vu: ${error.message}`);

    fireAuditLog({
      action: "CREATE",
      tableName: "services",
      recordId: service.id,
      description: `Quick create service: ${name} (${serviceCode})`,
      newData: {
        name,
        service_code: serviceCode,
        service_type: serviceType,
        item_type: itemType,
      },
      source: "server_action",
    });
    revalidatePath("/services");

    return {
      id: service.id,
      service_name: service.name,
      selling_price: Number(service.selling_price) || 0,
      service_type: service.service_type,
      unit: service.unit,
    };
  });
}
