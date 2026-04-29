import { z } from "zod";
import { LAB_STATUSES } from "@/types/printing-constants";

const optionalText = z
  .string()
  .trim()
  .optional()
  .nullable()
  .transform((value) => {
    if (!value) return null;
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : null;
  });

export const labStatusSchema = z.enum(LAB_STATUSES);

export const createLabSchema = z.object({
  lab_name: z.string().trim().min(1, "Ten lab la bat buoc"),
  contact_person: optionalText,
  phone: optionalText,
  address: optionalText,
  status: labStatusSchema.default("active"),
});

export const updateLabSchema = z.object({
  lab_name: z.string().trim().min(1, "Ten lab la bat buoc").optional(),
  contact_person: optionalText,
  phone: optionalText,
  address: optionalText,
  status: labStatusSchema.optional(),
});

export const createLabServiceSchema = z.object({
  lab_id: z.string().uuid("Lab khong hop le"),
  item_name: z.string().trim().min(1, "Ten dich vu la bat buoc"),
  cost_price: z.number().min(0, "Gia dich vu khong duoc am"),
});

export const updateLabServiceSchema = z.object({
  item_name: z.string().trim().min(1, "Ten dich vu la bat buoc"),
  cost_price: z.number().min(0, "Gia dich vu khong duoc am"),
});

export const labPaymentSchema = z.object({
  lab_id: z.string().uuid("Lab khong hop le"),
  amount: z.number().positive("So tien thanh toan phai lon hon 0"),
  payment_method: z.enum(["tien_mat", "chuyen_khoan"]).default("chuyen_khoan"),
  note: optionalText,
  allocations: z
    .array(
      z.object({
        printing_order_id: z.string().uuid("Don in khong hop le"),
        amount: z.number().positive("So tien phan bo phai lon hon 0"),
      }),
    )
    .optional(),
});

export type LabStatus = z.infer<typeof labStatusSchema>;
export type ValidatedCreateLab = z.infer<typeof createLabSchema>;
export type ValidatedUpdateLab = z.infer<typeof updateLabSchema>;
export type ValidatedCreateLabService = z.infer<typeof createLabServiceSchema>;
export type ValidatedUpdateLabService = z.infer<typeof updateLabServiceSchema>;
export type ValidatedLabPayment = z.infer<typeof labPaymentSchema>;
