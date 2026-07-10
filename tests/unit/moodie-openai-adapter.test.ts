import { describe, expect, it, jest } from "@jest/globals";
import { OpenAIAdapter } from "@/lib/moodie/providers/openai-adapter";

describe("OpenAIAdapter", () => {
  it("normalizes usage returned by OpenAI-compatible gateways", async () => {
    const fetchMock = jest.spyOn(global, "fetch").mockResolvedValue(new Response(
      JSON.stringify({
        choices: [{ message: { role: "assistant", content: "Pong" } }],
        usage: { prompt_tokens: 12, completion_tokens: 8, total_tokens: 20 },
      }),
      { status: 200, headers: { "Content-Type": "application/json" } },
    ));
    const provider = new OpenAIAdapter({ providerId: "openai_compatible", model: "gpt" });

    const result = await provider.chat([{ role: "user", content: "ping" }], []);

    expect(result).toEqual({
      ok: true,
      message: { role: "assistant", content: "Pong", tool_calls: undefined },
      usage: { inputTokens: 12, outputTokens: 8, totalTokens: 20 },
    });
    fetchMock.mockRestore();
  });

  it("preserves string errors returned by OpenAI-compatible gateways", async () => {
    const fetchMock = jest.spyOn(global, "fetch").mockResolvedValue(new Response(
      JSON.stringify({ error: "API key required for remote API access" }),
      { status: 401, headers: { "Content-Type": "application/json" } },
    ));
    const provider = new OpenAIAdapter({
      providerId: "openai_compatible",
      baseUrl: "http://localhost:20128/v1",
      model: "G1",
    });

    const result = await provider.chat([{ role: "user", content: "ping" }], []);

    expect(result).toEqual({ ok: false, error: "API key required for remote API access" });
    fetchMock.mockRestore();
  });
});
