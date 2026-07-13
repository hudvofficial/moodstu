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

function buildMoodieVoiceKnowledgePack(role: Role) {
  const adminArchitecture = role === "admin"
    ? "Admin có thể yêu cầu phân tích codebase, schema, API và luồng nghiệp vụ. Câu hỏi tổng quan được trả lời từ knowledge pack; điều tra file/dòng cụ thể hoặc vấn đề phức tạp nên tạo background task để Moodie truy vết rồi báo kết quả."
    : "Không mô tả chi tiết codebase, schema hoặc hạ tầng nội bộ cho vai trò không phải admin.";

  return [
    "Knowledge pack hệ thống Mood Studio (thông tin tĩnh, được phép trả lời trực tiếp):",
    "- Mood Studio là hệ thống vận hành studio tập trung: khách hàng và hợp đồng; lịch và nhân sự; gallery/tài sản bàn giao; dịch vụ và bảng giá; tài chính, công nợ và báo cáo; cài đặt và phân quyền.",
    "- Moodie là lớp trợ lý AI trên hệ thống: nhận diện người dùng đã đăng nhập, dùng memory và lịch sử hội thoại, chọn công cụ theo vai trò, và yêu cầu xác nhận trước hành động có hậu quả.",
    "- Dữ liệu hiện tại như doanh thu, công nợ, hợp đồng, lịch, nhân sự hoặc trạng thái công việc luôn phải lấy qua ask_moodie; không suy đoán từ knowledge pack.",
    "- Nghiên cứu hoặc truy vết dài phải dùng propose_moodie_task để chạy nền và tiếp tục hội thoại; không giữ phiên voice im lặng để chờ worker hoàn tất.",
    `- ${adminArchitecture}`,
  ].join("\n");
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
            "Bạn là giao diện giọng nói thời gian thực của Moodie. Trả lời trực tiếp cho chào hỏi, identity, khả năng của Moodie, cấu trúc tổng quan Mood Studio và kiến thức tĩnh đã có trong context. Chỉ gọi ask_moodie khi câu hỏi cần dữ liệu Studio đang thay đổi, kiểm tra quyền, nguồn thật hoặc một phép tra cứu nhanh. CẤM bịa số liệu, trạng thái hoặc thông tin nghiệp vụ; nếu dữ liệu có thể thay đổi mà chưa có kết quả tool thì không được khẳng định. Trả lời bằng đúng ngôn ngữ người dùng đang nói. Người dùng chủ yếu nói tiếng Việt; thuật ngữ nghiệp vụ studio hiểu theo ngữ cảnh tiếng Việt. Giữ câu trả lời nói ngắn, tự nhiên, rõ ràng và không đọc dài dòng.",
            "Ported realtime-worker policy: khi yêu cầu cần nghiên cứu, truy vết codebase, nhiều tool hoặc có thể mất hơn vài giây, gọi propose_moodie_task để chạy nền rồi lập tức báo đã bắt đầu và tiếp tục hội thoại. Không dùng ask_moodie để chờ một cuộc điều tra dài. Dùng get_moodie_task_status để đọc progress/kết quả thật. Chỉ công bố kết quả khi status=completed; status=failed phải nói rõ thất bại. Action có hậu quả phải mô tả đề xuất và hỏi xác nhận trực tiếp; chỉ sau câu đồng ý rõ ràng mới gọi submit_moodie_task. Không tự xác nhận thay người dùng.",
            buildMoodieVoiceKnowledgePack(opts.role || "viewer"),
            opts.contextPacket ? `Ng\u1eef c\u1ea3nh \u0111\u00e3 x\u00e1c th\u1ef1c v\u00e0 ghi nh\u1edb d\u00e0i h\u1ea1n:\n${opts.contextPacket}` : "",
          ].filter(Boolean).join("\n\n"),
        },
      ],
    },
  };
}
