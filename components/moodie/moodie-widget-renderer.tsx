import type { MoodieWidget, MoodieWidgetTone } from "@/types/moodie";
import { normalizeMoodieDisplayText } from "@/lib/moodie/ux-helpers";

interface MoodieWidgetRendererProps {
  widgets: MoodieWidget[];
}

function toneClasses(tone: MoodieWidgetTone | undefined) {
  switch (tone) {
    case "positive":
      return "border-emerald-200 bg-emerald-50/70 text-emerald-900";
    case "warning":
      return "border-amber-200 bg-amber-50/80 text-amber-900";
    case "danger":
      return "border-rose-200 bg-rose-50/80 text-rose-900";
    default:
      return "border-border/70 bg-bg-hover/70 text-text-primary";
  }
}

function progressToneClasses(tone: MoodieWidgetTone | undefined) {
  switch (tone) {
    case "positive":
      return "bg-emerald-500";
    case "warning":
      return "bg-amber-500";
    case "danger":
      return "bg-rose-500";
    default:
      return "bg-primary";
  }
}

function formatCompactNumber(value: number) {
  return new Intl.NumberFormat("vi-VN", {
    notation: value >= 1000 ? "compact" : "standard",
    maximumFractionDigits: value >= 1000 ? 1 : 0,
  }).format(value);
}

export function MoodieWidgetRenderer({ widgets }: MoodieWidgetRendererProps) {
  if (widgets.length === 0) return null;

  return (
    <div className="space-y-3.5">
      {widgets.map((widget, widgetIndex) => {
        if (widget.type === "kpi_cards") {
          return (
            <section
              key={`${widget.type}-${widgetIndex}`}
              className="space-y-2.5 rounded-xl border border-border/70 bg-white p-3"
            >
              {widget.title ? (
                <h4 className="text-caption font-semibold uppercase tracking-wide text-text-secondary">
                  {normalizeMoodieDisplayText(widget.title)}
                </h4>
              ) : null}

              <div className="grid grid-cols-2 gap-px overflow-hidden rounded-lg border border-border/60 bg-border/60">
                {widget.items.map((item) => (
                  <div
                    key={`${item.label}-${item.value}`}
                    className={`min-w-0 border-0 px-3 py-2.5 ${toneClasses(item.tone)}`}
                  >
                    <p className="text-caption font-semibold uppercase tracking-wide text-text-secondary">
                      {normalizeMoodieDisplayText(item.label)}
                    </p>
                    <p className="mt-1 break-words text-body font-semibold">{item.value}</p>
                    {item.hint ? (
                      <p className="mt-1 text-caption text-text-secondary">{normalizeMoodieDisplayText(item.hint)}</p>
                    ) : null}
                  </div>
                ))}
              </div>
            </section>
          );
        }

        if (widget.type === "progress_bars") {
          return (
            <section
              key={`${widget.type}-${widgetIndex}`}
              className="space-y-3.5 rounded-xl border border-border/70 bg-white p-3"
            >
              {widget.title ? (
                <h4 className="text-caption font-semibold uppercase tracking-wide text-text-secondary">
                  {normalizeMoodieDisplayText(widget.title)}
                </h4>
              ) : null}

              {widget.items.map((item) => {
                const target = item.target > 0 ? item.target : 1;
                const percent = Math.max(0, Math.min(100, Math.round((item.current / target) * 100)));

                return (
                  <div key={`${item.label}-${item.current}-${item.target}`} className="space-y-1.5">
                    <div className="flex items-center justify-between gap-3 text-caption">
                      <span className="font-medium text-text-primary">{normalizeMoodieDisplayText(item.label)}</span>
                      <span className="text-text-secondary">
                        {item.current.toLocaleString("vi-VN")}
                        {item.unit ? `/${item.target.toLocaleString("vi-VN")} ${item.unit}` : `/${item.target.toLocaleString("vi-VN")}`}
                      </span>
                    </div>

                    <div className="h-2 overflow-hidden rounded-full bg-bg-hover">
                      <div
                        className={`h-full rounded-full transition-[width] duration-300 ${progressToneClasses(item.tone)}`}
                        style={{ width: `${percent}%` }}
                      />
                    </div>

                    <div className="flex items-center justify-between gap-3 text-caption text-text-secondary">
                      <span>{percent}% hoàn thành</span>
                      {item.hint ? <span className="text-right">{normalizeMoodieDisplayText(item.hint)}</span> : null}
                    </div>
                  </div>
                );
              })}
            </section>
          );
        }

        const maxValue = Math.max(...widget.items.map((item) => item.value), 1);

        return (
          <section
            key={`${widget.type}-${widgetIndex}`}
            className="space-y-3.5 rounded-xl border border-border/70 bg-white p-3"
          >
            {widget.title ? (
              <h4 className="text-caption font-semibold uppercase tracking-wide text-text-secondary">
                {normalizeMoodieDisplayText(widget.title)}
              </h4>
            ) : null}

            {widget.items.map((item) => {
              const percent = Math.max(6, Math.round((item.value / maxValue) * 100));

              return (
                <div key={`${item.label}-${item.value}`} className="space-y-1.5">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-body font-medium text-text-primary">{normalizeMoodieDisplayText(item.label)}</p>
                      {item.hint ? (
                        <p className="text-caption text-text-secondary">{normalizeMoodieDisplayText(item.hint)}</p>
                      ) : null}
                    </div>

                    <div className="text-right">
                      <p className="text-body font-semibold text-text-primary">
                        {item.value_label || formatCompactNumber(item.value)}
                      </p>
                      {item.secondary_value !== undefined ? (
                        <p className="text-caption text-text-secondary">
                          {item.secondary_label ? `${item.secondary_label}: ` : ""}
                          {formatCompactNumber(item.secondary_value)}
                        </p>
                      ) : null}
                    </div>
                  </div>

                  <div className="h-2 overflow-hidden rounded-full bg-bg-hover">
                    <div
                      className={`h-full rounded-full transition-[width] duration-300 ${progressToneClasses(item.tone)}`}
                      style={{ width: `${percent}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </section>
        );
      })}
    </div>
  );
}
