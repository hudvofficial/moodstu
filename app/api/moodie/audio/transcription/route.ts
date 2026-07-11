import { createClient } from "@/lib/supabase/server";
import { getMoodieVoiceConfig } from "@/lib/moodie/voice-config";

const MAX_FILE_SIZE = 15 * 1024 * 1024;
const GEMINI_API_BASE = "https://generativelanguage.googleapis.com/v1beta/models";
const TRANSCRIBE_PROMPT =
  "Transcribe ch\u00ednh x\u00e1c \u0111o\u1ea1n ghi \u00e2m sang v\u0103n b\u1ea3n, gi\u1eef nguy\u00ean ng\u00f4n ng\u1eef ng\u01b0\u1eddi n\u00f3i, kh\u00f4ng d\u1ecbch. Ch\u1ec9 tr\u1ea3 v\u1ec1 n\u1ed9i dung transcript, kh\u00f4ng gi\u1ea3i th\u00edch.";

function toBase64(buffer: ArrayBuffer) {
  return Buffer.from(buffer).toString("base64");
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: "Phi\u00ean \u0111\u0103ng nh\u1eadp \u0111\u00e3 h\u1ebft h\u1ea1n" }, { status: 401 });

  const formData = await request.formData();
  const file = formData.get("file");
  const languageValue = formData.get("language");
  const language = typeof languageValue === "string" ? languageValue.trim() : "";

  if (!(file instanceof File)) {
    return Response.json({ error: "Thi\u1ebfu t\u1ec7p ghi \u00e2m" }, { status: 400 });
  }
  if (!file.type.startsWith("audio/")) {
    return Response.json({ error: "\u0110\u1ecbnh d\u1ea1ng t\u1ec7p \u00e2m thanh ch\u01b0a \u0111\u01b0\u1ee3c h\u1ed7 tr\u1ee3" }, { status: 415 });
  }
  if (file.size <= 0 || file.size > MAX_FILE_SIZE) {
    return Response.json({ error: "T\u1ec7p ph\u1ea3i nh\u1ecf h\u01a1n 15 MB" }, { status: 413 });
  }

  const voiceConfig = await getMoodieVoiceConfig();
  if (!voiceConfig.apiKey) {
    return Response.json(
      { error: "Ch\u01b0a c\u1ea5u h\u00ecnh Google API key cho gi\u1ecdng n\u00f3i" },
      { status: 503 },
    );
  }

  const audioBuffer = await file.arrayBuffer();
  const base64Audio = toBase64(audioBuffer);
  const languageHint = language
    ? ` (G\u1ee3i \u00fd: ng\u01b0\u1eddi n\u00f3i c\u00f3 th\u1ec3 d\u00f9ng ${language})`
    : "";

  const body = {
    contents: [
      {
        role: "user",
        parts: [
          { text: `${TRANSCRIBE_PROMPT}${languageHint}` },
          { inlineData: { mimeType: file.type, data: base64Audio } },
        ],
      },
    ],
    generationConfig: { temperature: 0 },
  };

  let response: Response;
  try {
    response = await fetch(
      `${GEMINI_API_BASE}/${encodeURIComponent(voiceConfig.model)}:generateContent?key=${encodeURIComponent(voiceConfig.apiKey)}`,
      { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) },
    );
  } catch (error) {
    return Response.json(
      { error: `Kh\u00f4ng th\u1ec3 x\u1eed l\u00fd \u00e2m thanh: ${String(error)}` },
      { status: 502 },
    );
  }

  if (response.status === 429) {
    return Response.json(
      { error: "T\u00e0i kho\u1ea3n Google AI \u0111\u00e3 h\u1ebft h\u1ea1n m\u1ee9c, vui l\u00f2ng n\u1ea1p th\u00eam." },
      { status: 429 },
    );
  }

  if (!response.ok) {
    let errMsg = `Kh\u00f4ng th\u1ec3 x\u1eed l\u00fd \u00e2m thanh (${response.status})`;
    try {
      const payload = await response.json() as { error?: { message?: string } };
      errMsg = payload.error?.message || errMsg;
    } catch { /* ignore */ }
    return Response.json({ error: errMsg }, { status: 502 });
  }

  const payload = await response.json() as {
    candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
  };
  const text = (payload.candidates?.[0]?.content?.parts || [])
    .map((part) => part.text || "")
    .join("")
    .trim();

  return Response.json({ text });
}
