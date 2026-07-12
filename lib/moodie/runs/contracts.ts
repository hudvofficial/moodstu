import { z } from "zod";

export const moodieRunKindSchema = z.enum(["task", "research", "action"]);
export const moodieRunStatusSchema = z.enum([
  "proposed",
  "awaiting_confirmation",
  "queued",
  "running",
  "completed",
  "failed",
  "cancelled",
  "expired",
]);

export const proposeMoodieRunSchema = z.object({
  conversationId: z.string().uuid().optional(),
  voiceSessionId: z.string().uuid().optional(),
  parentTurnId: z.string().uuid().optional(),
  kind: moodieRunKindSchema,
  title: z.string().trim().min(1).max(240),
  toolName: z.string().trim().min(1).max(120).optional(),
  readOnly: z.boolean().default(false),
  request: z.record(z.string(), z.unknown()).default({}),
  idempotencyKey: z.string().trim().min(8).max(200).optional(),
});

export const confirmMoodieRunSchema = z.object({
  runId: z.string().uuid(),
  confirmationToken: z.string().min(24).max(512),
});

export const cancelMoodieRunSchema = z.object({
  runId: z.string().uuid(),
});
