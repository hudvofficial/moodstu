"use server";

import { withAuth } from "@/lib/auth_utils";
import { fireAuditLog } from "@/lib/audit";

// ═══════════════════════════════════════════
// Export Actions — CSV Export
// V1 ref: export.ts (289 lines)
// V2: withAuth + fireAuditLog + BOM UTF-8
// ═══════════════════════════════════════════

type ExportTarget = "contracts" | "expenses" | "receipts" | "employees" | "customers";

function escapeCsv(cell: unknown): string {
  const str = String(cell ?? "");
  if (str.includes(",") || str.includes('"') || str.includes("\n")) return `"${str.replace(/"/g, '""')}"`;
  return str;
}

export async function exportToCSV(target: ExportTarget, filters?: { dateFrom?: string; dateTo?: string; status?: string }): Promise<{ success: boolean; data?: string; filename?: string; error?: string }> {
  const result = await withAuth(async (supabase) => {
    let rows: unknown[][] = [];
    let headers: string[] = [];
    let filename = "";
    const today = new Date().toISOString().split("T")[0];

    switch (target) {
      case "contracts": {
        let q = supabase.from("contracts").select("contract_code, customer_name, work_date, total_amount, paid_amount, remaining_amount, status, created_at").order("created_at", { ascending: false });
        if (filters?.status) q = q.eq("status", filters.status);
        if (filters?.dateFrom) q = q.gte("created_at", filters.dateFrom);
        if (filters?.dateTo) q = q.lte("created_at", filters.dateTo);
        const { data, error } = await q;
        if (error) throw error;
        headers = ["Mã HĐ", "Khách hàng", "Ngày làm việc", "Tổng giá trị", "Đã thu", "Còn lại", "Trạng thái", "Ngày tạo"];
        rows = (data || []).map((r) => [r.contract_code, r.customer_name, r.work_date ? new Date(r.work_date).toLocaleDateString("vi-VN") : "", r.total_amount, r.paid_amount, r.remaining_amount, r.status, new Date(r.created_at).toLocaleDateString("vi-VN")]);
        filename = `hop-dong_${today}.csv`;
        break;
      }
      case "expenses": {
        let q = supabase.from("expenses").select("expense_date, payment_method, category_name, description, contract_code, amount, recipient, status, notes").order("expense_date", { ascending: false });
        if (filters?.status) q = q.eq("status", filters.status);
        if (filters?.dateFrom) q = q.gte("expense_date", filters.dateFrom);
        if (filters?.dateTo) q = q.lte("expense_date", filters.dateTo);
        const { data, error } = await q;
        if (error) throw error;
        headers = ["Ngày chi", "Loại", "Danh mục", "Nội dung", "Mã HĐ", "Số tiền", "Người nhận", "Trạng thái", "Ghi chú"];
        rows = (data || []).map((r) => [r.expense_date ? new Date(r.expense_date).toLocaleDateString("vi-VN") : "", r.payment_method, r.category_name, r.description, r.contract_code || "", r.amount, r.recipient || "", r.status, r.notes || ""]);
        filename = `chi-phi_${today}.csv`;
        break;
      }
      case "receipts": {
        let q = supabase.from("receipts").select("receipt_date, receipt_type, category_name, contract_code, payment_type, receipt_amount, total_amount, remaining_amount, status, notes").order("receipt_date", { ascending: false });
        if (filters?.dateFrom) q = q.gte("receipt_date", filters.dateFrom);
        if (filters?.dateTo) q = q.lte("receipt_date", filters.dateTo);
        const { data, error } = await q;
        if (error) throw error;
        headers = ["Ngày thu", "Hình thức", "Danh mục", "Mã HĐ", "Đợt", "Số tiền", "Tổng HĐ", "Còn lại", "Trạng thái", "Ghi chú"];
        rows = (data || []).map((r) => [r.receipt_date ? new Date(r.receipt_date).toLocaleDateString("vi-VN") : "", r.receipt_type, r.category_name, r.contract_code || "", r.payment_type || "", r.receipt_amount, r.total_amount, r.remaining_amount, r.status, r.notes || ""]);
        filename = `phieu-thu_${today}.csv`;
        break;
      }
      case "employees": {
        const { data, error } = await supabase.from("employees").select("employee_code, full_name, email, phone, department, position, role, base_salary, status, start_date").order("full_name");
        if (error) throw error;
        headers = ["Mã NV", "Họ tên", "Email", "SĐT", "Phòng ban", "Chức vụ", "Vai trò", "Lương cơ bản", "Trạng thái", "Ngày vào"];
        rows = (data || []).map((r) => [r.employee_code, r.full_name, r.email, r.phone || "", r.department || "", r.position || "", r.role, r.base_salary, r.status, r.start_date ? new Date(r.start_date).toLocaleDateString("vi-VN") : ""]);
        filename = `nhan-vien_${today}.csv`;
        break;
      }
      case "customers": {
        const { data, error } = await supabase.from("customers").select("customer_name, phone, email, address, source, total_contracts, total_revenue, created_at").order("created_at", { ascending: false });
        if (error) throw error;
        headers = ["Tên khách", "SĐT", "Email", "Địa chỉ", "Nguồn", "Số HĐ", "Doanh thu", "Ngày tạo"];
        rows = (data || []).map((r) => [r.customer_name, r.phone || "", r.email || "", r.address || "", r.source || "", r.total_contracts || 0, r.total_revenue || 0, new Date(r.created_at).toLocaleDateString("vi-VN")]);
        filename = `khach-hang_${today}.csv`;
        break;
      }
      default: throw new Error("Target không hợp lệ");
    }

    const BOM = "\uFEFF";
    const csvContent = BOM + [headers.join(","), ...rows.map((row) => (row as unknown[]).map(escapeCsv).join(","))].join("\n");

    fireAuditLog({ action: "EXPORT", tableName: target, description: `Xuất ${rows.length} bản ghi ${target} ra CSV` });
    return { csvContent, filename };
  });

  if (result.success) return { success: true, data: result.data.csvContent, filename: result.data.filename };
  return { success: false, error: result.error };
}
