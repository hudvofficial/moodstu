import { after } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { curateMoodieMemoriesWithModel } from "@/lib/moodie/memory-curator";
import { createPendingMoodieMemory } from "@/lib/moodie/memory-store";
import { moodieVoiceEventSchema, sanitizeMoodieVoiceEventPayload } from "@/lib/moodie/voice/telemetry";

function appendTranscript(current: string | null, delta: string | undefined) {
  if (!delta) return current;
  return `${current || ""}${delta}`.slice(-20_000);
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = moodieVoiceEventSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "Invalid voice event" }, { status: 400 });
  const event = parsed.data;

  const { data: session, error: sessionError } = await supabase
    .from("moodie_voice_sessions")
    .select("id, status, reconnect_count, conversation_id")
    .eq("id", event.session_id)
    .eq("user_id", user.id)
    .single();
  if (sessionError || !session) return Response.json({ error: "Voice session not found" }, { status: 404 });

  let turnId: string | null = null;
  if (event.turn_sequence) {
    const { data: existingTurn } = await supabase
      .from("moodie_voice_turns")
      .select("id, user_transcript, assistant_transcript, first_input_at, first_input_transcript_at, first_assistant_audio_at, playback_started_at, completed_at")
      .eq("session_id", session.id)
      .eq("sequence", event.turn_sequence)
      .maybeSingle();

    const timestamp = event.occurred_at || new Date().toISOString();
    const turnPatch = {
      user_id: user.id,
      session_id: session.id,
      sequence: event.turn_sequence,
      updated_at: timestamp,
      ...(event.event_type === "input.audio_sent" ? { first_input_at: existingTurn?.first_input_at || timestamp } : {}),
      ...(event.event_type === "input.transcript_received" ? {
        first_input_transcript_at: existingTurn?.first_input_transcript_at || timestamp,
        user_transcript: appendTranscript(existingTurn?.user_transcript || null, event.transcript_delta),
      } : {}),
      ...(event.event_type === "assistant.first_audio_received" ? { first_assistant_audio_at: existingTurn?.first_assistant_audio_at || timestamp } : {}),
      ...(event.event_type === "assistant.audio_playback_started" ? { playback_started_at: existingTurn?.playback_started_at || timestamp } : {}),
      ...(event.event_type === "assistant.transcript_received" ? {
        assistant_transcript: appendTranscript(existingTurn?.assistant_transcript || null, event.transcript_delta),
      } : {}),
      ...(event.event_type === "assistant.turn_completed" ? { completed_at: timestamp } : {}),
      ...(event.event_type === "session.interrupted" ? { interrupted: true } : {}),
      ...(event.metrics ? { metrics: event.metrics } : {}),
    };

    const { data: turn, error: turnError } = await supabase
      .from("moodie_voice_turns")
      .upsert(turnPatch, { onConflict: "session_id,sequence" })
      .select("id, user_transcript")
      .single();
    if (turnError) return Response.json({ error: turnError.message }, { status: 500 });
    turnId = turn.id;

    if (event.event_type === "assistant.turn_completed" && session.conversation_id && turn.user_transcript?.trim()) {
      const memoryInput = {
        prompt: turn.user_transcript,
        conversationId: session.conversation_id,
        sourceVoiceTurnId: turn.id,
      };
      after(async () => {
        const candidates = await curateMoodieMemoriesWithModel(memoryInput);
        await Promise.all(candidates.map((candidate) => createPendingMoodieMemory({
          supabase,
          userId: user.id,
          candidate,
        })));
      });
    }
  }

  const occurredAt = event.occurred_at || new Date().toISOString();
  const { error: eventError } = await supabase.from("moodie_voice_events").upsert({
    session_id: session.id,
    turn_id: turnId,
    user_id: user.id,
    event_type: event.event_type,
    sequence: event.sequence,
    payload: sanitizeMoodieVoiceEventPayload(event),
    occurred_at: occurredAt,
  }, { onConflict: "session_id,sequence", ignoreDuplicates: true });
  if (eventError) return Response.json({ error: eventError.message }, { status: 500 });

  const status = event.event_type === "session.connected" ? "connected"
    : event.event_type === "session.failed" ? "failed"
      : event.event_type === "session.ended" ? "ended"
        : event.event_type === "session.connecting" ? "connecting"
          : session.status;
  await supabase.from("moodie_voice_sessions").update({
    status,
    last_event_at: occurredAt,
    updated_at: occurredAt,
    ...(event.event_type === "session.connected" ? { connected_at: occurredAt } : {}),
    ...(event.event_type === "session.resumed" ? { reconnect_count: session.reconnect_count + 1 } : {}),
    ...(event.event_type === "session.ended" ? { ended_at: occurredAt } : {}),
    ...(event.event_type === "session.failed" ? { ended_at: occurredAt, error: event.error || "Voice session failed" } : {}),
  }).eq("id", session.id).eq("user_id", user.id);

  return Response.json({ success: true, turn_id: turnId });
}
