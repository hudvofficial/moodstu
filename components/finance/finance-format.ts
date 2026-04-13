import { formatCurrency, safeFormatDate } from "@/lib/utils";

export function formatVnd(amount: number): string {
  return `${formatCurrency(amount)}đ`;
}

export function formatFinanceDate(date: string | null | undefined): string {
  return safeFormatDate(date);
}

export function financeStatusLabel(status: string | null | undefined): string {
  const labels: Record<string, string> = {
    approved: "Đã duyệt",
    confirmed: "Đã xác nhận",
    pending: "Chờ duyệt",
    draft: "Nháp",
    dang_thuc_hien: "Đang thực hiện",
    cho_xu_ly: "Chờ xử lý",
    hoan_thanh: "Hoàn thành",
    da_huy: "Đã hủy",
  };
  return labels[status || ""] || "Thông tin";
}

export function financeStatusVariant(status: string | null | undefined) {
  if (status === "approved" || status === "confirmed" || status === "hoan_thanh") {
    return "success" as const;
  }
  if (status === "pending" || status === "dang_thuc_hien" || status === "cho_xu_ly") {
    return "warning" as const;
  }
  if (status === "da_huy" || status === "cancelled") return "error" as const;
  if (status === "draft") return "neutral" as const;
  return "info" as const;
}

export function financeMethodLabel(method: string | null | undefined): string {
  const labels: Record<string, string> = {
    tien_mat: "Tiền mặt",
    chuyen_khoan: "Chuyển khoản",
    cash: "Tiền mặt",
    bank_transfer: "Chuyển khoản",
  };
  return labels[method || ""] || method || "-";
}
