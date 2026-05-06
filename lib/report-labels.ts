import { SERVICE_TYPE_LABELS } from "@/types/service-constants";

function normalizeKey(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function humanizeKey(value: string): string {
  const normalized = normalizeKey(value);
  if (!normalized) return "Khác";

  return normalized
    .split("_")
    .filter(Boolean)
    .map((part) => part.charAt(0).toLocaleUpperCase("vi-VN") + part.slice(1))
    .join(" ");
}

export function getReportServiceLabel(value: string | null | undefined): string {
  const raw = String(value || "").trim();
  if (!raw) return "Khác";

  const normalized = normalizeKey(raw);
  const labels = SERVICE_TYPE_LABELS as Record<string, string>;
  if (labels[raw]) return labels[raw];
  if (labels[normalized]) return labels[normalized];
  if (/[\s/]/.test(raw)) return raw;
  return humanizeKey(raw);
}

export function getReportRevenueLabel(value: string | null | undefined): string {
  const raw = String(value || "").trim();
  if (!raw) return "Doanh thu";

  const labels: Record<string, string> = {
    contract_revenue: "Doanh thu hợp đồng",
    contract: "Doanh thu hợp đồng",
    contracts: "Doanh thu hợp đồng",
    doanh_thu_hop_dong: "Doanh thu hợp đồng",
    package_revenue: "Doanh thu gói",
    doanh_thu_goi: "Doanh thu gói",
    addon_revenue: "Doanh thu phát sinh",
    doanh_thu_phat_sinh: "Doanh thu phát sinh",
    other_revenue: "Thu khác",
    other_income: "Thu khác",
    standalone_receipts: "Thu khác",
    thu_khac: "Thu khác",
  };

  const normalized = normalizeKey(raw);
  return labels[normalized] || humanizeKey(raw);
}

export function formatReportPercent(value: number | null | undefined): string {
  const amount = Number(value || 0);
  return `${new Intl.NumberFormat("vi-VN", { maximumFractionDigits: 1 }).format(
    Number.isFinite(amount) ? amount : 0,
  )}%`;
}
