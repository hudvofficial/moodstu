import {
  getProviderModelCatalog,
  PROVIDER_PRESETS,
} from "@/lib/moodie/providers/types";
import { findMatchingMoodieProviderPreset } from "@/lib/moodie/providers/registry";

describe("Moodie provider catalog", () => {
  it("offers NVIDIA NIM as a business-facing cloud provider", () => {
    const preset = PROVIDER_PRESETS.find((item) => item.id === "nvidia_nim");

    expect(preset).toMatchObject({
      label: "NVIDIA NIM (Cloud)",
      environment: "cloud",
      providerId: "openai_compatible",
      baseUrl: "https://integrate.api.nvidia.com/v1",
      model: "minimaxai/minimax-m3",
    });
  });

  it("does not silently assign an incompatible embedding model to NVIDIA", () => {
    const catalog = getProviderModelCatalog({
      providerId: "openai_compatible",
      presetId: "nvidia_nim",
    });

    expect(catalog.models).toContainEqual({
      value: "minimaxai/minimax-m3",
      label: "MiniMax M3",
    });
    expect(catalog.embeddingModels).toEqual([]);
    expect(catalog.allowCustomEmbeddingModel).toBe(true);
  });

  it("marks local presets so the UI can warn about Vercel and mobile", () => {
    const localPresets = PROVIDER_PRESETS.filter((item) => item.environment === "local");

    expect(localPresets.map((item) => item.id)).toEqual(expect.arrayContaining(["ollama_local", "lmstudio"]));
    expect(localPresets.every((item) => item.baseUrl?.includes("localhost"))).toBe(true);
  });

  it("keeps provider identity independent from the optional embedding choice", () => {
    expect(findMatchingMoodieProviderPreset({
      providerId: "openai_compatible",
      baseUrl: "https://api.openai.com/v1/",
      model: "gpt-4o-mini",
      embeddingModel: undefined,
    })?.id).toBe("openai");
  });
});
