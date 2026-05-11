import { type UnifiedCalendarEvent } from "@/types/calendar.types";

export function getEventColorToken(
  source: UnifiedCalendarEvent["source"],
  workTypeOrStatus?: string | null,
): string {
  if (source === "google") {
    return "bg-amber-50 text-amber-900 border-amber-200";
  }

  if (source === "task") {
    switch (workTypeOrStatus) {
      case "makeup":
        return "bg-pink-50 text-pink-900 border-pink-200";
      case "chup_anh":
        return "bg-indigo-50 text-indigo-900 border-indigo-200";
      case "quay_video":
      case "chinh_sua_video":
        return "bg-sky-50 text-sky-900 border-sky-200";
      case "photoshop":
        return "bg-purple-50 text-purple-900 border-purple-200";
      case "in_an":
        return "bg-emerald-50 text-emerald-900 border-emerald-200";
      default:
        return "bg-blue-50 text-blue-900 border-blue-200";
    }
  }

  return "bg-slate-50 text-slate-900 border-slate-200";
}

export function generateCalendarGroupKey(
  contractId: string | null | undefined,
  dateIsoStr: string,
): string | null {
  if (!contractId) return null;
  const datePart = dateIsoStr.split("T")[0] || dateIsoStr;
  return `${contractId}_${datePart}`;
}

export const CALENDAR_STATUS_LABELS: Record<string, string> = {
  chua_lam: "Chưa làm",
  dang_lam: "Đang làm",
  hoan_thanh: "Hoàn thành",
  da_huy: "Đã hủy",
  scheduled: "Đã lên lịch",
  pending: "Chờ xử lý",
  confirmed: "Đã xác nhận",
  completed: "Hoàn thành",
  cancelled: "Đã hủy",
  canceled: "Đã hủy",
  published: "Google Calendar",
  google: "Google Calendar",
};

export const CALENDAR_STATUS_ORDER = [
  "chua_lam",
  "dang_lam",
  "hoan_thanh",
  "scheduled",
  "confirmed",
  "pending",
  "published",
  "da_huy",
  "cancelled",
] as const;

export function getCalendarStatusLabel(status: string | null | undefined): string {
  if (!status) return "Không rõ";

  const key = status.trim();
  const lowerKey = key.toLowerCase();
  const mapped = CALENDAR_STATUS_LABELS[key] || CALENDAR_STATUS_LABELS[lowerKey];
  if (mapped) return mapped;

  return key
    .split("_")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export const GOOGLE_COLORS = [
  { id: "1", label: "Hoa oải hương (Lavender)", color: "bg-[#7986cb]" },
  { id: "2", label: "Cây xô thơm (Sage)", color: "bg-[#33b679]" },
  { id: "3", label: "Quả nho (Grape)", color: "bg-[#8e24aa]" },
  { id: "4", label: "Hồng hạc (Flamingo)", color: "bg-[#e67c73]" },
  { id: "5", label: "Trái chuối (Banana)", color: "bg-[#f6bf26]" },
  { id: "6", label: "Quýt (Tangerine)", color: "bg-[#f4511e]" },
  { id: "7", label: "Công (Peacock)", color: "bg-[#039be5]" },
  { id: "8", label: "Than chì (Graphite)", color: "bg-[#616161]" },
  { id: "9", label: "Việt quất (Blueberry)", color: "bg-[#3f51b5]" },
  { id: "10", label: "Húng quế (Basil)", color: "bg-[#0b8043]" },
  { id: "11", label: "Cà chua (Tomato)", color: "bg-[#d50000]" },
];
