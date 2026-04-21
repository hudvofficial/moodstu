import { z } from "zod";

export const employeeRoleSchema = z.enum(
  ["admin", "manager", "sale", "media", "ctv"],
  {
    error: "Vai trò không hợp lệ",
  },
);

export const employeeStatusSchema = z.enum(["active", "inactive"], {
  error: "Trạng thái không hợp lệ",
});

export const employeeSalaryInfoSchema = z
  .object({
    base_salary: z.number().nonnegative("Lương không được âm").optional(),
    bank_name: z.string().max(100, "Tên ngân hàng tối đa 100 ký tự").optional(),
    bank_account_no: z
      .string()
      .max(50, "Số tài khoản tối đa 50 ký tự")
      .optional(),
    bank_account_name: z
      .string()
      .max(100, "Tên tài khoản tối đa 100 ký tự")
      .optional(),
    branch: z.string().max(100, "Chi nhánh tối đa 100 ký tự").optional(),
  })
  .passthrough();

const employeeShape = {
  full_name: z
    .string()
    .trim()
    .min(1, "Tên không được để trống")
    .max(100, "Tên tối đa 100 ký tự"),
  gender: z.enum(["nam", "nu", "khac"]).optional().nullable(),
  phone: z
    .string()
    .trim()
    .regex(/^[0-9\s+()-]{0,20}$/, "Số điện thoại không hợp lệ")
    .optional()
    .nullable(),
  email: z
    .string()
    .trim()
    .email("Email không hợp lệ")
    .optional()
    .nullable()
    .or(z.literal("")),
  department: z
    .string()
    .trim()
    .min(1, "Phòng ban không được để trống")
    .max(80, "Phòng ban tối đa 80 ký tự"),
  position: z
    .string()
    .trim()
    .max(100, "Chức vụ tối đa 100 ký tự")
    .optional()
    .nullable(),
  role: employeeRoleSchema,
  status: employeeStatusSchema,
  start_date: z.string().optional().nullable(),
  salary_info: employeeSalaryInfoSchema.optional().nullable(),
  avatar_url: z.string().url("URL avatar không hợp lệ").optional().nullable(),
  notes: z.string().max(5000, "Ghi chú tối đa 5000 ký tự").optional().nullable(),
  employee_code: z.string().optional(),
};

export const employeeCreateSchema = z.object({
  ...employeeShape,
  role: employeeRoleSchema.optional().default("ctv"),
  status: employeeStatusSchema.optional().default("active"),
});

export const employeeUpdateSchema = z.object(employeeShape).partial().refine(
  (data) => Object.keys(data).length > 0,
  {
    message: "Không có dữ liệu để cập nhật",
  },
);

export const employeeNotesSchema = z
  .string()
  .max(5000, "Ghi chú tối đa 5000 ký tự")
  .nullable();

export type EmployeeCreateInput = z.infer<typeof employeeCreateSchema>;
export type EmployeeUpdateInput = z.infer<typeof employeeUpdateSchema>;
