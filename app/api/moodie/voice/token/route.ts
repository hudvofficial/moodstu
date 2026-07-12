import { GoogleGenAI } from "@google/genai";
import { createAdminClient, createClient } from "@/lib/supabase/server";
import {
  buildMoodieLiveConnectConfig,
  getMoodieVoiceLiveConfig,
} from "@/lib/moodie/voice-live-config";
import { buildMoodieVoiceMemoryPacket, planMoodieContext } from "@/lib/moodie/context-planner";
import { normalizeRole } from "@/types/roles";

function isRateLimitError(error: unknown) {
  if (typeof error !== "object" || error === null) return false;
  const candidate = error as { status?: number; code?: number; message?: string };
  return candidate.status === 429 || candidate.code === 429 || candidate.message?.includes("429");
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return Response.json(
      { error: "Phi\u00ean \u0111\u0103ng nh\u1eadp \u0111\u00e3 h\u1ebft h\u1ea1n" },
      { status: 401 },
    );
  }

  const voiceConfig = await getMoodieVoiceLiveConfig();
  const body = await request.json().catch(() => ({})) as { conversation_id?: string | null; session_id?: string | null };
  if (voiceConfig.engine === "cascade" || !voiceConfig.apiKey) {
    return Response.json(
      {
        error: voiceConfig.engine === "cascade"
          ? "Ch\u1ebf \u0111\u1ed9 gi\u1ecdng n\u00f3i Live \u0111ang t\u1eaft."
          : "Ch\u01b0a c\u1ea5u h\u00ecnh Google API key cho gi\u1ecdng n\u00f3i.",
        engine: "cascade",
      },
      { status: 503 },
    );
  }

  const admin = await createAdminClient();
  const [{ data: employee }, { data: conversation }] = await Promise.all([
    admin.from("employees").select("id, auth_user_id, full_name, email, department, position, role").eq("auth_user_id", user.id).eq("status", "active").maybeSingle(),
    body.conversation_id
      ? supabase.from("ai_conversations").select("id, summary").eq("id", body.conversation_id).eq("user_id", user.id).maybeSingle()
      : Promise.resolve({ data: null }),
  ]);
  if (!employee) return Response.json({ error: "Không tìm thấy hồ sơ người dùng Moodie" }, { status: 403 });
  const contextPacket = await planMoodieContext({
    supabase,
    userContext: {
      id: employee.auth_user_id || user.id,
      fullName: employee.full_name,
      email: employee.email,
      department: employee.department,
      position: employee.position,
      role: employee.role,
    },
    conversationId: conversation?.id,
    conversationSummary: conversation?.summary,
    includeRetrieval: false,
  });
  const connectConfig = buildMoodieLiveConnectConfig({
    voice: voiceConfig.voice,
    contextPacket: buildMoodieVoiceMemoryPacket(contextPacket),
    role: normalizeRole(employee.role),
  });
  const now = Date.now();

  try {
    const ai = new GoogleGenAI({
      apiKey: voiceConfig.apiKey,
      httpOptions: { apiVersion: "v1alpha" },
    });
    const token = await ai.authTokens.create({
      config: {
        uses: 1,
        expireTime: new Date(now + 30 * 60 * 1000).toISOString(),
        newSessionExpireTime: new Date(now + 2 * 60 * 1000).toISOString(),
        liveConnectConstraints: {
          model: voiceConfig.model,
          config: connectConfig,
        },
      },
    });

    if (!token.name) {
      throw new Error("Google AI kh\u00f4ng tr\u1ea3 v\u1ec1 t\u00ean token.");
    }

    let voiceSession: { id: string } | null = null;
    if (body.session_id && /^[0-9a-f-]{36}$/i.test(body.session_id)) {
      const { data: existingSession } = await supabase
        .from("moodie_voice_sessions")
        .select("id")
        .eq("id", body.session_id)
        .eq("user_id", user.id)
        .maybeSingle();
      voiceSession = existingSession;
    }

    if (!voiceSession) {
      const { data: createdSession, error: voiceSessionError } = await supabase
        .from("moodie_voice_sessions")
        .insert({
          user_id: user.id,
          conversation_id: body.conversation_id || null,
          engine: "live",
          model: voiceConfig.model,
          voice: voiceConfig.voice,
          status: "issued",
          client_metadata: {
            user_agent: request.headers.get("user-agent")?.slice(0, 300) || null,
          },
        })
        .select("id")
        .single();
      if (voiceSessionError || !createdSession) {
        throw new Error(`Không thể tạo phiên voice: ${voiceSessionError?.message || "Unknown"}`);
      }
      voiceSession = createdSession;
      await supabase.from("moodie_voice_events").insert({
        session_id: voiceSession.id,
        user_id: user.id,
        event_type: "session.token_issued",
        sequence: 1,
        payload: {},
      });
    }

    return Response.json({
      token: token.name,
      model: voiceConfig.model,
      connectConfig,
      sessionId: voiceSession.id,
    });
  } catch (error) {
    if (isRateLimitError(error)) {
      return Response.json(
        { error: "T\u00e0i kho\u1ea3n Google AI \u0111\u00e3 h\u1ebft h\u1ea1n m\u1ee9c, vui l\u00f2ng n\u1ea1p th\u00eam." },
        { status: 429 },
      );
    }

    return Response.json(
      { error: `Kh\u00f4ng th\u1ec3 t\u1ea1o phi\u00ean gi\u1ecdng n\u00f3i Live: ${error instanceof Error ? error.message : String(error)}` },
      { status: 502 },
    );
  }
}
