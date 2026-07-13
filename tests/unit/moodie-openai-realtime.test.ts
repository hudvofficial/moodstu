import {
  buildMoodieOpenAIRealtimeSessionConfig,
  resolveMoodieRealtimeProvider,
} from "@/lib/moodie/voice-live-config";

describe("Moodie OpenAI Realtime", () => {
  it("keeps Gemini as fallback when OpenAI is selected without a key", () => {
    expect(resolveMoodieRealtimeProvider({
      provider: "openai",
      apiKey: "gemini-key",
      openaiApiKey: null,
    })).toBe("gemini");
  });

  it("uses OpenAI when selected and configured", () => {
    expect(resolveMoodieRealtimeProvider({
      provider: "openai",
      apiKey: "gemini-key",
      openaiApiKey: "openai-key",
    })).toBe("openai");
  });

  it("builds a speech session with tools, semantic VAD and authenticated context", () => {
    const config = buildMoodieOpenAIRealtimeSessionConfig({
      model: "gpt-realtime-2.1",
      voice: "marin",
      role: "admin",
      contextPacket: "Authenticated user: Admin",
    });

    expect(config.model).toBe("gpt-realtime-2.1");
    expect(config.audio.output.voice).toBe("marin");
    expect(config.audio.input.turn_detection).toMatchObject({
      type: "semantic_vad",
      create_response: true,
      interrupt_response: true,
    });
    expect(config.instructions).toContain("Authenticated user: Admin");
    expect(config.tools.map((tool) => tool.name)).toEqual(expect.arrayContaining([
      "ask_moodie",
      "propose_moodie_task",
      "submit_moodie_task",
    ]));
    const askMoodie = config.tools.find((tool) => tool.name === "ask_moodie");
    expect(askMoodie?.parameters).toMatchObject({ type: "object" });
  });
});
