"use server";

import { fireAuditLog } from "@/lib/audit";
import { withServicesAccess } from "@/lib/auth_utils";
import { generateServiceCode } from "@/lib/utils/service-utils";
import {
  bundleItemSchema,
  serviceCreateSchema,
  serviceIdSchema,
  serviceUpdateSchema,
} from "@/lib/validations/service.schema";
import { revalidatePath } from "next/cache";
import type { BundleItemInput } from "@/lib/validations/service.schema";
import type { Json } from "@/types/database.types";

type ServiceRpcResult = {
  id: string;
  service_code?: string;
  name?: string;
};

function validationMessage(error: { issues: Array<{ message: string }> }) {
  return error.issues.map((issue) => issue.message).join(", ");
}

function normalizeBundleItems(items?: BundleItemInput[]): Json {
  return (items ?? []).map((item) => {
    const parsed = bundleItemSchema.safeParse(item);
    if (!parsed.success) {
      throw new Error(`Bundle item khong hop le: ${parsed.error.issues[0]?.message}`);
    }

    return parsed.data;
  }) as Json;
}

function asRpcResult(value: Json | null, label: string): ServiceRpcResult {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error(`${label} tra ve payload khong hop le`);
  }

  const record = value as Record<string, unknown>;
  if (typeof record.id !== "string") {
    throw new Error(`${label} thieu service id`);
  }

  return {
    id: record.id,
    service_code:
      typeof record.service_code === "string" ? record.service_code : undefined,
    name: typeof record.name === "string" ? record.name : undefined,
  };
}

function serviceMutationError(prefix: string, error: { message: string }) {
  const message = error.message || "Khong xac dinh";
  const lower = message.toLowerCase();

  if (
    lower.includes("service_code") ||
    lower.includes("duplicate") ||
    lower.includes("unique")
  ) {
    return new Error("Ma dich vu da ton tai");
  }

  return new Error(`${prefix}: ${message}`);
}

export async function createService(
  rawData: Record<string, unknown>,
  bundleItems?: BundleItemInput[],
) {
  return withServicesAccess(async (supabase, userId) => {
    const parsed = serviceCreateSchema.safeParse(rawData);
    if (!parsed.success) {
      throw new Error(`Du lieu khong hop le: ${validationMessage(parsed.error)}`);
    }

    const data = parsed.data;
    const servicePayload = {
      ...data,
      category_id: data.category_id || null,
      description: data.description || null,
      image_url: data.image_url || null,
      name: data.name.trim(),
      service_code: data.service_code || generateServiceCode(),
    };

    const { data: rpcData, error } = await supabase.rpc("save_service_atomic", {
      p_actor_id: userId,
      p_bundle_items: normalizeBundleItems(bundleItems),
      p_expected_updated_at: null,
      p_service: servicePayload as Json,
    });

    if (error) throw serviceMutationError("Loi tao dich vu", error);
    const service = asRpcResult(rpcData, "save_service_atomic");

    fireAuditLog({
      action: "CREATE",
      tableName: "services",
      recordId: service.id,
      description: `Tao dich vu: ${data.name} (${service.service_code || ""})`,
      newData: servicePayload as Record<string, unknown>,
      source: "server_action",
    });

    revalidatePath("/services");
    return { id: service.id, service_code: service.service_code };
  });
}

export async function updateService(
  rawData: Record<string, unknown>,
  bundleItems?: BundleItemInput[],
) {
  return withServicesAccess(async (supabase, userId) => {
    const parsed = serviceUpdateSchema.safeParse(rawData);
    if (!parsed.success) {
      throw new Error(`Du lieu khong hop le: ${validationMessage(parsed.error)}`);
    }

    const { id, updated_at, data } = parsed.data;
    const servicePayload = {
      id,
      ...data,
      ...(data.category_id !== undefined ? { category_id: data.category_id || null } : {}),
      ...(data.description !== undefined ? { description: data.description || null } : {}),
      ...(data.image_url !== undefined ? { image_url: data.image_url || null } : {}),
      ...(data.name !== undefined ? { name: data.name.trim() } : {}),
    };

    const { data: rpcData, error } = await supabase.rpc("save_service_atomic", {
      p_actor_id: userId,
      p_bundle_items: bundleItems === undefined ? null : normalizeBundleItems(bundleItems),
      p_expected_updated_at: updated_at,
      p_service: servicePayload as Json,
    });

    if (error) throw serviceMutationError("Loi cap nhat dich vu", error);
    const service = asRpcResult(rpcData, "save_service_atomic");

    fireAuditLog({
      action: "UPDATE",
      tableName: "services",
      recordId: service.id,
      description: `Cap nhat dich vu: ${service.name || id}`,
      oldData: { updated_at } as Record<string, unknown>,
      newData: servicePayload as Record<string, unknown>,
      source: "server_action",
    });

    revalidatePath("/services");
    revalidatePath(`/services/${id}`);
    return { id };
  });
}

export async function deleteService(id: string) {
  return withServicesAccess(async (supabase, userId) => {
    const serviceId = serviceIdSchema.parse(id);
    const { data: rpcData, error } = await supabase.rpc("delete_service_atomic", {
      p_actor_id: userId,
      p_service_id: serviceId,
    });

    if (error) throw new Error(`Loi xoa dich vu: ${error.message}`);
    const service = asRpcResult(rpcData, "delete_service_atomic");

    fireAuditLog({
      action: "DELETE",
      tableName: "services",
      recordId: serviceId,
      description: `Xoa dich vu: ${service.name || serviceId} (${service.service_code || ""})`,
      severity: "WARNING",
      source: "server_action",
    });

    revalidatePath("/services");
    return null;
  });
}
