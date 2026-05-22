import { useState } from "react";
import { Phone, CheckCircle, XCircle, Play } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { TR, TD } from "@/components/ui/table";
import { RENTAL_STATUS_MAP } from "@/types/dress-constants";
import type { DressRental } from "@/types/dress";

// ─── HELPERS ────────────────────────────────
const fmtDate = (d: string | null) => d ? new Date(d).toLocaleDateString("vi-VN") : "—";
const fmtPrice = (v: number | null | undefined) =>
  v ? new Intl.NumberFormat("vi-VN").format(v) + "đ" : "—";

// ─── DESKTOP TABLE ROW ──────────────────────
export function RentalRow({
  rental, onReturn, onStart, onCancel,
}: {
  rental: DressRental;
  onReturn: (r: DressRental) => void;
  onStart: (id: string) => void;
  onCancel: (id: string) => void;
}) {
  const cfg = RENTAL_STATUS_MAP[rental.status] || RENTAL_STATUS_MAP.reserved;

  return (
    <TR>
      <TD>
        <div className="flex items-center gap-2">
          {rental.item_code && <span className="tag-badge text-xs">{rental.item_code}</span>}
          <span className="font-medium text-text-primary truncate">
            {rental.item_name || "—"}
          </span>
        </div>
      </TD>
      <TD>
        <div>
          <p className="font-medium">{rental.customer_name}</p>
          {rental.phone && (
            <p className="text-caption text-text-muted flex items-center gap-1">
              <Phone size={11} /> {rental.phone}
            </p>
          )}
        </div>
      </TD>
      <TD className="text-text-muted">
        {fmtDate(rental.pickup_date)} – {fmtDate(rental.return_date)}
      </TD>
      <TD className="font-semibold">{fmtPrice(rental.rental_price)}</TD>
      <TD className="text-text-muted">{fmtPrice(rental.deposit)}</TD>
      <TD>
        <Badge variant={cfg.variant}>{cfg.label}</Badge>
      </TD>
      <TD>
        <div className="flex items-center gap-1">
          {rental.status === "reserved" && (
            <div role="button" tabIndex={0} onKeyDown={(e) => { if (e.key === "Enter") { onStart(rental.id); } }}  onClick={() => onStart(rental.id)}  className="btn btn-ghost btn-xs gap-1">
              <Play size={12} /> Bắt đầu
            </div>
          )}
          {(rental.status === "renting" || rental.status === "overdue") && (
            <div role="button" tabIndex={0} onKeyDown={(e) => { if (e.key === "Enter") { onReturn(rental); } }}  onClick={() => onReturn(rental)}  className="btn btn-ghost btn-xs gap-1">
              <CheckCircle size={12} /> Trả
            </div>
          )}
          {rental.status === "reserved" && (
            <div role="button" tabIndex={0} onKeyDown={(e) => { if (e.key === "Enter") { onCancel(rental.id); } }}  onClick={() => onCancel(rental.id)}  className="btn btn-ghost btn-xs text-error gap-1">
              <XCircle size={12} /> Hủy
            </div>
          )}
        </div>
      </TD>
    </TR>
  );
}

// ─── MOBILE CARD ────────────────────────────
export function RentalCard({
  rental, onReturn, onStart, onCancel,
}: {
  rental: DressRental;
  onReturn: (r: DressRental) => void;
  onStart: (id: string) => void;
  onCancel: (id: string) => void;
}) {
  const cfg = RENTAL_STATUS_MAP[rental.status] || RENTAL_STATUS_MAP.reserved;

  return (
    <div className="card-interactive p-3 space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 min-w-0">
          {rental.item_code && <span className="tag-badge text-xs">{rental.item_code}</span>}
          <span className="text-body-sm font-medium text-text-primary truncate">
            {rental.item_name || "—"}
          </span>
        </div>
        <Badge variant={cfg.variant}>{cfg.label}</Badge>
      </div>

      <div className="flex items-center justify-between text-caption text-text-muted">
        <div className="flex items-center gap-1">
          <span className="font-medium text-text-primary">{rental.customer_name}</span>
          {rental.phone && (
            <>
              <span>·</span>
              <span>{rental.phone}</span>
            </>
          )}
        </div>
        <span className="font-medium text-text-secondary">{fmtPrice(rental.rental_price)}</span>
      </div>

      <div className="flex items-center justify-between">
        <p className="text-caption text-text-muted">
          {fmtDate(rental.pickup_date)} – {fmtDate(rental.return_date)}
        </p>
        <div className="flex items-center gap-1">
          {rental.status === "reserved" && (
            <div role="button" tabIndex={0} onKeyDown={(e) => { if (e.key === "Enter") { onStart(rental.id); } }}  onClick={() => onStart(rental.id)}  className="btn btn-ghost btn-xs gap-1">
              <Play size={12} /> Bắt đầu
            </div>
          )}
          {(rental.status === "renting" || rental.status === "overdue") && (
            <div role="button" tabIndex={0} onKeyDown={(e) => { if (e.key === "Enter") { onReturn(rental); } }}  onClick={() => onReturn(rental)}  className="btn btn-ghost btn-xs gap-1">
              <CheckCircle size={12} /> Trả
            </div>
          )}
          {rental.status === "reserved" && (
            <div role="button" tabIndex={0} onKeyDown={(e) => { if (e.key === "Enter") { onCancel(rental.id); } }}  onClick={() => onCancel(rental.id)}  className="btn btn-ghost btn-xs text-error gap-1">
              <XCircle size={12} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── CALENDAR VIEW ──────────────────────────
export function CalendarView({ rentals }: { rentals: DressRental[] }) {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth());

  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDay = new Date(year, month, 1).getDay(); // 0=Sun
  const monthName = new Date(year, month).toLocaleDateString("vi-VN", { month: "long", year: "numeric" });

  const prevMonth = () => {
    if (month === 0) { setMonth(11); setYear(year - 1); }
    else setMonth(month - 1);
  };
  const nextMonth = () => {
    if (month === 11) { setMonth(0); setYear(year + 1); }
    else setMonth(month + 1);
  };

  // Build day → rentals map
  const dayMap = new Map<number, DressRental[]>();
  rentals.forEach((r) => {
    const start = new Date(r.pickup_date);
    const end = new Date(r.return_date);
    for (let d = 1; d <= daysInMonth; d++) {
      const cellDate = new Date(year, month, d);
      if (cellDate >= start && cellDate <= end) {
        const list = dayMap.get(d) || [];
        list.push(r);
        dayMap.set(d, list);
      }
    }
  });

  const WEEKDAYS = ["CN", "T2", "T3", "T4", "T5", "T6", "T7"];

  return (
    <div className="card-base p-4 space-y-3">
      {/* Navigation */}
      <div className="flex items-center justify-between">
        <div role="button" tabIndex={0} onKeyDown={(e) => { if (e.key === "Enter") { prevMonth(); } }}  onClick={prevMonth}  className="btn btn-ghost btn-xs">←</div>
        <span className="text-body-sm font-semibold capitalize">{monthName}</span>
        <div role="button" tabIndex={0} onKeyDown={(e) => { if (e.key === "Enter") { nextMonth(); } }}  onClick={nextMonth}  className="btn btn-ghost btn-xs">→</div>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-7 gap-px">
        {WEEKDAYS.map((w) => (
          <div key={w} className="text-center text-caption font-medium text-text-muted py-1">{w}</div>
        ))}
        {/* Empty cells for first day offset */}
        {Array.from({ length: firstDay }).map((_, i) => (
          <div key={`e-${i}`} className="aspect-square" />
        ))}
        {/* Day cells */}
        {Array.from({ length: daysInMonth }).map((_, i) => {
          const day = i + 1;
          const items = dayMap.get(day) || [];
          const isToday = day === now.getDate() && month === now.getMonth() && year === now.getFullYear();

          return (
            <div
              key={day}
              className={`aspect-square p-0.5 bg-bg-hover/20 rounded text-xs relative ${isToday ? "bg-primary/10 font-bold" : ""}`}
            >
              <span className={`text-caption ${isToday ? "text-primary" : "text-text-muted"}`}>{day}</span>
              {items.length > 0 && (
                <div className="absolute bottom-0.5 left-0.5 right-0.5 flex gap-0.5 flex-wrap">
                  {items.slice(0, 3).map((r) => {
                    const cfg = RENTAL_STATUS_MAP[r.status];
                    const colorClass = cfg?.variant === "warning" ? "bg-warning"
                      : cfg?.variant === "info" ? "bg-info"
                      : cfg?.variant === "error" ? "bg-error"
                      : cfg?.variant === "success" ? "bg-success"
                      : "bg-text-muted";
                    return (
                      <div key={r.id} className={`w-1.5 h-1.5 rounded-full ${colorClass}`} title={`${r.customer_name} — ${cfg?.label}`} />
                    );
                  })}
                  {items.length > 3 && <span className="text-micro text-text-muted">+{items.length - 3}</span>}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-3 text-caption text-text-muted pt-2">
        {Object.entries(RENTAL_STATUS_MAP).map(([key, cfg]) => {
          const colorClass = cfg.variant === "warning" ? "bg-warning"
            : cfg.variant === "info" ? "bg-info"
            : cfg.variant === "error" ? "bg-error"
            : cfg.variant === "success" ? "bg-success"
            : "bg-text-muted";
          return (
            <div key={key} className="flex items-center gap-1">
              <div className={`w-2 h-2 rounded-full ${colorClass}`} />
              <span>{cfg.label}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
