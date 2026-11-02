import { getLunarDate, getLunarDaySummary, lunarToSolar } from "@/lib/lunar-calendar";

function toLocalDateParts(date: Date | null) {
  return date
    ? [date.getDate(), date.getMonth() + 1, date.getFullYear()]
    : null;
}

describe("Vietnamese lunar calendar conversion — Calendar drawer", () => {
  it("converts 02/11/2026 ↔ 24/09/2026 lunar without offset", () => {
    expect(getLunarDate(2, 11, 2026)).toEqual({
      day: 24,
      month: 9,
      year: 2026,
      leap: false,
    });
    expect(toLocalDateParts(lunarToSolar(24, 9, 2026))).toEqual([2, 11, 2026]);

    const summary = getLunarDaySummary(new Date(2026, 10, 2));
    expect([summary.solarDay, summary.solarMonth, summary.solarYear]).toEqual([2, 11, 2026]);
    expect([summary.lunarDay, summary.lunarMonth, summary.lunarYear, summary.leap]).toEqual([24, 9, 2026, false]);
    expect(summary.canChiDay).toBe("Canh Thìn");
    expect(summary.auspiciousHours.length).toBeGreaterThan(0);
  });

  it("distinguishes the leap 6th lunar month in 2025", () => {
    expect(getLunarDate(25, 7, 2025)).toEqual({
      day: 1,
      month: 6,
      year: 2025,
      leap: true,
    });
    expect(toLocalDateParts(lunarToSolar(1, 6, 2025, true))).toEqual([25, 7, 2025]);
    expect(toLocalDateParts(lunarToSolar(1, 6, 2025, false))).not.toEqual([25, 7, 2025]);
  });

  it("converts lunar New Year's Day 2025 correctly", () => {
    expect(getLunarDate(29, 1, 2025)).toEqual({
      day: 1,
      month: 1,
      year: 2025,
      leap: false,
    });
    expect(toLocalDateParts(lunarToSolar(1, 1, 2025))).toEqual([29, 1, 2025]);
  });

  it("round-trips Gregorian leap day 29/02/2024", () => {
    const lunar = getLunarDate(29, 2, 2024);
    expect(toLocalDateParts(lunarToSolar(lunar.day, lunar.month, lunar.year, lunar.leap))).toEqual([29, 2, 2024]);
  });

  it("rejects invalid lunar dates and leap-month flags", () => {
    expect(lunarToSolar(31, 2, 2026)).toBeNull();
    expect(lunarToSolar(1, 6, 2026, true)).toBeNull();
    expect(lunarToSolar(0, 9, 2026)).toBeNull();
  });

  it("round-trips 192 valid Gregorian samples from 2024–2027, including leap months", () => {
    let count = 0;
    for (let year = 2024; year <= 2027; year++) {
      for (let month = 1; month <= 12; month++) {
        for (const day of [1, 10, 20, 28]) {
          const lunar = getLunarDate(day, month, year);
          expect(toLocalDateParts(lunarToSolar(lunar.day, lunar.month, lunar.year, lunar.leap))).toEqual([
            day, month, year,
          ]);
          count++;
        }
      }
    }
    expect(count).toBe(192);
  });
});
