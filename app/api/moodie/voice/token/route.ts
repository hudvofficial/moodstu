import { GoogleGenAI } from "@google/genai";
import { createAdminClient, createClient } from "@/lib/supabase/server";
import {
  buildMoodieLiveConnectConfig,
  buildMoodieOpenAIRealtimeSessionConfig,
  getMoodieVoiceLiveConfig,
  resolveMoodieRealtimeProvider,
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
  if (!user) return Response.json({ error: "Phiên đăng nhập đã hết hạn" }, { status: 401 });

  const voiceConfig = await getMoodieVoiceLiveConfig();
  const body = await request.json().catch(() => ({})) as {
    conversation_id?: string | null;
    session_id?: string | null;
    provider?: "gemini" | "openai";
  };
  const activeProvider = body.provider === "gemini"
    ? (voiceConfig.apiKey ? "gemini" : null)
    : body.provider === "openai"
      ? (voiceConfig.openaiApiKey ? "openai" : null)
      : resolveMoodieRealtimeProvider(voiceConfig);
  const activeProviderKey = activeProvider === "openai"
    ? voiceConfig.openaiApiKey
    : voiceConfig.apiKey;
  if (voiceConfig.engine === "cascade" || !activeProviderKey) {
    return Response.json({
      error: voiceConfig.engine === "cascade"
        ? "Chế độ giọng nói Live đang tắt."
        : voiceConfig.provider === "openai" && !voiceConfig.apiKey
          ? "Chưa cấu hình OpenAI API key cho Realtime. Hãy chọn Gemini hoặc thêm key OpenAI."
          : "Chưa cấu hình Google API key cho giọng nói.",
      engine: "cascade",
    }, { status: 503 });
  }

  const admin = await createAdminClient();
  const [{ data: employee }, { data: conversation }] = await Promise.all([
    admin.from("employees").select("id, auth_user_id, full_name, email, department, position, role").eq("auth_user_id", user.id).eq("status", "active").maybeSingle(),
    body.conversation_id
      ? supabase.from("ai_conversations").select("id, summary").eq("id", body.conversation_id).eq("user_id", user.id).maybeSingle()
      : Promise.resolve({ data: null }),
  ]);
  if (!employee) return Response.json({ error: "Không tìm thấy hồ sơ người dùng Moodie" }, { status: 403 });

  const role = normalizeRole(employee.role);
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
  const memoryPacket = buildMoodieVoiceMemoryPacket(contextPacket);
  const now = Date.now();

  const ensureVoiceSession = async (model: string, voice: string) => {
    let voiceSession: { id: string } | null = null;
    if (body.session_id && /^[0-9a-f-]{36}$/i.test(body.session_id)) {
      const { data } = await supabase.from("moodie_voice_sessions").select("id")
        .eq("id", body.session_id).eq("user_id", user.id).maybeSingle();
      voiceSession = data;
    }
    if (voiceSession) return voiceSession;

    const { data, error } = await supabase.from("moodie_voice_sessions").insert({
      user_id: user.id,
      conversation_id: body.conversation_id || null,
      engine: "live",
      model,
      voice,
      status: "issued",
      client_metadata: {
        provider: activeProvider,
        user_agent: request.headers.get("user-agent")?.slice(0, 300) || null,
      },
    }).select("id").single();
    if (error || !data) throw new Error(`Không thể tạo phiên voice: ${error?.message || "Unknown"}`);
    await supabase.from("moodie_voice_events").insert({
      session_id: data.id,
      user_id: user.id,
      event_type: "session.token_issued",
      sequence: 1,
      payload: { provider: activeProvider },
    });
    return data;
  };

  try {
    if (activeProvider === "openai") {
      const sessionConfig = buildMoodieOpenAIRealtimeSessionConfig({
        model: voiceConfig.openaiModel,
        voice: voiceConfig.openaiVoice,
        contextPacket: memoryPacket,
        role,
      });
      const response = await fetch("https://api.openai.com/v1/realtime/client_secrets", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${voiceConfig.openaiApiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ session: sessionConfig }),
        cache: "no-store",
      });
      const payload = await response.json().catch(() => ({})) as {
        value?: string;
        client_secret?: { value?: string };
        error?: { message?: string };
      };
      const token = payload.value || payload.client_secret?.value;
      if (!response.ok || !token) {
        throw new Error(payload.error?.message || `OpenAI Realtime session failed (${response.status})`);
      }
      const voiceSession = await ensureVoiceSession(voiceConfig.openaiModel, voiceConfig.openaiVoice);
      return Response.json({
        provider: "openai",
        token,
        model: voiceConfig.openaiModel,
        sessionConfig,
        sessionId: voiceSession.id,
      });
    }

    const connectConfig = buildMoodieLiveConnectConfig({
      voice: voiceConfig.voice,
      contextPacket: memoryPacket,
      role,
    });
    const ai = new GoogleGenAI({ apiKey: voiceConfig.apiKey!, httpOptions: { apiVersion: "v1alpha" } });
    const token = await ai.authTokens.create({
      config: {
        uses: 1,
        expireTime: new Date(now + 30 * 60 * 1000).toISOString(),
        newSessionExpireTime: new Date(now + 2 * 60 * 1000).toISOString(),
        liveConnectConstraints: { model: voiceConfig.model, config: connectConfig },
      },
    });
    if (!token.name) throw new Error("Google AI không trả về tên token.");
    const voiceSession = await ensureVoiceSession(voiceConfig.model, voiceConfig.voice);
    return Response.json({
      provider: "gemini",
      token: token.name,
      model: voiceConfig.model,
      connectConfig,
      sessionId: voiceSession.id,
    });
  } catch (error) {
    if (isRateLimitError(error)) {
      return Response.json({ error: "Tài khoản AI đã hết hạn mức, vui lòng kiểm tra billing." }, { status: 429 });
    }
    return Response.json({
      error: `Không thể tạo phiên giọng nói Live: ${error instanceof Error ? error.message : String(error)}`,
    }, { status: 502 });
  }
}
