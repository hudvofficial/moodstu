"use client";

import { useMemo } from "react";
import { CalendarDays, Clock3, Compass, Plus, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Drawer } from "@/components/ui/drawer";
import { getLunarDaySummary, type LunarDaySummary } from "@/lib/lunar-calendar";

interface LunarDayDrawerProps {
  date: Date | null;
  onClose: () => void;
  onCreateEvent: (date: Date) => void;
  onGoToCalendar: (date: Date) => void;
}

function DetailItem({ label, value }: { label: string; value: string | null }) {
  if (!value) return null;

  return (
    <div className="rounded-lg border border-border bg-bg-card px-3 py-2.5">
      <div className="text-tiny font-semibold uppercase tracking-wider text-text-muted">{label}</div>
      <div className="mt-1 text-sm font-semibold text-text-primary">{value}</div>
    </div>
  );
}

function UnknownItem({ label }: { label: string }) {
  return (
    <div className="rounded-lg border border-dashed border-border bg-bg-hover/50 px-3 py-2.5">
      <div className="text-tiny font-semibold uppercase tracking-wider text-text-muted">{label}</div>
      <div className="mt-1 text-sm font-medium text-text-muted">Chưa có dữ liệu xác thực</div>
    </div>
  );
}

function AuspiciousHours({ summary }: { summary: LunarDaySummary }) {
  if (summary.auspiciousHours.length === 0) return null;

  return (
    <section className="rounded-lg border border-border bg-bg-card p-4">
      <div className="mb-3 flex items-center gap-2">
        <Clock3 className="size-4 text-primary" />
        <h3 className="text-sm font-bold text-text-primary">Giờ hoàng đạo</h3>
      </div>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {summary.auspiciousHours.map((hour) => (
          <div key={hour.label} className="rounded-md bg-bg-hover px-3 py-2 text-center">
            <div className="text-sm font-bold text-text-primary">{hour.chi}</div>
            <div className="mt-0.5 text-tiny font-medium text-text-muted">{hour.range}</div>
          </div>
        ))}
      </div>
    </section>
  );
}

export function LunarDayDrawer({ date, onClose, onCreateEvent, onGoToCalendar }: LunarDayDrawerProps) {
  const summary = useMemo(() => (date ? getLunarDaySummary(date) : null), [date]);

  if (!summary) {
    return null;
  }

  const title = `Ngày ${summary.solarDay}/${summary.solarMonth}/${summary.solarYear}`;
  const lunarMonthLabel = `Tháng ${summary.lunarMonth}${summary.leap ? " nhuận" : ""}`;

  return (
    <Drawer isOpen={!!date} onClose={onClose} title="Tra cứu ngày" size="lg">
      <div className="flex min-h-full flex-col">
        <div className="flex flex-col gap-4 pb-4">
          <section className="overflow-hidden rounded-xl border border-border bg-bg-card shadow-sm">
            <div className="bg-bg-hover px-4 py-3 text-center">
              <div className="text-sm font-bold text-text-primary">
                Tháng {summary.solarMonth}, {summary.solarYear}
              </div>
              <div className="mt-3 text-7xl font-black leading-none text-primary">{summary.solarDay}</div>
              <div className="mt-2 text-base font-bold uppercase text-text-primary">{summary.weekday}</div>
              <div className="mt-2 inline-flex items-center rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
                Ngày {summary.canChiDay}
              </div>
            </div>

            <div className="px-4 py-4">
              <div className="flex items-center justify-center gap-3">
                <Sparkles className="size-8 text-primary/40" />
                <div className="text-center">
                  <div className="text-4xl font-black leading-none text-text-primary">{summary.lunarDay}</div>
                  <div className="mt-1 text-sm font-bold text-primary">{lunarMonthLabel}</div>
                  <div className="text-xs font-medium text-text-muted">Năm {summary.canChiYear}</div>
                </div>
              </div>
            </div>
          </section>

          <section className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            <DetailItem label="Dương lịch" value={title} />
            <DetailItem label="Âm lịch" value={`${summary.lunarDay}/${summary.lunarMonth}/${summary.lunarYear}${summary.leap ? " nhuận" : ""}`} />
            <DetailItem label="Ngày" value={summary.canChiDay} />
            <DetailItem label="Tháng" value={summary.canChiMonth} />
            <DetailItem label="Năm" value={summary.canChiYear} />
            <DetailItem label="Tiết khí" value={summary.solarTerm} />
          </section>

          <AuspiciousHours summary={summary} />

          <section className="rounded-lg border border-border bg-bg-card p-4">
            <div className="mb-3 flex items-center gap-2">
              <Compass className="size-4 text-primary" />
              <h3 className="text-sm font-bold text-text-primary">Thông tin mở rộng</h3>
            </div>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              <UnknownItem label="Tuổi xung" />
              <UnknownItem label="Hỷ thần" />
              <UnknownItem label="Tài thần" />
              <UnknownItem label="Cát hung công việc" />
            </div>
            <p className="mt-3 text-xs leading-relaxed text-text-muted">
              Các mục mở rộng sẽ chỉ hiển thị khi có bộ quy tắc xác thực, tránh đưa dữ liệu phong thủy không chắc chắn vào nghiệp vụ.
            </p>
          </section>
        </div>

        <div className="mt-2 flex flex-col gap-2 border-t border-border bg-bg-base pt-4 pb-[calc(1rem+env(safe-area-inset-bottom))] sm:flex-row">
          <Button
            type="button"
            variant="primary"
            className="w-full justify-center gap-2"
            onClick={() => onCreateEvent(summary.solarDate)}
          >
            <Plus className="size-4" />
            Tạo lịch trình
          </Button>
          <Button
            type="button"
            variant="outline"
            className="w-full justify-center gap-2"
            onClick={() => onGoToCalendar(summary.solarDate)}
          >
            <CalendarDays className="size-4" />
            Đi tới lịch
          </Button>
        </div>
      </div>
    </Drawer>
  );
}
