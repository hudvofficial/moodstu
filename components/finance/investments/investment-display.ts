import type { BadgeVariant } from "@/components/ui/badge";
import type { InvestmentItem } from "@/types/finance-operations";

function normalize(value: string | null | undefined) {
  return value?.trim().toLowerCase() || "";
}

export function investmentConditionLabel(condition: string | null | undefined): string {
  const normalized = normalize(condition);
  const labels: Record<string, string> = {
    excellent: "Xuất sắc",
    good: "Tốt",
    fair: "Trung bình",
    poor: "Kém",
    damaged: "Hư hại",
    worn: "Xuống cấp",
  };
  return labels[normalized] || (condition?.trim() || "Chưa rõ");
}

export function investmentConditionVariant(condition: string | null | undefined): BadgeVariant {
  const normalized = normalize(condition);
  if (normalized === "excellent") return "success";
  if (normalized === "good") return "info";
  if (normalized === "fair") return "warning";
  if (normalized === "poor" || normalized === "damaged" || normalized === "worn") return "error";
  return "neutral";
}

export function investmentStatusLabel(status: string | null | undefined): string {
  const normalized = normalize(status);
  const labels: Record<string, string> = {
    active: "Đang dùng",
    in_use: "Đang dùng",
    dang_dung: "Đang dùng",
    maintenance: "Bảo trì",
    bao_tri: "Bảo trì",
    sold: "Đã bán",
    da_ban: "Đã bán",
    disposed: "Thanh lý",
    thanh_ly: "Thanh lý",
    inactive: "Ngưng dùng",
    ngung_dung: "Ngưng dùng",
  };
  return labels[normalized] || (status?.trim() || "Theo dõi");
}

export function investmentStatusVariant(status: string | null | undefined): BadgeVariant {
  const normalized = normalize(status);
  if (normalized === "active" || normalized === "in_use" || normalized === "dang_dung") return "success";
  if (normalized === "maintenance" || normalized === "bao_tri") return "warning";
  if (normalized === "sold" || normalized === "da_ban") return "info";
  if (normalized === "disposed" || normalized === "thanh_ly" || normalized === "inactive" || normalized === "ngung_dung") {
    return "neutral";
  }
  return "neutral";
}

export function investmentRoiPercent(item: Pick<InvestmentItem, "purchase_price" | "linked_revenue">): number | null {
  if (!item.linked_revenue || item.linked_revenue <= 0 || item.purchase_price <= 0) return null;
  const roi = ((item.linked_revenue - item.purchase_price) / item.purchase_price) * 100;
  return Math.round(roi * 10) / 10;
}

export function formatInvestmentRoi(value: number | null): string {
  if (value === null) return "—";
  const formatted = new Intl.NumberFormat("vi-VN", { maximumFractionDigits: 1 }).format(value);
  return `${value > 0 ? "+" : ""}${formatted}%`;
}
