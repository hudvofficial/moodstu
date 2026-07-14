import { beforeEach, describe, expect, it, jest as vi } from "@jest/globals";

vi.mock("server-only", () => ({}));
vi.mock("@/lib/moodie/browser-config", () => ({
  getMoodieBrowserRuntimeConfig: vi.fn(async () => ({ enabled: true, timeoutMs: 15_000 })),
}));
vi.mock("node:dns/promises", () => ({
  lookup: vi.fn(async (hostname: string) => hostname === "private.test"
    ? [{ address: "127.0.0.1", family: 4 }]
    : [{ address: "93.184.216.34", family: 4 }]),
}));

describe("browseMoodiePage", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    delete process.env.MOODIE_CLOAK_CDP_URL;
  });

  it("extracts bounded text from a public HTML page", async () => {
    vi.spyOn(globalThis, "fetch").mockImplementation(vi.fn(async () => new Response(
      "<html><head><title>Public source</title><script>secret()</script></head><body><h1>Hello Moodie</h1><p>Useful evidence.</p></body></html>",
      { status: 200, headers: { "content-type": "text/html" } },
    )));
    const { browseMoodiePage } = await import("../../lib/moodie/browser-page");
    const result = await browseMoodiePage({ url: "https://example.com/article" });

    expect(result.engine).toBe("fetch");
    expect(result.title).toBe("Public source");
    expect(result.text).toContain("Hello Moodie Useful evidence.");
    expect(result.text).not.toContain("secret()");
  });

  it("blocks redirects into a private network", async () => {
    vi.spyOn(globalThis, "fetch").mockImplementation(vi.fn(async () => new Response(null, {
      status: 302,
      headers: { location: "http://private.test/admin" },
    })));
    const { browseMoodiePage } = await import("../../lib/moodie/browser-page");
    await expect(browseMoodiePage({ url: "https://example.com/redirect" })).rejects.toThrow(/mạng riêng/i);
  });

  it("blocks private-network and credential-bearing URLs", async () => {
    const { browseMoodiePage } = await import("../../lib/moodie/browser-page");
    await expect(browseMoodiePage({ url: "http://private.test/admin" })).rejects.toThrow(/mạng riêng/i);
    await expect(browseMoodiePage({ url: "https://user:pass@example.com" })).rejects.toThrow(/đăng nhập/i);
  });
});
