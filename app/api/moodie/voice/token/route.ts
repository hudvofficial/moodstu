import { GoogleGenAI } from "@google/genai";
import { createClient } from "@/lib/supabase/server";
import {
  buildMoodieLiveConnectConfig,
  getMoodieVoiceLiveConfig,
} from "@/lib/moodie/voice-live-config";

function isRateLimitError(error: unknown) {
  if (typeof error !== "object" || error === null) return false;
  const candidate = error as { status?: number; code?: number; message?: string };
  return candidate.status === 429 || candidate.code === 429 || candidate.message?.includes("429");
}

export async function POST() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return Response.json(
      { error: "Phi\u00ean \u0111\u0103ng nh\u1eadp \u0111\u00e3 h\u1ebft h\u1ea1n" },
      { status: 401 },
    );
  }

  const voiceConfig = await getMoodieVoiceLiveConfig();
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

  const connectConfig = buildMoodieLiveConnectConfig({ voice: voiceConfig.voice });
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

    return Response.json({
      token: token.name,
      model: voiceConfig.model,
      connectConfig,
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
