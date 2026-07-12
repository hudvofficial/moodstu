import { Modality, Type, type FunctionDeclaration, type LiveConnectConfig } from "@google/genai";
import { createAdminClient } from "@/lib/supabase/server";
import { getMoodieVoiceConfig } from "@/lib/moodie/voice-config";
import { getMoodieCapability, listMoodieCapabilities } from "@/lib/moodie/capability-registry";
import type { Role } from "@/types/roles";

export const MOODIE_VOICE_LIVE_MODEL_KEY = "moodie_voice_live_model";
export const MOODIE_VOICE_LIVE_VOICE_KEY = "moodie_voice_live_voice";
export const MOODIE_VOICE_ENGINE_KEY = "moodie_voice_engine";

export const DEFAULT_MOODIE_VOICE_LIVE_MODEL = "gemini-3.1-flash-live-preview";
export const DEFAULT_MOODIE_VOICE_LIVE_VOICE = "Zephyr";
export const DEFAULT_MOODIE_VOICE_ENGINE = "live" as const;

export type MoodieVoiceEngine = "live" | "cascade";

export interface MoodieVoiceLiveConfig {
  apiKey: string | null;
  model: string;
  voice: string;
  engine: MoodieVoiceEngine;
}

function normalize(value: string | null | undefined) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

export async function getMoodieVoiceLiveConfig(): Promise<MoodieVoiceLiveConfig> {
  const voiceConfig = await getMoodieVoiceConfig();

  try {
    const supabase = await createAdminClient();
    const { data } = await supabase
      .from("system_settings")
      .select("key, value")
      .in("key", [
        MOODIE_VOICE_LIVE_MODEL_KEY,
        MOODIE_VOICE_LIVE_VOICE_KEY,
        MOODIE_VOICE_ENGINE_KEY,
      ]);

    const row = (key: string) =>
      normalize((data || []).find((item) => item.key === key)?.value);
    const engineValue = row(MOODIE_VOICE_ENGINE_KEY);

    return {
      apiKey: voiceConfig.apiKey,
      model: row(MOODIE_VOICE_LIVE_MODEL_KEY) || DEFAULT_MOODIE_VOICE_LIVE_MODEL,
      voice: row(MOODIE_VOICE_LIVE_VOICE_KEY) || DEFAULT_MOODIE_VOICE_LIVE_VOICE,
      engine: engineValue === "cascade" ? "cascade" : DEFAULT_MOODIE_VOICE_ENGINE,
    };
  } catch {
    return {
      apiKey: voiceConfig.apiKey,
      model: DEFAULT_MOODIE_VOICE_LIVE_MODEL,
      voice: DEFAULT_MOODIE_VOICE_LIVE_VOICE,
      engine: DEFAULT_MOODIE_VOICE_ENGINE,
    };
  }
}

export function buildMoodieLiveConnectConfig(opts: { voice: string; contextPacket?: string; role?: Role }): LiveConnectConfig {
  const voiceCapabilityNames = new Set(listMoodieCapabilities("voice", opts.role || "viewer").map((capability) => capability.name));
  const description = (name: string) => getMoodieCapability(name)?.voiceDescription || name;
  return {
    responseModalities: [Modality.AUDIO],
    speechConfig: {
      voiceConfig: {
        prebuiltVoiceConfig: {
          voiceName: opts.voice,
        },
      },
    },
    contextWindowCompression: {
      triggerTokens: "104857",
      slidingWindow: { targetTokens: "52428" },
    },
    inputAudioTranscription: {},
    outputAudioTranscription: {},
    sessionResumption: {},
    tools: [
      {
        functionDeclarations: ([
          {
            name: "ask_moodie",
            description: description("ask_moodie"),
            parameters: {
              type: Type.OBJECT,
              properties: {
                question: {
                  type: Type.STRING,
                  description: "C\u00e2u h\u1ecfi nghi\u1ec7p v\u1ee5 c\u1ea7n g\u1eedi cho Moodie.",
                },
              },
              required: ["question"],
            },
          },
          {
            name: "propose_moodie_task",
            description: description("propose_moodie_task"),
            parameters: {
              type: Type.OBJECT,
              properties: {
                title: { type: Type.STRING, description: "Tên ngắn của tác vụ." },
                kind: { type: Type.STRING, description: "research, task hoặc action." },
                query: { type: Type.STRING, description: "Truy vấn nghiên cứu nếu kind là research." },
                prompt: { type: Type.STRING, description: "Yêu cầu nghiệp vụ đầy đủ nếu kind là task." },
                mode: { type: Type.STRING, description: "web, news hoặc local." },
                tool_name: { type: Type.STRING, description: "Tên action/tool dự kiến nếu có." },
              },
              required: ["title", "kind"],
            },
          },
          {
            name: "submit_moodie_task",
            description: description("submit_moodie_task"),
            parameters: {
              type: Type.OBJECT,
              properties: {
                run_id: { type: Type.STRING },
                confirmation_token: { type: Type.STRING },
              },
              required: ["run_id", "confirmation_token"],
            },
          },
          {
            name: "get_moodie_task_status",
            description: description("get_moodie_task_status"),
            parameters: {
              type: Type.OBJECT,
              properties: { run_id: { type: Type.STRING } },
              required: ["run_id"],
            },
          },
          {
            name: "cancel_moodie_task",
            description: description("cancel_moodie_task"),
            parameters: {
              type: Type.OBJECT,
              properties: { run_id: { type: Type.STRING } },
              required: ["run_id"],
            },
          },
        ] as unknown as FunctionDeclaration[]).filter((declaration) => voiceCapabilityNames.has(declaration.name || "")),
      },
    ],
    systemInstruction: {
      parts: [
        {
          text: [
            "B\u1ea1n l\u00e0 giao di\u1ec7n gi\u1ecdng n\u00f3i th\u1eddi gian th\u1ef1c c\u1ee7a Moodie. V\u1edbi ch\u00e0o h\u1ecfi, tr\u00f2 chuy\u1ec7n phi\u1ebfm v\u00e0 c\u00e2u h\u1ecfi kh\u00f4ng c\u1ea7n d\u1eef li\u1ec7u studio, h\u00e3y tr\u1ea3 l\u1eddi tr\u1ef1c ti\u1ebfp. V\u1edbi m\u1ecdi c\u00e2u h\u1ecfi v\u1ec1 d\u1eef li\u1ec7u ho\u1eb7c nghi\u1ec7p v\u1ee5 studio, B\u1eaeT BU\u1ed8C g\u1ecdi ask_moodie. C\u1ea4M b\u1ecba s\u1ed1 li\u1ec7u, tr\u1ea1ng th\u00e1i ho\u1eb7c th\u00f4ng tin nghi\u1ec7p v\u1ee5; n\u1ebfu ch\u01b0a c\u00f3 k\u1ebft qu\u1ea3 t\u1eeb ask_moodie th\u00ec kh\u00f4ng \u0111\u01b0\u1ee3c kh\u1eb3ng \u0111\u1ecbnh. Tr\u1ea3 l\u1eddi b\u1eb1ng \u0111\u00fang ng\u00f4n ng\u1eef ng\u01b0\u1eddi d\u00f9ng \u0111ang n\u00f3i. Ng\u01b0\u1eddi d\u00f9ng ch\u1ee7 y\u1ebfu n\u00f3i ti\u1ebfng Vi\u1ec7t; thu\u1eadt ng\u1eef nghi\u1ec7p v\u1ee5 studio hi\u1ec3u theo ng\u1eef c\u1ea3nh ti\u1ebfng Vi\u1ec7t. Gi\u1eef c\u00e2u tr\u1ea3 l\u1eddi n\u00f3i ng\u1eafn, t\u1ef1 nhi\u00ean, r\u00f5 r\u00e0ng v\u00e0 kh\u00f4ng \u0111\u1ecdc d\u00e0i d\u00f2ng.",
            "Khi người dùng cần nghiên cứu lâu, gọi propose_moodie_task rồi tiếp tục hội thoại. Dùng get_moodie_task_status để đọc progress/kết quả thật. Chỉ công bố kết quả khi status=completed; status=failed phải nói rõ thất bại. Action có hậu quả phải mô tả đề xuất và hỏi xác nhận trực tiếp; chỉ sau câu đồng ý rõ ràng mới gọi submit_moodie_task. Không tự xác nhận thay người dùng.",
            opts.contextPacket ? `Ng\u1eef c\u1ea3nh \u0111\u00e3 x\u00e1c th\u1ef1c v\u00e0 ghi nh\u1edb d\u00e0i h\u1ea1n:\n${opts.contextPacket}` : "",
          ].filter(Boolean).join("\n\n"),
        },
      ],
    },
  };
}
