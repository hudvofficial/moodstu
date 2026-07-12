import type {
  MoodieActivityEntry,
  MoodieMessagePart,
  MoodieMessageSource,
  MoodieMessageSourceV2,
  MoodieSendResult,
  MoodieStreamEvent,
  MoodieTurnActivity,
  MoodieTurnStage,
} from "@/types/moodie";
import { activityIdForEvent, mergeMoodieSources, normalizeMoodieSources, reduceMoodieActivityHistory } from "@/lib/moodie/response-metadata";

export interface MoodieTurnState {
  requestId: string | null;
  turnId: string | null;
  lastSequence: number;
  active: boolean;
  stage: MoodieTurnStage | null;
  statusLabel: string | null;
  streamedText: string;
  replaceTextOnNextDelta: boolean;
  parts: Array<{ id: string; part: MoodieMessagePart }>;
  sources: MoodieMessageSource[];
  sourcesV2: MoodieMessageSourceV2[];
  activities: MoodieTurnActivity[];
  activityHistory: MoodieActivityEntry[];
  result: MoodieSendResult | null;
  error: string | null;
}

export const initialMoodieTurnState: MoodieTurnState = {
  requestId: null,
  turnId: null,
  lastSequence: 0,
  active: false,
  stage: null,
  statusLabel: null,
  streamedText: "",
  replaceTextOnNextDelta: false,
  parts: [],
  sources: [],
  sourcesV2: [],
  activities: [],
  activityHistory: [],
  result: null,
  error: null,
};

function stageForEvent(event: MoodieStreamEvent): MoodieTurnStage {
  if (event.type === "turn.accepted") return "accepted";
  if (event.type === "route.resolved") return "routing";
  if (event.type.startsWith("context.")) return "context";
  if (event.type === "plan.created") return "planning";
  if (event.type.startsWith("tool.")) return "tool";
  if (event.type === "generation.started" || event.type === "text.delta" || event.type === "text.reset" || event.type === "part.created") return "generating";
  if (event.type === "turn.saving" || event.type === "memory.candidate") return "saving";
  if (event.type === "turn.completed") return "completed";
  if (event.type === "turn.cancelled") return "cancelled";
  return "failed";
}

function activityForEvent(event: MoodieStreamEvent, stage: MoodieTurnStage): MoodieTurnActivity | null {
  if (!("label" in event)) return null;
  const terminal = event.type.endsWith(".completed") || event.type === "route.resolved" || event.type === "plan.created";
  return {
    id: activityIdForEvent(event, event.turn_id),
    stage,
    label: event.label,
    state: event.type === "turn.failed" || event.type === "tool.failed" ? "error" : terminal ? "done" : "active",
    toolName: "tool_name" in event ? event.tool_name : undefined,
    durationMs: "duration_ms" in event ? event.duration_ms : undefined,
  };
}

function upsertActivity(activities: MoodieTurnActivity[], activity: MoodieTurnActivity) {
  const settled = activities.map((item) => item.id !== activity.id && item.state === "active" ? { ...item, state: "done" as const } : item);
  return [...settled.filter((item) => item.id !== activity.id), activity].slice(-24);
}

function mergeSources(current: MoodieMessageSource[], next: MoodieMessageSource[] | undefined) {
  if (!next?.length) return current;
  const seen = new Set(current.map((source) => `${source.label}\u0000${source.value || ""}`));
  return [...current, ...next.filter((source) => {
    const key = `${source.label}\u0000${source.value || ""}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  })];
}

export type MoodieTurnAction = MoodieStreamEvent | { type: "turn.reset" };

export function reduceMoodieTurn(state: MoodieTurnState, event: MoodieTurnAction): MoodieTurnState {
  if (event.type === "turn.reset") return initialMoodieTurnState;
  if (event.version !== 2 || event.sequence <= state.lastSequence) return state;
  if (state.turnId && event.turn_id !== state.turnId) return state;

  const stage = stageForEvent(event);
  const activity = activityForEvent(event, stage);
  const normalizedSources = event.type === "tool.completed"
    ? normalizeMoodieSources(event.sources, event.tool_run_id)
    : [];
  const sourcesV2 = mergeMoodieSources(state.sourcesV2, normalizedSources);
  const sourceIds = normalizedSources.map((source) => source.id);
  const next: MoodieTurnState = {
    ...state,
    requestId: event.request_id,
    turnId: event.turn_id,
    lastSequence: event.sequence,
    active: event.type !== "turn.completed" && event.type !== "turn.failed" && event.type !== "turn.cancelled",
    stage,
    statusLabel: "label" in event ? event.label : state.statusLabel,
    activities: activity ? upsertActivity(state.activities, activity) : state.activities,
    sourcesV2,
    activityHistory: reduceMoodieActivityHistory(
      state.activityHistory,
      event,
      event.timestamp,
      event.turn_id,
      sourceIds,
    ),
  };

  if (event.type === "text.delta") {
    next.streamedText = state.replaceTextOnNextDelta ? event.delta : state.streamedText + event.delta;
    next.replaceTextOnNextDelta = false;
  }
  // Keep the last complete draft visible until the replacement starts. Clearing
  // immediately creates a blank frame between verification/rewrite passes.
  if (event.type === "text.reset") next.replaceTextOnNextDelta = true;
  if (event.type === "part.created" && !next.parts.some((item) => item.id === event.part_id)) {
    next.parts = [...next.parts, { id: event.part_id, part: event.part }];
  }
  if (event.type === "tool.completed") next.sources = mergeSources(next.sources, event.sources);
  if (event.type === "turn.completed") next.result = event.data;
  if (event.type === "turn.failed") next.error = event.error;
  if (event.type === "turn.cancelled") next.error = event.label;
  return next;
}
