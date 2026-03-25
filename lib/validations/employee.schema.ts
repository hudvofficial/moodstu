import { z } from "zod";

// ═══════════════════════════════════════════
// Employee Validation Schema — Zod
// Mirrors ALLOWED_FIELDS from types/employee-form.ts
// Used by employee-mutations.ts for server-side validation
// ═══════════════════════════════════════════

export const employeeCreateSchema = z.object({
  full_name: z.string().min(1, "Tên không được để trống"),
  gender: z.string().optional().nullable(),
  phone: z.string().optional().nullable(),
  email: z
    .string()
    .email("Email không hợp lệ")
    .optional()
    .nullable()
    .or(z.literal("")),
  department: z.string().optional().nullable(),
  position: z.string().optional().nullable(),
  role: z
    .enum(["admin", "manager", "staff", "ctv"])
    .optional()
    .default("ctv"),
  status: z.enum(["active", "inactive"]).optional().default("active"),
  start_date: z.string().optional().nullable(),
  salary_info: z.record(z.string(), z.unknown()).optional().nullable(),
  avatar_url: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  // Auto-generated — not user input but may pass through
  employee_code: z.string().optional(),
});

export type EmployeeCreateInput = z.infer<typeof employeeCreateSchema>;
