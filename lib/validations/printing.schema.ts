import { z } from "zod";
import {
  PRINTING_ORDER_STATUSES,
  PRINTING_PAYMENT_STATUSES,
  PRINTING_PAGE_SIZE,
} from "@/types/printing-constants";

const nullableText = z
  .string()
  .trim()
  .optional()
  .nullable()
  .transform((value) => {
    if (!value) return null;
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : null;
  });

const nullableDate = z
  .string()
  .trim()
  .optional()
  .nullable()
  .transform((value) => {
    if (!value) return null;
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : null;
  });

export const printingStatusSchema = z.enum(PRINTING_ORDER_STATUSES);
export const printingPaymentStatusSchema = z.enum(PRINTING_PAYMENT_STATUSES);

export const printingItemSchema = z.object({
  name: z.string().trim().min(1, "Ten san pham la bat buoc"),
  quantity: z
    .number()
    .int("So luong phai la so nguyen")
    .positive("So luong phai lon hon 0"),
  unitPrice: z.number().min(0, "Don gia khong duoc am"),
});

export const createPrintingOrderSchema = z.object({
  contractId: z.string().uuid("Hop dong khong hop le"),
  labId: z
    .string()
    .uuid("Lab khong hop le")
    .optional()
    .nullable()
    .transform((value) => value || null),
  items: z.array(printingItemSchema).min(1, "Can it nhat 1 san pham"),
  notes: nullableText,
  expectedDate: nullableDate,
});

export const updatePrintingOrderSchema = z.object({
  labId: z
    .string()
    .uuid("Lab khong hop le")
    .optional()
    .nullable()
    .transform((value) => value || null),
  items: z.array(printingItemSchema).min(1, "Can it nhat 1 san pham"),
  notes: nullableText,
  expectedDate: nullableDate,
});

const dateString = z
  .string()
  .trim()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Ngay khong hop le")
  .optional();

export const printingFiltersSchema = z
  .object({
    status: z
      .union([z.enum(PRINTING_ORDER_STATUSES), z.literal("all")])
      .optional(),
    labId: z
      .union([z.string().uuid("Lab khong hop le"), z.literal("all")])
      .optional(),
    paymentStatus: z
      .union([z.enum(PRINTING_PAYMENT_STATUSES), z.literal("all")])
      .optional(),
    search: z.string().trim().max(100, "Tu khoa qua dai").optional(),
    fromDate: dateString,
    toDate: dateString,
    page: z.coerce.number().int().min(1).default(1),
    pageSize: z.coerce
      .number()
      .int()
      .min(1)
      .max(50, "So dong moi trang toi da la 50")
      .default(PRINTING_PAGE_SIZE),
  })
  .superRefine((value, ctx) => {
    if (!value.fromDate || !value.toDate) return;
    const from = new Date(`${value.fromDate}T00:00:00.000Z`);
    const to = new Date(`${value.toDate}T00:00:00.000Z`);

    if (from > to) {
      ctx.addIssue({
        code: "custom",
        message: "Khoang ngay khong hop le",
        path: ["toDate"],
      });
      return;
    }

    const days = (to.getTime() - from.getTime()) / 86_400_000;
    if (days > 366) {
      ctx.addIssue({
        code: "custom",
        message: "Khoang ngay toi da la 366 ngay",
        path: ["toDate"],
      });
    }
  });

export type PrintingStatus = z.infer<typeof printingStatusSchema>;
export type PrintingPaymentStatus = z.infer<typeof printingPaymentStatusSchema>;
export type ValidatedPrintingItem = z.infer<typeof printingItemSchema>;
export type ValidatedCreatePrintingOrder = z.infer<
  typeof createPrintingOrderSchema
>;
export type ValidatedUpdatePrintingOrder = z.infer<
  typeof updatePrintingOrderSchema
>;
export type ValidatedPrintingFilters = z.infer<typeof printingFiltersSchema>;
