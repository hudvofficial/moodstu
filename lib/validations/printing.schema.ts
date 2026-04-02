import { z } from "zod";
import {
  PRINTING_ORDER_STATUSES,
  PRINTING_PAYMENT_STATUSES,
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
  size: z.string().trim().max(100).optional().default(""),
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

export type PrintingStatus = z.infer<typeof printingStatusSchema>;
export type PrintingPaymentStatus = z.infer<typeof printingPaymentStatusSchema>;
export type ValidatedPrintingItem = z.infer<typeof printingItemSchema>;
export type ValidatedCreatePrintingOrder = z.infer<
  typeof createPrintingOrderSchema
>;
export type ValidatedUpdatePrintingOrder = z.infer<
  typeof updatePrintingOrderSchema
>;

