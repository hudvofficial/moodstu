/**
 * #27 (T-20260910-t4-normalize-phone) — MỘT luật chuẩn SĐT cho mọi đường ghi khách/lead.
 * Gương đúng `public.normalize_phone(text)` trên DB (migration 20260910130000): trigger trên
 * `customers.phone` / `crm_leads.phone` áp cùng luật, nên bản TS chỉ để dedupe/khớp TRƯỚC khi ghi.
 * Đổi luật ở đây thì phải đổi cả hàm SQL (và REINDEX 2 index biểu thức).
 *
 * Luật: chỉ giữ chữ số · `84` + 9 số hoặc `0084` + 9 số → `0` + 9 số · rỗng/không có số → null ·
 * KHÔNG sửa độ dài (thiếu/thừa số là lỗi nhập — báo cáo, không đoán).
 */
export function normalizePhone(input: string | null | undefined): string | null {
  if (input == null) return null;
  const digits = input.replace(/\D/g, "");
  if (digits === "") return null;
  if (/^84\d{9}$/.test(digits)) return `0${digits.slice(2)}`;
  if (/^0084\d{9}$/.test(digits)) return `0${digits.slice(4)}`;
  return digits;
}

/** SĐT di động/cố định VN dạng chuẩn: 0 + 9 chữ số. Chỉ dùng để báo cáo/hiển thị, không chặn ghi (#27 §3). */
export const VN_PHONE_RE = /^0\d{9}$/;

export function isValidVnPhone(phone: string | null | undefined): boolean {
  const normalized = normalizePhone(phone);
  return normalized !== null && VN_PHONE_RE.test(normalized);
}
