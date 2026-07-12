import type {
  MoodieActivityEntry,
  MoodieMessageMeta,
  MoodieMessageSource,
  MoodieMessageSourceV2,
  MoodieRuntimeEvent,
} from "@/types/moodie";

const MOODIE_TOOL_LABELS: Record<string, { running: string; completed: string; failed: string }> = {
  start_deep_research: { running: "Đang khởi tạo nghiên cứu nền", completed: "Đã bắt đầu nghiên cứu nền", failed: "Không thể bắt đầu nghiên cứu nền" },
  search_web: { running: "Đang kiểm tra nguồn mới nhất", completed: "Đã tra nguồn web", failed: "Không thể truy cập nguồn web" },
  search_news: { running: "Đang kiểm tra tin mới nhất", completed: "Đã tra nguồn tin", failed: "Không thể truy cập nguồn tin" },
  search_local: { running: "Đang tìm nguồn địa phương", completed: "Đã tra nguồn địa phương", failed: "Không thể truy cập nguồn địa phương" },
  get_financial_summary: { running: "Đang tổng hợp tài chính", completed: "Đã tổng hợp tài chính", failed: "Không thể tổng hợp tài chính" },
  get_debt_summary: { running: "Đang tổng hợp công nợ", completed: "Đã tổng hợp công nợ", failed: "Không thể tổng hợp công nợ" },
  get_pending_collections: { running: "Đang kiểm tra các khoản cần thu", completed: "Đã tổng hợp các khoản cần thu", failed: "Không thể kiểm tra các khoản cần thu" },
  search_contracts: { running: "Đang tìm hợp đồng", completed: "Đã tìm hợp đồng", failed: "Không thể tìm hợp đồng" },
  get_calendar_agenda: { running: "Đang tổng hợp lịch làm việc", completed: "Đã tổng hợp lịch làm việc", failed: "Không thể tổng hợp lịch làm việc" },
  get_upcoming_schedules: { running: "Đang kiểm tra lịch sắp tới", completed: "Đã tổng hợp lịch sắp tới", failed: "Không thể kiểm tra lịch sắp tới" },
  get_contract_delivery_assets: { running: "Đang kiểm tra tài sản bàn giao", completed: "Đã kiểm tra tài sản bàn giao", failed: "Không thể kiểm tra tài sản bàn giao" },
  list_contract_gallery_images: { running: "Đang kiểm tra thư viện ảnh", completed: "Đã kiểm tra thư viện ảnh", failed: "Không thể kiểm tra thư viện ảnh" },
  get_team_summary: { running: "Đang tổng hợp nhân sự", completed: "Đã tổng hợp nhân sự", failed: "Không thể tổng hợp nhân sự" },
  get_services_catalog: { running: "Đang tải danh mục dịch vụ", completed: "Đã tải danh mục dịch vụ", failed: "Không thể tải danh mục dịch vụ" },
  get_financial_goals: { running: "Đang tổng hợp mục tiêu tài chính", completed: "Đã tổng hợp mục tiêu tài chính", failed: "Không thể tổng hợp mục tiêu tài chính" },
};

export function getMoodieToolDisplayLabel(toolName: string | undefined, state: "running" | "completed" | "failed", fallback: string) {
  if (!toolName) return fallback;
  const labels = MOODIE_TOOL_LABELS[toolName];
  if (labels) return labels[state];
  return state === "running" ? "Đang xử lý dữ liệu" : state === "failed" ? "Không thể xử lý dữ liệu" : "Đã xử lý dữ liệu";
}

function stableHash(value: string) {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(36);
}

export function sanitizeMoodieSourceUrl(value?: string) {
  if (!value) return undefined;
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:" ? url.toString() : undefined;
  } catch {
    return undefined;
  }
}

function sanitizeMoodieSourceHref(value?: string) {
  if (!value) return undefined;
  if (value.startsWith("/") && !value.startsWith("//")) return value;
  return sanitizeMoodieSourceUrl(value);
}

function sourceIdentity(source: MoodieMessageSource, url?: string, href?: string) {
  if (source.entity_type && source.entity_id) {
    return `entity\u0000${source.kind || "database"}\u0000${source.entity_type}\u0000${source.entity_id}`;
  }
  if (url) return `url\u0000${url}`;
  if (href) return `href\u0000${href}`;
  return `content\u0000${source.kind || "database"}\u0000${source.label.trim()}\u0000${source.value || ""}`;
}

export function normalizeMoodieSources(
  sources: MoodieMessageSource[] = [],
  toolRunId?: string,
): MoodieMessageSourceV2[] {
  const unique = new Map<string, MoodieMessageSourceV2>();
  for (const source of sources) {
    const title = source.label.trim();
    if (!title) continue;
    const explicitHref = sanitizeMoodieSourceHref(source.href);
    const valueUrl = sanitizeMoodieSourceUrl(source.value);
    const url = valueUrl || (explicitHref?.startsWith("http") ? explicitHref : undefined);
    const href = explicitHref || url;
    const kind = source.kind || (url ? "web" : "database");
    const key = sourceIdentity(source, url, href);
    const existing = unique.get(key);
    const toolRunIds = [...new Set([...(existing?.tool_run_ids || []), ...(toolRunId ? [toolRunId] : [])])];
    unique.set(key, {
      id: `source_${stableHash(key)}`,
      kind,
      title,
      url,
      href,
      domain: url ? new URL(url).hostname : undefined,
      snippet: source.hint?.trim() || (url ? undefined : source.value?.trim() || undefined),
      entity_type: source.entity_type,
      entity_id: source.entity_id,
      tool_run_ids: toolRunIds.length ? toolRunIds : undefined,
      tool_run_id: toolRunId,
      metadata: source.metadata,
    });
  }
  return [...unique.values()];
}

export function mergeMoodieSources(
  current: MoodieMessageSourceV2[],
  next: MoodieMessageSourceV2[],
) {
  const merged = new Map(current.map((source) => [source.id, source]));
  next.forEach((source) => {
    const existing = merged.get(source.id);
    const toolRunIds = [...new Set([
      ...(existing?.tool_run_ids || (existing?.tool_run_id ? [existing.tool_run_id] : [])),
      ...(source.tool_run_ids || (source.tool_run_id ? [source.tool_run_id] : [])),
    ])];
    merged.set(source.id, {
      ...existing,
      ...source,
      tool_run_ids: toolRunIds.length ? toolRunIds : undefined,
    });
  });
  return [...merged.values()];
}

function kindForEvent(event: MoodieRuntimeEvent): MoodieActivityEntry["kind"] {
  if (event.type === "turn.accepted") return "request";
  if (event.type === "route.resolved") return "route";
  if (event.type.startsWith("context.")) return "context";
  if (event.type === "plan.created") return "plan";
  if (event.type.startsWith("tool.")) return "tool";
  if (event.type === "generation.started" || event.type.startsWith("text.") || event.type === "part.created") return "generation";
  return "save";
}

export function activityIdForEvent(event: MoodieRuntimeEvent, turnId: string) {
  return event.type.startsWith("tool.") && "tool_run_id" in event
    ? event.tool_run_id
    : `${turnId}:${kindForEvent(event)}`;
}

export function reduceMoodieActivityHistory(
  current: MoodieActivityEntry[],
  event: MoodieRuntimeEvent,
  timestamp: string,
  turnId: string,
  sourceIds: string[] = [],
) {
  if (!("label" in event)) return current;
  const id = activityIdForEvent(event, turnId);
  const existing = current.find((entry) => entry.id === id);
  const terminal = event.type.endsWith(".completed")
    || event.type === "route.resolved"
    || event.type === "plan.created"
    || event.type === "turn.completed";
  const failed = event.type.endsWith(".failed") || event.type === "turn.failed";
  const state = failed ? "failed" : terminal ? "completed" : "running";
  const toolName = "tool_name" in event ? event.tool_name : existing?.tool_name;
  const next: MoodieActivityEntry = {
    id,
    kind: kindForEvent(event),
    action: event.type,
    label: event.type.startsWith("tool.") ? getMoodieToolDisplayLabel(toolName, state, event.label) : event.label,
    state,
    started_at: existing?.started_at || timestamp,
    completed_at: terminal || failed ? timestamp : existing?.completed_at,
    duration_ms: "duration_ms" in event ? event.duration_ms : existing?.duration_ms,
    tool_name: toolName,
    source_ids: sourceIds.length ? sourceIds : existing?.source_ids,
    error_code: failed ? event.type : existing?.error_code,
  };
  return [...current.filter((entry) => entry.id !== id), next].slice(-24);
}

export function upgradeMoodieMessageMeta(metadata: MoodieMessageMeta | null): MoodieMessageMeta | null {
  if (!metadata) return metadata;
  if (metadata.response_ui_version === 2 && (metadata.sources_v2 || !metadata.sources?.length)) return metadata;
  const sourcesV2 = normalizeMoodieSources(metadata.sources || []);
  const trace = metadata.trace;
  const activityHistory: MoodieActivityEntry[] = trace
    ? trace.tools.map((tool, index) => ({
        id: `legacy_tool_${index}_${tool.name}`,
        kind: "tool",
        action: tool.ok ? "tool.completed" : "tool.failed",
        label: getMoodieToolDisplayLabel(tool.name, tool.ok ? "completed" : "failed", tool.ok ? `Đã hoàn tất ${tool.name}` : `${tool.name} gặp lỗi`),
        state: tool.ok ? "completed" : "failed",
        started_at: trace.started_at,
        duration_ms: tool.duration_ms,
        source_ids: sourcesV2.map((source) => source.id),
        error_code: tool.ok ? undefined : "legacy_tool_failed",
      }))
    : [];
  return {
    ...metadata,
    response_ui_version: 2,
    activity_history: activityHistory,
    sources_v2: sourcesV2,
  };
}
