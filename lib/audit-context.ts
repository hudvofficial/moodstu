import "server-only";
import { AsyncLocalStorage } from "node:async_hooks";

/**
 * #19 (T-20260911-audit-co-danh-tinh) — ngữ cảnh "ai đang thao tác" cho nhật ký kiểm toán.
 *
 * VÌ SAO CẦN: `writeAuditLog` chạy trong promise trôi (fire-and-forget) sau khi server action
 * đã trả về, nên KHÔNG được gọi `cookies()` / `supabase.auth.getUser()` trong đó (Next.js ném
 * "Dynamic server usage"). Trước #19, danh tính phải do từng call-site truyền tay, và 153/162
 * chỗ không truyền → 30 ngày chỉ 2/883 dòng biết ai làm.
 *
 * VÌ SAO ALS AN TOÀN Ở ĐÂY (khác cookies()): store này là của chính dự án, Next.js không sở hữu
 * và không huỷ nó khi action kết thúc; đồ thị async-resource giữ store sống xuyên promise trôi.
 * Nó chỉ CHỞ GIÁ TRỊ đã đọc sẵn — tuyệt đối không đọc `headers()`/`cookies()` bên trong callback trôi.
 *
 * Đặt ở file riêng (không phải lib/audit.ts) vì file đó có "use server": mọi export ở đó buộc
 * phải là async function, nên không chứa được instance ALS lẫn hàm đồng bộ `getAuditActor`.
 */
export type AuditActor = {
  /** auth.users.id — cột audit_logs.performed_by (không có khoá ngoại). */
  performedBy: string | null;
  ipAddress?: string | null;
  userAgent?: string | null;
};

const store = new AsyncLocalStorage<AuditActor>();

/** Bọc một đoạn xử lý để mọi lần ghi nhật ký bên trong tự biết ai đang thao tác. */
export function runWithAuditActor<T>(actor: AuditActor, fn: () => T): T {
  return store.run(actor, fn);
}

/** Đọc người thao tác của ngữ cảnh hiện tại; null khi chạy ngoài mọi wrapper. */
export function getAuditActor(): AuditActor | null {
  return store.getStore() ?? null;
}
