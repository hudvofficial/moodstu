import { discoverOpenAICompatibleModels } from "@/lib/moodie/providers/model-discovery";

describe("Moodie provider model discovery", () => {
  it("validates the key through /models and returns unique sorted model options", async () => {
    const fetchImpl = jest.fn(async () => new Response(JSON.stringify({
      data: [
        { id: "z-model" },
        { id: "minimaxai/minimax-m3" },
        { id: "minimaxai/minimax-m3" },
      ],
    }), { status: 200, headers: { "Content-Type": "application/json" } })) as unknown as typeof fetch;

    const result = await discoverOpenAICompatibleModels({
      baseUrl: "https://integrate.api.nvidia.com/v1/",
      apiKey: "nvapi-test",
      fetchImpl,
    });

    expect(fetchImpl).toHaveBeenCalledWith(
      new URL("https://integrate.api.nvidia.com/v1/models"),
      expect.objectContaining({
        method: "GET",
        headers: expect.objectContaining({ Authorization: "Bearer nvapi-test" }),
      }),
    );
    expect(result.models).toEqual([
      { value: "minimaxai/minimax-m3", label: "minimaxai/minimax-m3" },
      { value: "z-model", label: "z-model" },
    ]);
  });

  it("supports local providers without adding an Authorization header", async () => {
    const fetchImpl = jest.fn(async () => new Response(JSON.stringify({
      data: [{ id: "local-model" }],
    }), { status: 200, headers: { "Content-Type": "application/json" } })) as unknown as typeof fetch;

    await discoverOpenAICompatibleModels({
      baseUrl: "http://localhost:1234/v1",
      fetchImpl,
    });

    const request = fetchImpl.mock.calls[0]?.[1] as RequestInit;
    expect(request.headers).toEqual({ Accept: "application/json" });
  });

  it("surfaces provider authentication errors instead of falling back silently", async () => {
    const fetchImpl = jest.fn(async () => new Response(JSON.stringify({
      error: { message: "Invalid API key" },
    }), { status: 401, headers: { "Content-Type": "application/json" } })) as unknown as typeof fetch;

    await expect(discoverOpenAICompatibleModels({
      baseUrl: "https://api.openai.com/v1",
      apiKey: "bad-key",
      fetchImpl,
    })).rejects.toThrow("Invalid API key");
  });

  it("rejects successful responses that contain no selectable models", async () => {
    const fetchImpl = jest.fn(async () => new Response(JSON.stringify({ data: [] }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    })) as unknown as typeof fetch;

    await expect(discoverOpenAICompatibleModels({
      baseUrl: "https://provider.example/v1",
      apiKey: "key",
      fetchImpl,
    })).rejects.toThrow("không trả về model nào");
  });
});
