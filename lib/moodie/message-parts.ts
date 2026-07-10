import { z } from "zod";
import type { MoodieMessagePart, MoodieWidget } from "@/types/moodie";

const toneSchema = z.enum(["default", "positive", "warning", "danger"]);
const actionSchema = z.object({
  id: z.string().min(1),
  kind: z.enum(["navigate", "sync_drive_gallery", "refresh_gallery_share", "sync_google_calendar"]),
  label: z.string().min(1),
  href: z.string().startsWith("/").optional(),
  target_id: z.string().min(1).optional(),
  conversation_id: z.string().uuid().optional(),
  description: z.string(),
  risk: z.enum(["none", "low", "medium", "high"]),
  requires_approval: z.boolean(),
}).superRefine((action, context) => {
  if (action.kind === "navigate" && !action.href) context.addIssue({ code: "custom", message: "Navigation action requires href" });
  if (action.kind !== "navigate" && !action.target_id) context.addIssue({ code: "custom", message: "Side-effect action requires target_id" });
});

const metricGridSchema = z.object({
  type: z.literal("metric_grid"),
  title: z.string().optional(),
  items: z.array(z.object({
    label: z.string().min(1),
    value: z.string().min(1),
    hint: z.string().optional(),
    tone: toneSchema.optional(),
  })).min(1).max(8),
});

const chartSchema = z.object({
  type: z.literal("chart"),
  chart: z.enum(["bar", "stacked_bar", "line", "area", "donut", "sparkline"]),
  title: z.string().min(1),
  description: z.string().optional(),
  x_key: z.string().min(1),
  series: z.array(z.object({
    key: z.string().min(1),
    label: z.string().min(1),
    color_token: z.enum(["default", "positive", "warning", "danger", "info", "primary"]),
    value_format: z.enum(["number", "currency", "percent", "duration"]).optional(),
  })).min(1).max(4),
  data: z.array(z.record(z.string(), z.union([z.string(), z.number(), z.null()]))).max(30),
  insight: z.string().optional(),
});

const timelineSchema = z.object({
  type: z.literal("timeline"),
  title: z.string().min(1),
  groups: z.array(z.object({
    date: z.string(),
    label: z.string(),
    items: z.array(z.object({
      id: z.string(),
      time_label: z.string(),
      title: z.string(),
      subtitle: z.string().optional(),
      source: z.enum(["studio", "google", "task"]),
      status: z.string().optional(),
      tone: toneSchema.optional(),
      actions: z.array(actionSchema).optional(),
    })).max(20),
  })).max(14),
});

const tableSchema = z.object({
  type: z.literal("table"),
  title: z.string().min(1),
  columns: z.array(z.object({
    key: z.string().min(1),
    label: z.string().min(1),
    align: z.enum(["left", "center", "right"]).optional(),
    format: z.enum(["text", "date", "currency", "percent", "status"]).optional(),
  })).min(1).max(10),
  rows: z.array(z.record(z.string(), z.union([z.string(), z.number(), z.null()]))).max(20),
  truncated: z.boolean().optional(),
});

const gallerySchema = z.object({
  type: z.literal("gallery"),
  title: z.string().min(1),
  summary: z.string().optional(),
  layout: z.enum(["grid", "filmstrip"]),
  items: z.array(z.object({
    id: z.string(),
    thumbnail_url: z.string().refine((value) => value.startsWith("/api/") || value.startsWith("https://drive.google.com/thumbnail") || value.startsWith("https://lh3.googleusercontent.com/")),
    alt: z.string(),
    file_name: z.string().optional(),
    selected: z.boolean().optional(),
    starred: z.boolean().optional(),
    dimensions: z.object({ width: z.number().positive(), height: z.number().positive() }).optional(),
  })).max(12),
  total_count: z.number().int().nonnegative(),
  actions: z.array(actionSchema).optional(),
});

const diagramSchema = z.object({
  type: z.literal("diagram"),
  diagram: z.enum(["flow", "relationship", "funnel", "status_flow"]),
  title: z.string().min(1),
  nodes: z.array(z.object({
    id: z.string().min(1),
    label: z.string().min(1),
    subtitle: z.string().optional(),
    kind: z.enum(["start", "process", "decision", "entity", "status", "end"]),
    tone: toneSchema.optional(),
  })).min(1).max(12),
  edges: z.array(z.object({ from: z.string(), to: z.string(), label: z.string().optional() })).max(16),
}).superRefine((part, context) => {
  const ids = new Set(part.nodes.map((node) => node.id));
  for (const edge of part.edges) {
    if (!ids.has(edge.from) || !ids.has(edge.to)) {
      context.addIssue({ code: "custom", message: "Diagram edge references an unknown node" });
    }
  }
});

export const moodieMessagePartSchema = z.discriminatedUnion("type", [
  metricGridSchema,
  chartSchema,
  timelineSchema,
  tableSchema,
  gallerySchema,
  diagramSchema,
]);

export function parseMoodieMessageParts(value: unknown): MoodieMessagePart[] | undefined {
  if (!Array.isArray(value)) return undefined;
  const parts = value.flatMap((item) => {
    const parsed = moodieMessagePartSchema.safeParse(item);
    return parsed.success ? [parsed.data as MoodieMessagePart] : [];
  });
  return parts.length > 0 ? parts : undefined;
}

export function widgetsToMoodieParts(widgets: MoodieWidget[] | undefined): MoodieMessagePart[] | undefined {
  if (!widgets?.length) return undefined;
  return widgets.map((widget) => {
    if (widget.type === "kpi_cards") return { type: "metric_grid", title: widget.title, items: widget.items };
    const data = widget.type === "progress_bars"
      ? widget.items.map((item) => ({ label: item.label, value: item.current }))
      : widget.items.map((item) => ({ label: item.label, value: item.value }));
    return {
      type: "chart",
      chart: "bar",
      title: widget.title || "So sánh",
      x_key: "label",
      series: [{ key: "value", label: "Giá trị", color_token: "primary", value_format: "number" }],
      data,
    } satisfies MoodieMessagePart;
  });
}
