/**
 * Âm Lịch Việt Nam — Lightweight converter
 * Thuật toán dựa trên Ho Ngoc Duc (https://www.informatik.uni-leipzig.de/~duc/amlich/)
 * Chỉ cần 2 hàm: getLunarDate(solarDate) + formatLunar()
 */

const PI = Math.PI;

function jdFromDate(dd: number, mm: number, yy: number): number {
  const a = Math.floor((14 - mm) / 12);
  const y = yy + 4800 - a;
  const m = mm + 12 * a - 3;
  let jd = dd + Math.floor((153 * m + 2) / 5) + 365 * y + Math.floor(y / 4) - Math.floor(y / 100) + Math.floor(y / 400) - 32045;
  if (jd < 2299161) {
    jd = dd + Math.floor((153 * m + 2) / 5) + 365 * y + Math.floor(y / 4) - 32083;
  }
  return jd;
}

function newMoon(k: number): number {
  const T = k / 1236.85;
  const T2 = T * T;
  const T3 = T2 * T;
  const dr = PI / 180;
  let Jd1 = 2415020.75933 + 29.53058868 * k + 0.0001178 * T2 - 0.000000155 * T3;
  Jd1 += 0.00033 * Math.sin((166.56 + 132.87 * T - 0.009173 * T2) * dr);
  const M = 359.2242 + 29.10535608 * k - 0.0000333 * T2 - 0.00000347 * T3;
  const Mpr = 306.0253 + 385.81691806 * k + 0.0107306 * T2 + 0.00001236 * T3;
  const F = 21.2964 + 390.67050646 * k - 0.0016528 * T2 - 0.00000239 * T3;
  let C1 = (0.1734 - 0.000393 * T) * Math.sin(M * dr) + 0.0021 * Math.sin(2 * dr * M);
  C1 = C1 - 0.4068 * Math.sin(Mpr * dr) + 0.0161 * Math.sin(dr * 2 * Mpr);
  C1 -= 0.0004 * Math.sin(dr * 3 * Mpr);
  C1 = C1 + 0.0104 * Math.sin(dr * 2 * F) - 0.0051 * Math.sin(dr * (M + Mpr));
  C1 = C1 - 0.0074 * Math.sin(dr * (M - Mpr)) + 0.0004 * Math.sin(dr * (2 * F + M));
  C1 = C1 - 0.0004 * Math.sin(dr * (2 * F - M)) - 0.0006 * Math.sin(dr * (2 * F + Mpr));
  C1 = C1 + 0.001 * Math.sin(dr * (2 * F - Mpr)) + 0.0005 * Math.sin(dr * (2 * Mpr + M));
  let deltat: number;
  if (T < -11) {
    deltat = 0.001 + 0.000839 * T + 0.0002261 * T2 - 0.00000845 * T3 - 0.000000081 * T * T3;
  } else {
    deltat = -0.000278 + 0.000265 * T + 0.000262 * T2;
  }
  return Jd1 + C1 - deltat;
}

function sunLongitude(jdn: number): number {
  const T = (jdn - 2451545.0) / 36525;
  const T2 = T * T;
  const dr = PI / 180;
  const M = 357.5291 + 35999.0503 * T - 0.0001559 * T2 - 0.00000048 * T * T2;
  const L0 = 280.46645 + 36000.76983 * T + 0.0003032 * T2;
  let DL = (1.9146 - 0.004817 * T - 0.000014 * T2) * Math.sin(dr * M);
  DL = DL + (0.019993 - 0.000101 * T) * Math.sin(dr * 2 * M) + 0.00029 * Math.sin(dr * 3 * M);
  let L = L0 + DL;
  L = L * dr;
  L = L - PI * 2 * Math.floor(L / (PI * 2));
  return L;
}

function getSunLongitude(dayNumber: number, timeZone: number): number {
  return Math.floor(sunLongitude(dayNumber - 0.5 - timeZone / 24) / PI * 6);
}

function getNewMoonDay(k: number, timeZone: number): number {
  return Math.floor(newMoon(k) + 0.5 + timeZone / 24);
}

function getLunarMonth11(yy: number, timeZone: number): number {
  const off = jdFromDate(31, 12, yy) - 2415021;
  const k = Math.floor(off / 29.530588853);
  let nm = getNewMoonDay(k, timeZone);
  const sunLong = getSunLongitude(nm, timeZone);
  if (sunLong >= 9) {
    nm = getNewMoonDay(k - 1, timeZone);
  }
  return nm;
}

function getLeapMonthOffset(a11: number, timeZone: number): number {
  const k = Math.floor((a11 - 2415021.076998695) / 29.530588853 + 0.5);
  let last: number;
  let i = 1;
  let arc = getSunLongitude(getNewMoonDay(k + i, timeZone), timeZone);
  do {
    last = arc;
    i++;
    arc = getSunLongitude(getNewMoonDay(k + i, timeZone), timeZone);
  } while (arc !== last && i < 14);
  return i - 1;
}

export interface LunarDate {
  day: number;
  month: number;
  year: number;
  leap: boolean;
}

export function getLunarDate(dd: number, mm: number, yy: number, timeZone = 7): LunarDate {
  const dayNumber = jdFromDate(dd, mm, yy);
  const k = Math.floor((dayNumber - 2415021.076998695) / 29.530588853);
  let monthStart = getNewMoonDay(k + 1, timeZone);
  if (monthStart > dayNumber) {
    monthStart = getNewMoonDay(k, timeZone);
  }
  let a11 = getLunarMonth11(yy, timeZone);
  let b11 = a11;
  let lunarYear: number;
  if (a11 >= monthStart) {
    lunarYear = yy;
    a11 = getLunarMonth11(yy - 1, timeZone);
  } else {
    lunarYear = yy + 1;
    b11 = getLunarMonth11(yy + 1, timeZone);
  }
  const lunarDay = dayNumber - monthStart + 1;
  const diff = Math.floor((monthStart - a11) / 29);
  let lunarLeap = false;
  let lunarMonth = diff + 11;
  if (b11 - a11 > 365) {
    const leapMonthDiff = getLeapMonthOffset(a11, timeZone);
    if (diff >= leapMonthDiff) {
      lunarMonth = diff + 10;
      if (diff === leapMonthDiff) {
        lunarLeap = true;
      }
    }
  }
  if (lunarMonth > 12) {
    lunarMonth -= 12;
  }
  if (lunarMonth >= 11 && diff < 4) {
    lunarYear -= 1;
  }
  return { day: lunarDay, month: lunarMonth, year: lunarYear, leap: lunarLeap };
}

/** Format ngắn gọn: "1" hoặc "1/3" (ngày mùng 1 thì show cả tháng âm) */
export function formatLunarShort(lunar: LunarDate): string {
  if (lunar.day === 1) return `${lunar.day}/${lunar.month}`;
  return String(lunar.day);
}

/** Check xem ngày này có phải mùng 1 âm lịch không */
export function isLunarNewMonth(lunar: LunarDate): boolean {
  return lunar.day === 1;
}

// ─── Lunar → Solar conversion (brute-force search, proven V1 pattern) ─────────

/**
 * Chuyển ngày Âm lịch → Dương lịch bằng brute-force search.
 * @returns Date | null (null nếu ngày âm không hợp lệ)
 */
export function lunarToSolar(
  dd: number, mm: number, yy: number, leapMonth = false
): Date | null {
  const current = new Date(yy, 0, 1);
  for (let i = 0; i < 450; i++) {
    const l = getLunarDate(current.getDate(), current.getMonth() + 1, current.getFullYear());
    if (l.year === yy && l.month === mm && l.day === dd) {
      if (leapMonth ? l.leap : !l.leap) return new Date(current);
    }
    if (l.year > yy) break;
    current.setDate(current.getDate() + 1);
  }
  return null;
}

// ─── Can Chi calculations ─────────────────────────────────────────────────────

const CAN = ["Giáp", "Ất", "Bính", "Đinh", "Mậu", "Kỷ", "Canh", "Tân", "Nhâm", "Quý"];
const CHI = ["Tý", "Sửu", "Dần", "Mão", "Thìn", "Tỵ", "Ngọ", "Mùi", "Thân", "Dậu", "Tuất", "Hợi"];
const CAN_YEAR = ["Canh", "Tân", "Nhâm", "Quý", "Giáp", "Ất", "Bính", "Đinh", "Mậu", "Kỷ"];
const CHI_YEAR = ["Thân", "Dậu", "Tuất", "Hợi", "Tý", "Sửu", "Dần", "Mão", "Thìn", "Tỵ", "Ngọ", "Mùi"];

const WEEKDAYS = ["Chủ nhật", "Thứ 2", "Thứ 3", "Thứ 4", "Thứ 5", "Thứ 6", "Thứ 7"];

export function getCanChiYear(year: number): string {
  return `${CAN_YEAR[year % 10]} ${CHI_YEAR[year % 12]}`;
}

export interface LunarDetails {
  lunarDay: number;
  lunarMonth: number;
  lunarYear: number;
  leap: boolean;
  namCanChi: string;
  thangCanChi: string;
  ngayCanChi: string;
  weekday: string;
}

const VI_CAN = ["Giáp", "Ất", "Bính", "Đinh", "Mậu", "Kỷ", "Canh", "Tân", "Nhâm", "Quý"] as const;
const VI_CHI = ["Tý", "Sửu", "Dần", "Mão", "Thìn", "Tỵ", "Ngọ", "Mùi", "Thân", "Dậu", "Tuất", "Hợi"] as const;
const VI_CAN_YEAR = ["Canh", "Tân", "Nhâm", "Quý", "Giáp", "Ất", "Bính", "Đinh", "Mậu", "Kỷ"] as const;
const VI_CHI_YEAR = ["Thân", "Dậu", "Tuất", "Hợi", "Tý", "Sửu", "Dần", "Mão", "Thìn", "Tỵ", "Ngọ", "Mùi"] as const;
const VI_WEEKDAYS = ["Chủ nhật", "Thứ 2", "Thứ 3", "Thứ 4", "Thứ 5", "Thứ 6", "Thứ 7"] as const;

const CHI_HOUR_RANGES = [
  "23h-1h",
  "1h-3h",
  "3h-5h",
  "5h-7h",
  "7h-9h",
  "9h-11h",
  "11h-13h",
  "13h-15h",
  "15h-17h",
  "17h-19h",
  "19h-21h",
  "21h-23h",
] as const;

const AUSPICIOUS_HOUR_BY_DAY_BRANCH: Record<number, number[]> = {
  0: [0, 1, 3, 6, 8, 9],
  1: [2, 3, 5, 8, 10, 11],
  2: [0, 1, 4, 5, 7, 10],
  3: [0, 2, 3, 6, 7, 9],
  4: [2, 4, 5, 8, 9, 11],
  5: [1, 4, 6, 7, 10, 11],
  6: [0, 1, 3, 6, 8, 9],
  7: [2, 3, 5, 8, 10, 11],
  8: [0, 1, 4, 5, 7, 10],
  9: [0, 2, 3, 6, 7, 9],
  10: [2, 4, 5, 8, 9, 11],
  11: [1, 4, 6, 7, 10, 11],
};

export interface LunarHourRange {
  chi: string;
  range: string;
  label: string;
}

export interface LunarDaySummary {
  solarDate: Date;
  solarDay: number;
  solarMonth: number;
  solarYear: number;
  weekday: string;
  lunarDay: number;
  lunarMonth: number;
  lunarYear: number;
  leap: boolean;
  canChiDay: string;
  canChiMonth: string;
  canChiYear: string;
  auspiciousHours: LunarHourRange[];
  solarTerm: string | null;
  conflictAges: string | null;
  joyDirection: string | null;
  wealthDirection: string | null;
}

function getVietnameseCanChiYear(year: number): string {
  return `${VI_CAN_YEAR[year % 10]} ${VI_CHI_YEAR[year % 12]}`;
}

function getVietnameseDayCanChi(date: Date) {
  const jd = jdFromDate(date.getDate(), date.getMonth() + 1, date.getFullYear());
  const canIndex = (jd + 9) % 10;
  const chiIndex = (jd + 1) % 12;
  return {
    chiIndex,
    label: `${VI_CAN[canIndex]} ${VI_CHI[chiIndex]}`,
  };
}

function getVietnameseMonthCanChi(lunarMonth: number, lunarYear: number): string {
  const canNamIdx = lunarYear % 10;
  let startCanMonthIdx = 0;
  if (canNamIdx === 4 || canNamIdx === 9) startCanMonthIdx = 2;
  else if (canNamIdx === 5 || canNamIdx === 0) startCanMonthIdx = 4;
  else if (canNamIdx === 6 || canNamIdx === 1) startCanMonthIdx = 6;
  else if (canNamIdx === 7 || canNamIdx === 2) startCanMonthIdx = 8;
  else if (canNamIdx === 8 || canNamIdx === 3) startCanMonthIdx = 0;

  const canThangIdx = (startCanMonthIdx + (lunarMonth - 1)) % 10;
  const chiThangIdx = (2 + (lunarMonth - 1)) % 12;
  return `${VI_CAN[canThangIdx]} ${VI_CHI[chiThangIdx]}`;
}

function getAuspiciousHours(dayBranchIndex: number): LunarHourRange[] {
  return (AUSPICIOUS_HOUR_BY_DAY_BRANCH[dayBranchIndex] ?? []).map((chiIndex) => ({
    chi: VI_CHI[chiIndex],
    range: CHI_HOUR_RANGES[chiIndex],
    label: `${VI_CHI[chiIndex]} (${CHI_HOUR_RANGES[chiIndex]})`,
  }));
}

export function getLunarDaySummary(date: Date): LunarDaySummary {
  const safeDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const lunar = getLunarDate(safeDate.getDate(), safeDate.getMonth() + 1, safeDate.getFullYear());
  const dayCanChi = getVietnameseDayCanChi(safeDate);

  return {
    solarDate: safeDate,
    solarDay: safeDate.getDate(),
    solarMonth: safeDate.getMonth() + 1,
    solarYear: safeDate.getFullYear(),
    weekday: VI_WEEKDAYS[safeDate.getDay()],
    lunarDay: lunar.day,
    lunarMonth: lunar.month,
    lunarYear: lunar.year,
    leap: lunar.leap,
    canChiDay: dayCanChi.label,
    canChiMonth: getVietnameseMonthCanChi(lunar.month, lunar.year),
    canChiYear: getVietnameseCanChiYear(lunar.year),
    auspiciousHours: getAuspiciousHours(dayCanChi.chiIndex),
    solarTerm: null,
    conflictAges: null,
    joyDirection: null,
    wealthDirection: null,
  };
}

/**
 * Trả về thông tin Âm lịch chi tiết cho 1 ngày Dương lịch:
 * ngày/tháng/năm âm, Can Chi (ngày + tháng + năm), thứ trong tuần.
 */
export function getLunarDetails(date: Date): LunarDetails {
  const day = date.getDate();
  const month = date.getMonth() + 1;
  const year = date.getFullYear();

  const lunar = getLunarDate(day, month, year);
  const namCanChi = getCanChiYear(lunar.year);

  // Can Chi Tháng: dựa trên Can Năm → xác định Can tháng 1
  const canNamIdx = lunar.year % 10;
  let startCanMonthIdx = 0;
  if (canNamIdx === 4 || canNamIdx === 9) startCanMonthIdx = 2;      // Giáp/Kỷ → Bính
  else if (canNamIdx === 5 || canNamIdx === 0) startCanMonthIdx = 4;  // Ất/Canh → Mậu
  else if (canNamIdx === 6 || canNamIdx === 1) startCanMonthIdx = 6;  // Bính/Tân → Canh
  else if (canNamIdx === 7 || canNamIdx === 2) startCanMonthIdx = 8;  // Đinh/Nhâm → Nhâm
  else if (canNamIdx === 8 || canNamIdx === 3) startCanMonthIdx = 0;  // Mậu/Quý → Giáp

  const canThangIdx = (startCanMonthIdx + (lunar.month - 1)) % 10;
  const chiThangIdx = (2 + (lunar.month - 1)) % 12; // Tháng 1 = Dần (index 2)
  const thangCanChi = `${CAN[canThangIdx]} ${CHI[chiThangIdx]}`;

  // Can Chi Ngày (Julian Day Number)
  const jd = jdFromDate(day, month, year);
  const ngayCanChi = `${CAN[(jd + 9) % 10]} ${CHI[(jd + 1) % 12]}`;

  return {
    lunarDay: lunar.day,
    lunarMonth: lunar.month,
    lunarYear: lunar.year,
    leap: lunar.leap,
    namCanChi,
    thangCanChi,
    ngayCanChi,
    weekday: WEEKDAYS[date.getDay()],
  };
}
