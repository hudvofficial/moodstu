import type {
  MoodieMessagePart,
  MoodieMessageSource,
  MoodieSendResult,
  MoodieStreamEvent,
  MoodieTurnActivity,
  MoodieTurnStage,
} from "@/types/moodie";

export interface MoodieTurnState {
  requestId: string | null;
  turnId: string | null;
  lastSequence: number;
  active: boolean;
  stage: MoodieTurnStage | null;
  statusLabel: string | null;
  streamedText: string;
  parts: Array<{ id: string; part: MoodieMessagePart }>;
  sources: MoodieMessageSource[];
  activities: MoodieTurnActivity[];
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
  parts: [],
  sources: [],
  activities: [],
  result: null,
  error: null,
};

function stageForEvent(event: MoodieStreamEvent): MoodieTurnStage {
  if (event.type === "turn.accepted") return "accepted";
  if (event.type === "route.resolved") return "routing";
  if (event.type.startsWith("context.")) return "context";
  if (event.type === "plan.created") return "planning";
  if (event.type.startsWith("tool.")) return "tool";
  if (event.type === "text.delta" || event.type === "text.reset" || event.type === "part.created") return "generating";
  if (event.type === "turn.saving" || event.type === "memory.candidate") return "saving";
  if (event.type === "turn.completed") return "completed";
  if (event.type === "turn.cancelled") return "cancelled";
  return "failed";
}

function activityForEvent(event: MoodieStreamEvent, stage: MoodieTurnStage): MoodieTurnActivity | null {
  if (!("label" in event)) return null;
  const id = event.type.startsWith("tool.") && "tool_run_id" in event
    ? event.tool_run_id
    : `${event.turn_id}:${event.type}`;
  return {
    id,
    stage,
    label: event.label,
    state: event.type === "turn.failed" || event.type === "tool.failed" ? "error" : event.type.endsWith(".completed") ? "done" : "active",
    toolName: "tool_name" in event ? event.tool_name : undefined,
    durationMs: "duration_ms" in event ? event.duration_ms : undefined,
  };
}

function upsertActivity(activities: MoodieTurnActivity[], activity: MoodieTurnActivity) {
  return [...activities.filter((item) => item.id !== activity.id), activity].slice(-12);
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
  const next: MoodieTurnState = {
    ...state,
    requestId: event.request_id,
    turnId: event.turn_id,
    lastSequence: event.sequence,
    active: event.type !== "turn.completed" && event.type !== "turn.failed" && event.type !== "turn.cancelled",
    stage,
    statusLabel: "label" in event ? event.label : state.statusLabel,
    activities: activity ? upsertActivity(state.activities, activity) : state.activities,
  };

  if (event.type === "text.delta") next.streamedText += event.delta;
  if (event.type === "text.reset") next.streamedText = "";
  if (event.type === "part.created" && !next.parts.some((item) => item.id === event.part_id)) {
    next.parts = [...next.parts, { id: event.part_id, part: event.part }];
  }
  if (event.type === "tool.completed") next.sources = mergeSources(next.sources, event.sources);
  if (event.type === "turn.completed") next.result = event.data;
  if (event.type === "turn.failed") next.error = event.error;
  if (event.type === "turn.cancelled") next.error = event.label;
  return next;
}
