import { z } from "zod";
import {
  FULFILLMENT_TYPES,
  SERVICE_STATUSES,
  SERVICE_TYPES,
  SERVICE_UNITS,
} from "@/types/service-constants";

const moneySchema = z.coerce.number().min(0, "So tien khong hop le");
const optionalUuidSchema = z.string().uuid().optional().or(z.literal(""));
const jsonObjectSchema = z.record(z.string(), z.unknown());
const looseServiceTypeSchema = z.preprocess(
  (value) =>
    typeof value === "string" &&
    (SERVICE_TYPES as readonly string[]).includes(value)
      ? value
      : "khac",
  z.enum(SERVICE_TYPES),
);
const jsonObjectDefaultSchema = z.preprocess(
  (value) => (value && typeof value === "object" && !Array.isArray(value) ? value : {}),
  jsonObjectSchema,
);

export const serviceCreateSchema = z.object({
  name: z.string().trim().min(1, "Ten dich vu la bat buoc").max(200),
  service_code: z.string().trim().max(30).optional(),
  service_type: z.enum(SERVICE_TYPES).default("studio"),
  category_id: optionalUuidSchema,
  selling_price: moneySchema.default(0),
  cost_price: moneySchema.default(0),
  unit: z.enum(SERVICE_UNITS).default("dich_vu"),
  fulfillment_type: z.enum(FULFILLMENT_TYPES).default("single"),
  status: z.enum(SERVICE_STATUSES).default("active"),
  description: z.string().max(10000).optional().or(z.literal("")),
  image_url: z.string().url().optional().or(z.literal("")),
});

export type CreateServiceInput = z.infer<typeof serviceCreateSchema>;

export const serviceUpdateSchema = z.object({
  id: z.string().uuid(),
  updated_at: z.string().min(1),
  data: serviceCreateSchema.partial(),
});

export type UpdateServiceInput = z.infer<typeof serviceUpdateSchema>;

export const bundleItemSchema = z.object({
  child_service_id: z.string().uuid("ID dich vu con khong hop le"),
  quantity: z.coerce.number().int().min(1, "So luong phai >= 1").default(1),
  adjustment_price: z.coerce.number().default(0),
  sort_order: z.coerce.number().int().min(0).default(0),
});

export type BundleItemInput = z.infer<typeof bundleItemSchema>;

export const serviceFiltersSchema = z.object({
  search: z.string().trim().max(100).optional(),
  category: optionalUuidSchema,
  status: z.enum(SERVICE_STATUSES).optional(),
  fulfillment_type: z.enum(FULFILLMENT_TYPES).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(50),
});

export type ServiceFiltersInput = z.infer<typeof serviceFiltersSchema>;

export const serviceIdSchema = z.string().uuid("ID dich vu khong hop le");

export const categoryUpsertSchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().trim().min(1, "Ten danh muc la bat buoc").max(80),
  icon: z.string().trim().max(40).optional().or(z.literal("")),
});

export const categoryDeleteSchema = z.object({
  id: z.string().uuid("ID danh muc khong hop le"),
});

export const quickCreateServiceSchema = z.object({
  service_name: z.string().trim().min(1, "Ten dich vu la bat buoc").max(200),
  service_type: looseServiceTypeSchema.default("khac"),
  item_type: z.enum(["dich_vu", "san_pham"]).optional(),
  selling_price: moneySchema.default(0),
  cost_price: moneySchema.default(0),
});

export const serviceRelationSchema = z
  .object({
    id: z.string().uuid().optional(),
    parent_service_id: z.string().uuid("ID dich vu cha khong hop le"),
    child_service_id: z.string().uuid().optional(),
    child_category_id: z.string().uuid().optional(),
    relation_type: z.enum(["REQUIRED", "OPTIONAL", "SUGGESTED"]).default("OPTIONAL"),
    is_required: z.boolean().default(false),
    sort_order: z.coerce.number().int().min(0).max(10000).default(0),
  })
  .refine((value) => value.child_service_id || value.child_category_id, {
    message: "Can it nhat child_service_id hoac child_category_id",
  });

export const priceRuleSchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().trim().min(1, "Ten quy tac la bat buoc").max(120),
  description: z.string().trim().max(1000).optional().or(z.literal("")),
  conditions: jsonObjectDefaultSchema.default({}),
  actions: jsonObjectDefaultSchema.default({}),
  priority: z.coerce.number().int().min(0).max(10000).default(0),
  is_active: z.boolean().default(true),
});
