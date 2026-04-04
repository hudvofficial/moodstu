import { type UnifiedCalendarEvent } from "@/types/calendar.types";

/**
 * Lấy mã màu UI SSOT (Tailwind tokens) trả về class chuỗi dựa theo tính chất sự kiện.
 */
export function getEventColorToken(
  source: UnifiedCalendarEvent["source"],
  workTypeOrStatus?: string | null,
): string {
  if (source === "google") {
    // Khối sự kiện Google (Read-only từ bên ngoài)
    return "bg-amber-50 text-amber-900 border-amber-200";
  }

  if (source === "task") {
    // Task nhỏ lẻ bên trong Hợp Đồng (Makeup, Photoshop, In ấn..)
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

  // Khối schedule nội bộ độc lập (Họp, Nghỉ phép..)
  return "bg-slate-50 text-slate-900 border-slate-200";
}

/**
 * Sinh khóa nhóm sự kiện (GroupKey) theo contract_id và ngày cấu thành.
 * Giúp UI Lưới Lịch Tháng có thể thu gọn nhiều tasks của cùng 1 HĐ trong cùng 1 ngày thành 1 thẻ.
 */
export function generateCalendarGroupKey(
  contractId: string | null | undefined,
  dateIsoStr: string,
): string | null {
  if (!contractId) return null;
  // ISO => YYYY-MM-DD
  const datePart = dateIsoStr.split("T")[0] || dateIsoStr;
  return `${contractId}_${datePart}`;
}
