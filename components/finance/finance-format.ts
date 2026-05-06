import { formatVnd as formatVndCore, safeFormatDate } from "@/lib/utils";

export function formatVnd(amount: number | null | undefined): string {
  return formatVndCore(amount);
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
    in_progress: "Đang chốt",
    locked: "Đã khóa sổ",
    chua_bat_dau: "Chưa bắt đầu",
    dang_thuc_hien: "Đang thực hiện",
    cho_duyet: "Chờ duyệt",
    co_van_de: "Có vấn đề",
    cho_xu_ly: "Chờ xử lý",
    hoan_thanh: "Hoàn thành",
    completed: "Hoàn thành",
    da_huy: "Đã hủy",
    cancelled: "Đã hủy",
  };
  return labels[status?.toLowerCase() || ""] || "Thông tin";
}

export function financeStatusVariant(status: string | null | undefined) {
  const s = status?.toLowerCase();
  if (s === "approved" || s === "confirmed" || s === "hoan_thanh" || s === "completed" || s === "locked") {
    return "success" as const;
  }
  if (s === "pending" || s === "dang_thuc_hien" || s === "cho_xu_ly" || s === "in_progress" || s === "cho_duyet") {
    return "warning" as const;
  }
  if (s === "da_huy" || s === "cancelled" || s === "co_van_de") return "error" as const;
  if (s === "draft" || s === "chua_bat_dau") return "neutral" as const;
  return "info" as const;
}

export function financeMethodLabel(method: string | null | undefined): string {
  const labels: Record<string, string> = {
    tien_mat: "Tiền mặt",
    chuyen_khoan: "Chuyển khoản",
    cash: "Tiền mặt",
    bank_transfer: "Chuyển khoản",
    card: "Chuyển khoản",
  };
  return labels[method || ""] || method || "-";
}

export function financeReceiptTypeLabel(type: string | null | undefined): string {
  const labels: Record<string, string> = {
    contract_payment: "Thanh toán hợp đồng",
    contract_deposit: "Cọc hợp đồng",
    contract_adjustment: "Phát sinh hợp đồng",
    other_income: "Thu nhập khác",
    service_fee: "Phí dịch vụ",
    sale_receipt: "Bán vật tư",
  };
  return labels[type || ""] || type || "Khoản thu";
}

export function financeReceiptTypeVariant(type: string | null | undefined) {
  const t = type?.toLowerCase();
  if (t === "contract_payment") return "success" as const;
  if (t === "contract_deposit") return "info" as const;
  if (t === "contract_adjustment") return "warning" as const;
  if (t === "sale_receipt") return "warning" as const;
  if (t === "other_income") return "neutral" as const;
  return "neutral" as const;
}
