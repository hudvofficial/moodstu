import { z } from "zod";

export const sanitizeSearch = (val: string | undefined | null): string | undefined => {
  if (!val) return undefined;
  const trimmed = val.trim();
  if (trimmed.length < 2) return undefined;
  // Escape PostgREST reserved characters: % and _ for LIKE/ILIKE, and ,() for URL syntax
  return trimmed.replace(/[%_,()]/g, '');
};

const ZodDateString = z
  .string()
  .nullish()
  .transform((val) => (val === "" ? undefined : val))
  .refine((val) => !val || !Number.isNaN(new Date(val).getTime()), {
    message: "Ngày không hợp lệ",
  });

const ZodBaseLock = z.object({
  expectedUpdatedAt: ZodDateString,
});

export const ZodUuidId = z.object({
  id: z.string().uuid("ID không hợp lệ"),
});

export const LEAD_STATUSES = ["moi", "da_lien_he", "hen_gap", "da_bao_gia", "da_chot", "huy"] as const;
export const LEAD_POTENTIALS = ["hot", "warm", "cold"] as const;
export const LEAD_SOURCES = ["facebook", "zalo", "walk_in", "referral", "website", "tiktok"] as const;

const NullableEnum = (values: readonly [string, ...string[]]) =>
  z.union([z.enum(values), z.literal(""), z.undefined(), z.null()]).transform((val) => (val === "" || val === null ? undefined : val));

export const ZodLeadFilter = z.object({
  search: z.string().optional().transform(sanitizeSearch),
  status: NullableEnum(LEAD_STATUSES),
  source: NullableEnum(LEAD_SOURCES),
  potential: NullableEnum(LEAD_POTENTIALS),
  assigned_to: z.string().optional(),
  date_from: ZodDateString,
  date_to: ZodDateString,
  sort_by: z.string().optional(),
  sort_desc: z.boolean().optional(),
  page: z.number().optional(),
  limit: z.number().optional(),
});

export const ZodCustomerFilter = z.object({
  search: z.string().optional().transform(sanitizeSearch),
  page: z.number().optional().default(1),
  pageSize: z.number().optional().default(10),
  source: z.string().optional(),
  tags: z.string().optional(),
});

export const ZodCustomerSearch = z.object({
  query: z.string().optional().transform(sanitizeSearch),
});

export const ZodLeadCreate = z.object({
  contact_name: z.string().min(1, "Tên không được để trống"),
  phone: z.string().optional(),
  email: z.string().email("Email không hợp lệ").optional().or(z.literal("")),
  source: NullableEnum(LEAD_SOURCES),
  needs: z.string().optional(),
  address: z.string().optional(),
  potential: NullableEnum(LEAD_POTENTIALS),
  status: z.enum(LEAD_STATUSES).optional().default("moi"),
  notes: z.string().optional(),
  care_type: z.string().optional(),
  social_link: z.string().optional(),
  next_contact_date: ZodDateString,
  contact_date: ZodDateString,
  assigned_to: z.string().optional(),
  deal_value: z.number().optional().default(0),
  tags: z.array(z.string()).optional().default([]).transform(tags => tags.map((t) => t.trim()).filter((t) => t.length > 0)),
  score: z.number().optional().default(0),
});

export const ZodLeadUpdate = ZodLeadCreate.partial().extend({
  id: z.string().uuid("ID Lead không hợp lệ"),
  ...ZodBaseLock.shape,
});

export const ZodLeadMoveStage = z.object({
  id: z.string().uuid("ID Lead không hợp lệ"),
  newStatus: z.enum(LEAD_STATUSES, {
    error: "Trạng thái không hợp lệ",
  }),
});

export const ZodLeadUpdateDealValue = z.object({
  id: z.string().uuid("ID Lead không hợp lệ"),
  dealValue: z.number().min(0, "Giá trị phải >= 0"),
});

export const ZodLeadUpdateScore = z.object({
  id: z.string().uuid("ID Lead không hợp lệ"),
  score: z.number().min(0).max(100, "Điểm phải từ 0-100"),
});

export const ZodLeadUpdateTags = z.object({
  id: z.string().uuid("ID Lead không hợp lệ"),
  tags: z.array(z.string()).transform(tags => tags.map((t) => t.trim()).filter((t) => t.length > 0)),
});

export const ZodLeadAssign = z.object({
  id: z.string().uuid("ID Lead không hợp lệ"),
  employeeId: z.string().nullable(),
});

export const ZodLeadMarkLost = z.object({
  id: z.string().uuid("ID Lead không hợp lệ"),
  reason: z.string().min(1, "Cần nhập lý do hủy"),
});

export const ZodAddCareLog = z.object({
  id: z.string().uuid("ID Lead không hợp lệ"),
  content: z.string().min(1, "Nội dung không được để trống"),
  type: z.string().optional().default("call"), // e.g. 'call', 'meeting', 'zalo'
});

export const ZodCustomerCreate = z.object({
  full_name: z.string().min(1, "Tên không được để trống"),
  phone: z.string().min(1, "Số điện thoại không được để trống"),
  email: z.string().email("Email không hợp lệ").optional().or(z.literal("")),
  alt_phone: z.string().optional(),
  address: z.string().optional(),
  gender: z.string().optional(),
  date_of_birth: ZodDateString,
  wedding_date: ZodDateString,
  bride_name: z.string().optional(),
  groom_name: z.string().optional(),
});

export const ZodCustomerUpdate = ZodCustomerCreate.partial().extend({
  id: z.string().uuid("ID Customer không hợp lệ"),
  ...ZodBaseLock.shape,
});

export const ZodLeadConvertToCustomer = z.object({
  id: z.string().uuid("ID Lead không hợp lệ"),
  wedding_date: ZodDateString,
  bride_name: z.string().optional(),
  groom_name: z.string().optional(),
});
