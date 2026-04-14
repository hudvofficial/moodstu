import type { SupabaseClient } from "@supabase/supabase-js";

export function isMissingRpcError(error: { code?: string; message?: string } | null | undefined) {
  if (!error) return false;
  return error.code === "PGRST202" || /schema cache|function/i.test(error.message || "");
}

/**
 * Shared period lock check — throws if the given date falls in a closed accounting period.
 * Used across all finance mutation actions.
 */
export async function checkPeriodLock(supabase: SupabaseClient, date: string): Promise<void> {
  const { data: isLocked, error } = await supabase.rpc("is_period_locked", { p_date: date });
  if (error && isMissingRpcError(error)) {
    const { data: close, error: closeError } = await supabase
      .from("finance_monthly_closes")
      .select("status")
      .eq("period", date.slice(0, 7))
      .maybeSingle();

    if (closeError) return;
    if (close?.status === "locked") {
      throw new Error("Ky nay da chot so, khong the thay doi du lieu.");
    }
    return;
  }
  if (error) throw new Error(`Khong the kiem tra khoa so: ${error.message}`);
  if (isLocked) {
    throw new Error("Kỳ này đã chốt sổ, không thể thay đổi dữ liệu.");
  }
}

/**
 * Build a date string for the first day of a given month/year.
 * Useful for period-locking budget/salary operations.
 */
export function firstDayOfMonth(month: number, year: number): string {
  return `${year}-${String(month).padStart(2, "0")}-01`;
}

// ─── Consolidated Utilities (W1-W2 audit fix) ────────────────────

/** Date window for month-based queries: [start, end) */
export function monthWindow(month: number, year: number) {
  const start = `${year}-${String(month).padStart(2, "0")}-01`;
  const end = month === 12
    ? `${year + 1}-01-01`
    : `${year}-${String(month + 1).padStart(2, "0")}-01`;
  return { start, end };
}

/** Optional month window — returns null if params missing */
export function monthWindowOptional(month?: number, year?: number) {
  if (!month || !year) return null;
  return monthWindow(month, year);
}

/** Extract text from Supabase relation join (handles array or object) */
export function relationText(value: unknown, key: string): string | null {
  const item = Array.isArray(value) ? value[0] : value;
  if (!item || typeof item !== "object") return null;
  const raw = (item as Record<string, unknown>)[key];
  return typeof raw === "string" ? raw : null;
}

/** Safe number coercion for RPC/query results */
export function asNumber(value: unknown): number {
  return Number(value) || 0;
}

/** Safe string coercion with fallback */
export function asString(value: unknown, fallback = ""): string {
  return typeof value === "string" ? value : fallback;
}

// ─── S4: RPC-with-Fallback Pattern (audit fix) ──────────────

/**
 * Call a Supabase RPC. If the RPC doesn't exist yet (PGRST202),
 * execute the fallback query-based implementation instead.
 * Eliminates repetitive `if (error && isMissingRpcError(error))` blocks.
 */
export async function rpcWithFallback<T>(
  supabase: SupabaseClient,
  rpcName: string,
  params: Record<string, unknown>,
  fallback: () => Promise<T>,
): Promise<T> {
  const { data, error } = await supabase.rpc(rpcName, params);
  if (error && isMissingRpcError(error)) return fallback();
  if (error) throw new Error(`RPC ${rpcName} failed: ${error.message}`);
  return data as T;
}


/**
 * 💰 readMoney — Chuyển số tiền thành chữ (Tiếng Việt)
 *
 * [AUDIT FIX #4] Extracted from 4 duplicate copies across finance pages.
 */
export function readMoney(number: number): string {
  if (number === 0) return "không đồng";
  const units = [
    "",
    "một",
    "hai",
    "ba",
    "bốn",
    "năm",
    "sáu",
    "bảy",
    "tám",
    "chín",
  ];
  const readGroup = (group: number): string => {
    let res = "";
    const h = Math.floor(group / 100),
      t = Math.floor((group % 100) / 10),
      u = group % 10;
    if (h > 0) res += units[h] + " trăm ";
    if (t > 0) {
      if (t === 1) res += "mười ";
      else res += units[t] + " mươi ";
    } else if (h > 0 && u > 0) {
      res += "lẻ ";
    }
    if (u > 0) {
      if (u === 1 && t > 1) res += "mốt";
      else if (u === 5 && t > 0) res += "lăm";
      else res += units[u];
    }
    return res.trim();
  };
  const groups: number[] = [];
  let temp = Math.abs(number);
  while (temp > 0) {
    groups.push(temp % 1000);
    temp = Math.floor(temp / 1000);
  }
  const labels = ["", "nghìn", "triệu", "tỷ", "nghìn tỷ"];
  let result = "";
  for (let i = groups.length - 1; i >= 0; i--)
    if (groups[i] > 0) result += readGroup(groups[i]) + " " + labels[i] + " ";
  const final = result.trim() + " đồng chẵn.";
  return final.charAt(0).toUpperCase() + final.slice(1);
}
