import { z } from "zod";

const MAX_RANGE_DAYS = 366;
const DAY_MS = 86400000;

const isoDateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Ngay phai co dinh dang YYYY-MM-DD")
  .refine((value) => {
    const date = new Date(`${value}T00:00:00Z`);
    return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value;
  }, "Ngay khong hop le");

function daysBetweenInclusive(startDate: string, endDate: string) {
  const start = new Date(`${startDate}T00:00:00Z`);
  const end = new Date(`${endDate}T00:00:00Z`);
  return Math.floor((end.getTime() - start.getTime()) / DAY_MS) + 1;
}

export const reportFiltersSchema = z
  .object({
    periodType: z.enum(["month", "quarter", "year", "custom"]),
    year: z.coerce.number().int().min(2020).max(2035),
    month: z.coerce.number().int().min(1).max(12).optional(),
    quarter: z.coerce.number().int().min(1).max(4).optional(),
    startDate: isoDateSchema.optional(),
    endDate: isoDateSchema.optional(),
  })
  .superRefine((filters, ctx) => {
    if (filters.periodType === "month" && !filters.month) {
      ctx.addIssue({
        code: "custom",
        path: ["month"],
        message: "Thieu thang bao cao",
      });
    }

    if (filters.periodType === "quarter" && !filters.quarter) {
      ctx.addIssue({
        code: "custom",
        path: ["quarter"],
        message: "Thieu quy bao cao",
      });
    }

    if (filters.periodType !== "custom") return;

    if (!filters.startDate) {
      ctx.addIssue({
        code: "custom",
        path: ["startDate"],
        message: "Thieu ngay bat dau",
      });
    }

    if (!filters.endDate) {
      ctx.addIssue({
        code: "custom",
        path: ["endDate"],
        message: "Thieu ngay ket thuc",
      });
    }

    if (!filters.startDate || !filters.endDate) return;

    if (filters.startDate > filters.endDate) {
      ctx.addIssue({
        code: "custom",
        path: ["endDate"],
        message: "Ngay ket thuc phai lon hon hoac bang ngay bat dau",
      });
      return;
    }

    if (daysBetweenInclusive(filters.startDate, filters.endDate) > MAX_RANGE_DAYS) {
      ctx.addIssue({
        code: "custom",
        path: ["endDate"],
        message: "Khoang ngay bao cao khong duoc vuot qua 366 ngay",
      });
    }
  });

export type ValidatedReportFilters = z.infer<typeof reportFiltersSchema>;
