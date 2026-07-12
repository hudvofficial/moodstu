import { z } from "zod";

export const moodieVoiceEventTypeSchema = z.enum([
  "session.token_issued",
  "session.connecting",
  "session.connected",
  "session.resumed",
  "session.ended",
  "session.failed",
  "mic.capture_started",
  "input.audio_sent",
  "input.transcript_received",
  "assistant.first_audio_received",
  "assistant.audio_playback_started",
  "assistant.transcript_received",
  "assistant.turn_completed",
  "session.interrupted",
]);

export type MoodieVoiceEventType = z.infer<typeof moodieVoiceEventTypeSchema>;

export const moodieVoiceEventSchema = z.object({
  session_id: z.string().uuid(),
  event_type: moodieVoiceEventTypeSchema,
  sequence: z.number().int().positive(),
  turn_sequence: z.number().int().positive().optional(),
  occurred_at: z.string().datetime().optional(),
  transcript_delta: z.string().max(4000).optional(),
  metrics: z.record(z.string(), z.number().finite()).optional(),
  error: z.string().max(1000).optional(),
});

export type MoodieVoiceEventInput = z.infer<typeof moodieVoiceEventSchema>;

export function sanitizeMoodieVoiceEventPayload(input: MoodieVoiceEventInput) {
  return {
    metrics: input.metrics || {},
    ...(input.error ? { error: input.error } : {}),
  };
}
