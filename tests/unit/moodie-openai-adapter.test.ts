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

  it("forwards required tool choice to OpenAI-compatible providers", async () => {
    const fetchMock = jest.spyOn(global, "fetch").mockResolvedValue(new Response(
      JSON.stringify({ choices: [{ message: { role: "assistant", tool_calls: [{ id: "call-1", function: { name: "get_team_summary", arguments: "{}" } }] } }] }),
      { status: 200, headers: { "Content-Type": "application/json" } },
    ));
    const provider = new OpenAIAdapter({ providerId: "openai_compatible", model: "gpt" });

    await provider.chat([{ role: "user", content: "status" }], [{ type: "function", function: { name: "get_team_summary", description: "team", parameters: { type: "object", properties: {} } } }], { toolChoice: "required" });

    const request = fetchMock.mock.calls[0]?.[1] as RequestInit;
    expect(JSON.parse(String(request.body))).toMatchObject({ tool_choice: "required" });
    fetchMock.mockRestore();
  });

  it("forwards AbortSignal to provider requests", async () => {
    const fetchMock = jest.spyOn(global, "fetch").mockResolvedValue(new Response(
      JSON.stringify({ choices: [{ message: { role: "assistant", content: "Pong" } }] }),
      { status: 200, headers: { "Content-Type": "application/json" } },
    ));
    const provider = new OpenAIAdapter({ providerId: "openai_compatible", model: "gpt" });
    const controller = new AbortController();

    await provider.chat([{ role: "user", content: "ping" }], [], { signal: controller.signal });

    expect(fetchMock).toHaveBeenCalledWith(expect.any(String), expect.objectContaining({ signal: controller.signal }));
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

  it("uses the NVIDIA base URL without duplicating chat/completions", async () => {
    const fetchMock = jest.spyOn(global, "fetch").mockResolvedValue(new Response(
      JSON.stringify({ choices: [{ message: { role: "assistant", content: "OK" } }] }),
      { status: 200, headers: { "Content-Type": "application/json" } },
    ));
    const provider = new OpenAIAdapter({
      providerId: "openai_compatible",
      baseUrl: "https://integrate.api.nvidia.com/v1/",
      apiKey: "test-key",
      model: "minimaxai/minimax-m3",
    });

    await provider.chat([{ role: "user", content: "ping" }], []);

    expect(fetchMock).toHaveBeenCalledWith(
      "https://integrate.api.nvidia.com/v1/chat/completions",
      expect.objectContaining({ method: "POST" }),
    );
    fetchMock.mockRestore();
  });

  it("does not call the embedding endpoint when semantic embedding is disabled", async () => {
    const fetchMock = jest.spyOn(global, "fetch");
    const provider = new OpenAIAdapter({
      providerId: "openai_compatible",
      baseUrl: "https://integrate.api.nvidia.com/v1",
      model: "minimaxai/minimax-m3",
      embeddingEnabled: false,
    });

    const result = await provider.embed("studio memory");

    expect(result).toEqual({ ok: false, error: "Semantic embedding is disabled for this provider." });
    expect(fetchMock).not.toHaveBeenCalled();
    fetchMock.mockRestore();
  });

  it("does not duplicate an accidental Bearer prefix from pasted keys", async () => {
    const fetchMock = jest.spyOn(global, "fetch").mockResolvedValue(new Response(
      JSON.stringify({ choices: [{ message: { role: "assistant", content: "OK" } }] }),
      { status: 200, headers: { "Content-Type": "application/json" } },
    ));
    const provider = new OpenAIAdapter({
      providerId: "openai_compatible",
      baseUrl: "https://integrate.api.nvidia.com/v1",
      apiKey: "Bearer nvapi-example",
      model: "minimaxai/minimax-m3",
    });

    await provider.chat([{ role: "user", content: "ping" }], []);

    const request = fetchMock.mock.calls[0]?.[1] as RequestInit;
    expect(request.headers).toMatchObject({ Authorization: "Bearer nvapi-example" });
    fetchMock.mockRestore();
  });
});
