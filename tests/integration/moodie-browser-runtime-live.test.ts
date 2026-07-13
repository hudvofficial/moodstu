import { config } from "dotenv";
import { createClient } from "@supabase/supabase-js";
import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
config({ path: ".env.local", quiet: true });

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
const describeLive = url && key ? describe : describe.skip;

describeLive("Moodie browser tool live runtime", () => {
  const supabase = createClient(url!, key!, { auth: { persistSession: false } });

  it("lets the model read an explicit public URL with browse_page", { retry: 2, timeout: 90_000 }, async () => {
    const { runMoodieEngine } = await import("../../lib/moodie/engine");
    const request = {
      supabase: supabase as never,
      role: "admin" as const,
      prompt: "Hãy dùng tool browse_page để đọc https://example.com rồi cho biết tiêu đề trang và dẫn nguồn.",
      userContext: { id: "browser-live", fullName: "Admin", email: null, department: null, position: null, role: "admin" as const },
    };
    let result = await runMoodieEngine(request);
    if (!result.metadata.trace?.tools.some((tool) => tool.name === "browse_page" && tool.ok)) {
      result = await runMoodieEngine(request);
    }

    expect(result.metadata.trace, JSON.stringify(result.metadata)).toBeDefined();
    expect(result.metadata.trace?.allowed_tool_names).toContain("browse_page");
    expect(result.metadata.trace?.tools.map((tool) => tool.name)).toContain("browse_page");
    expect(result.metadata.trace?.tools.find((tool) => tool.name === "browse_page")?.ok).toBe(true);
    expect(result.metadata.sources?.some((source) => source.url?.includes("example.com"))).toBe(true);
  });
});
