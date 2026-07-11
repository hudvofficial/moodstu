"use client";

import dynamic from "next/dynamic";
import Image from "next/image";
import { CalendarDays, Check, ExternalLink, GitBranch, Images, Table2 } from "lucide-react";
import { MoodieActionPreviews } from "@/components/moodie/moodie-action-previews";
import { MoodieWidgetRenderer } from "@/components/moodie/moodie-widget-renderer";
import { normalizeMoodieDisplayText } from "@/lib/moodie/ux-helpers";
import type { MoodieMessagePart, MoodieWidget } from "@/types/moodie";

const MoodieChartPart = dynamic(
  () => import("@/components/moodie/moodie-chart-part").then((module) => module.MoodieChartPart),
  { ssr: false, loading: () => <div className="h-56 animate-pulse rounded-xl bg-bg-subtle" /> },
);

function formatCell(value: string | number | null, format: "text" | "date" | "currency" | "percent" | "status" | undefined) {
  if (value === null) return "—";
  if (format === "currency" && typeof value === "number") return new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND", maximumFractionDigits: 0 }).format(value);
  if (format === "percent" && typeof value === "number") return `${value.toLocaleString("vi-VN")}%`;
  if (format === "date" && typeof value === "string") return new Intl.DateTimeFormat("vi-VN", { dateStyle: "short" }).format(new Date(value));
  return String(value);
}

function partToLegacyWidget(part: Extract<MoodieMessagePart, { type: "metric_grid" }>): MoodieWidget {
  return { type: "kpi_cards", title: part.title, items: part.items };
}

export function MoodieMessageParts({ parts }: { parts: MoodieMessagePart[] }) {
  return (
    <div className="space-y-3.5">
      {parts.map((part, index) => {
        if (part.type === "metric_grid") return <MoodieWidgetRenderer key={index} widgets={[partToLegacyWidget(part)]} />;
        if (part.type === "chart") return <MoodieChartPart key={index} part={part} />;

        if (part.type === "timeline") {
          return (
            <section key={index} className="rounded-xl border border-border/70 bg-white p-3">
              <div className="mb-3 flex items-center gap-2"><CalendarDays className="h-4 w-4 text-primary" /><h4 className="text-sm font-semibold text-text-primary">{part.title}</h4></div>
              <div className="space-y-4">
                {part.groups.map((group) => (
                  <div key={group.date} className="space-y-2">
                    <p className="text-caption font-semibold uppercase tracking-wide text-text-muted">{group.label}</p>
                    <div className="space-y-1 border-l border-border pl-3">
                      {group.items.map((item) => (
                        <div key={item.id} className="relative px-2 py-2">
                          <span className="absolute -left-[17px] top-3 h-2 w-2 rounded-full bg-primary ring-2 ring-white" />
                          <div className="flex items-start justify-between gap-3"><div><p className="text-sm font-medium text-text-primary">{item.title}</p>{item.subtitle ? <p className="text-caption text-text-secondary">{item.subtitle}</p> : null}</div><span className="shrink-0 text-caption font-medium text-primary">{item.time_label}</span></div>
                          <div className="mt-1.5 flex flex-wrap gap-1.5"><span className="rounded-full bg-bg-subtle px-2 py-0.5 text-micro text-text-secondary">{item.source === "google" ? "Google" : item.source === "task" ? "Công việc" : "Studio"}</span>{item.status ? <span className="rounded-full bg-bg-subtle px-2 py-0.5 text-micro text-text-secondary">{item.status}</span> : null}</div>
                          {item.actions?.length ? <MoodieActionPreviews actions={item.actions} /> : null}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          );
        }

        if (part.type === "table") {
          return (
            <section key={index} className="overflow-hidden rounded-xl border border-border/70 bg-white">
              <div className="flex items-center gap-2 border-b border-border/60 px-3 py-2.5"><Table2 className="h-4 w-4 text-primary" /><h4 className="text-sm font-semibold text-text-primary">{part.title}</h4></div>
              <div className="hidden max-h-[360px] overflow-auto sm:block"><table className="w-full min-w-[520px] text-left text-caption"><thead className="sticky top-0 z-10 border-b border-border bg-bg-subtle text-text-secondary"><tr>{part.columns.map((column) => <th key={column.key} className={`whitespace-nowrap px-3 py-2 font-medium ${column.align === "right" ? "text-right" : column.align === "center" ? "text-center" : ""}`}>{column.label}</th>)}</tr></thead><tbody className="divide-y divide-border/50">{part.rows.map((row, rowIndex) => <tr key={rowIndex} className="hover:bg-bg-subtle/60">{part.columns.map((column) => <td key={column.key} className={`px-3 py-2.5 text-text-primary ${column.align === "right" ? "text-right" : column.align === "center" ? "text-center" : ""}`}>{formatCell(row[column.key] ?? null, column.format)}</td>)}</tr>)}</tbody></table></div>
              <div className="max-h-[420px] divide-y divide-border/60 overflow-y-auto sm:hidden">{part.rows.map((row, rowIndex) => <dl key={rowIndex} className="space-y-2 px-3 py-3">{part.columns.map((column) => <div key={column.key} className="grid grid-cols-[minmax(92px,0.42fr)_1fr] gap-3"><dt className="text-caption font-medium text-text-muted">{column.label}</dt><dd className={`min-w-0 break-words text-xs leading-5 text-text-primary ${column.align === "left" ? "text-left" : "text-right"}`}>{formatCell(row[column.key] ?? null, column.format)}</dd></div>)}</dl>)}</div>
              {part.truncated ? <p className="border-t border-border/60 px-3 py-2 text-caption text-text-muted">Danh sách đã được rút gọn.</p> : null}
            </section>
          );
        }

        if (part.type === "gallery") {
          return (
            <section key={index} className="space-y-3 rounded-xl border border-border/70 bg-white p-3">
              <div className="flex items-center justify-between gap-3"><div className="flex items-center gap-2"><Images className="h-4 w-4 text-primary" /><div><h4 className="text-sm font-semibold text-text-primary">{part.title}</h4>{part.summary ? <p className="text-caption text-text-muted">{part.summary}</p> : null}</div></div><span className="text-caption text-text-muted">{part.total_count} ảnh</span></div>
              <div className={part.layout === "filmstrip" ? "flex snap-x gap-2 overflow-x-auto pb-1" : "grid grid-cols-2 gap-2 sm:grid-cols-3"}>{part.items.map((item) => <figure key={item.id} className={`group relative overflow-hidden rounded-lg bg-bg-subtle ${part.layout === "filmstrip" ? "w-40 shrink-0 snap-start sm:w-48" : ""}`}><Image src={item.thumbnail_url} alt={item.alt} loading="lazy" width={item.dimensions?.width || 480} height={item.dimensions?.height || 360} unoptimized className="aspect-[4/3] w-full object-cover" />{item.selected ? <span className="absolute right-1.5 top-1.5 rounded-full bg-white/90 p-1 text-positive"><Check className="h-3 w-3" /></span> : null}{item.file_name ? <figcaption className="truncate px-2 py-1.5 text-micro text-text-secondary">{item.file_name}</figcaption> : null}</figure>)}</div>
              {part.actions?.length ? <MoodieActionPreviews actions={part.actions} /> : null}
            </section>
          );
        }

        return (
          <section key={index} className="rounded-xl border border-border/70 bg-white p-3">
            <div className="mb-3 flex items-center gap-2"><GitBranch className="h-4 w-4 text-primary" /><h4 className="text-sm font-semibold text-text-primary">{part.title}</h4></div>
            <div className="overflow-x-auto pb-1"><div className="flex min-w-max items-center gap-2">{part.nodes.map((node, nodeIndex) => <div key={node.id} className="flex items-center gap-2"><div className="w-36 rounded-lg border border-border bg-bg-subtle px-3 py-2 text-center"><p className="text-sm font-medium text-text-primary">{normalizeMoodieDisplayText(node.label)}</p>{node.subtitle ? <p className="mt-0.5 line-clamp-2 text-caption text-text-muted">{node.subtitle}</p> : null}</div>{nodeIndex < part.nodes.length - 1 ? <ExternalLink className="h-3.5 w-3.5 shrink-0 rotate-[-45deg] text-text-muted" /> : null}</div>)}</div></div>
          </section>
        );
      })}
    </div>
  );
}
