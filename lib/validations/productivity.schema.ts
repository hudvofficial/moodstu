import { z } from "zod";

const DAY_MS = 86400000;
const MAX_DETAIL_RANGE_DAYS = 120;

export const productivityPeriodSchema = z.enum(["week", "month", "quarter"]);

export const productivityIsoDateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Ngay phai co dinh dang YYYY-MM-DD")
  .refine((value) => {
    const date = new Date(`${value}T00:00:00Z`);
    return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value;
  }, "Ngay khong hop le");

export const productivityDetailParamsSchema = z
  .object({
    employeeId: z.uuid("Nhan su khong hop le"),
    startDate: productivityIsoDateSchema,
    endDate: productivityIsoDateSchema,
  })
  .superRefine((params, ctx) => {
    if (params.startDate > params.endDate) {
      ctx.addIssue({
        code: "custom",
        path: ["endDate"],
        message: "Ngay ket thuc phai lon hon hoac bang ngay bat dau",
      });
      return;
    }

    const start = new Date(`${params.startDate}T00:00:00Z`);
    const end = new Date(`${params.endDate}T00:00:00Z`);
    const days = Math.floor((end.getTime() - start.getTime()) / DAY_MS) + 1;
    if (days > MAX_DETAIL_RANGE_DAYS) {
      ctx.addIssue({
        code: "custom",
        path: ["endDate"],
        message: `Khoang ngay chi tiet productivity khong duoc vuot qua ${MAX_DETAIL_RANGE_DAYS} ngay`,
      });
    }
  });

export type ValidatedProductivityPeriod = z.infer<typeof productivityPeriodSchema>;
export type ValidatedProductivityDetailParams = z.infer<typeof productivityDetailParamsSchema>;
