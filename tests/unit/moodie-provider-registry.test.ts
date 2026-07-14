import { jest } from "@jest/globals";

jest.mock("@/lib/supabase/server", () => ({
  createAdminClient: jest.fn(),
}));
jest.mock("@/lib/settings-secrets", () => ({
  decryptSecret: (value: string | null) => value,
}));
jest.mock("@/lib/system-settings", () => ({
  getMoodieGeminiRuntimeConfig: jest.fn(async () => ({
    apiKey: "legacy-key",
    model: "legacy-model",
  })),
}));

import { createAdminClient } from "@/lib/supabase/server";
import { getMoodieGeminiRuntimeConfig } from "@/lib/system-settings";
import { getMoodieProviderSnapshot } from "@/lib/moodie/providers/registry";

const mockedCreateAdminClient = jest.mocked(createAdminClient);
const mockedLegacyConfig = jest.mocked(getMoodieGeminiRuntimeConfig);

function mockSettings(rows: Array<{ key: string; value: string }>) {
  mockedCreateAdminClient.mockResolvedValue({
    from: () => ({
      select: () => ({
        in: async () => ({ data: rows }),
      }),
    }),
  } as never);
}

describe("Moodie provider registry", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("uses the new Gemini provider key instead of silently reading legacy settings", async () => {
    mockSettings([
      { key: "moodie_provider_id", value: "gemini" },
      { key: "moodie_provider_api_key", value: "Bearer new-provider-key" },
      { key: "moodie_provider_model", value: "gemini-2.5-pro" },
      { key: "moodie_provider_embedding_model", value: "text-embedding-004" },
      { key: "moodie_provider_embedding_enabled", value: "true" },
      { key: "moodie_provider_label", value: "Google Gemini" },
    ]);

    const snapshot = await getMoodieProviderSnapshot();

    expect(snapshot).toMatchObject({
      providerId: "gemini",
      model: "gemini-2.5-pro",
      hasKey: true,
      keyMasked: "••••••••-key",
      embeddingEnabled: true,
    });
    expect(mockedLegacyConfig).not.toHaveBeenCalled();
  });

  it("falls back to the legacy Gemini key only when the new provider key is empty", async () => {
    mockSettings([
      { key: "moodie_provider_id", value: "gemini" },
      { key: "moodie_provider_api_key", value: "" },
      { key: "moodie_provider_model", value: "gemini-2.5-flash" },
    ]);

    const snapshot = await getMoodieProviderSnapshot();

    expect(snapshot.hasKey).toBe(true);
    expect(snapshot.model).toBe("gemini-2.5-flash");
    expect(mockedLegacyConfig).toHaveBeenCalledTimes(1);
  });
});
