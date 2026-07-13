import { MOODIE_CAPABILITIES, canUseMoodieCapability, listMoodieCapabilities } from "@/lib/moodie/capability-registry";
import { MOODIE_TOOL_MANIFEST, canExposeMoodieTool } from "@/lib/moodie/tool-manifest";
import { buildMoodieLiveConnectConfig } from "@/lib/moodie/voice-live-config";

describe("Moodie unified capability registry", () => {
  it("derives every text manifest entry from a text capability", () => {
    expect(Object.keys(MOODIE_TOOL_MANIFEST).sort()).toEqual(
      listMoodieCapabilities("text", "admin").map((capability) => capability.name).sort(),
    );
    expect(canExposeMoodieTool("get_repo_map", "viewer")).toBe(false);
    expect(canExposeMoodieTool("get_repo_map", "admin")).toBe(true);
    expect(canUseMoodieCapability("search_web", "viewer", "text")).toBe(true);
  });

  it("derives voice declarations and descriptions from the same registry", () => {
    const config = buildMoodieLiveConnectConfig({ voice: "Zephyr", role: "viewer" });
    const declarations = config.tools?.flatMap((tool) => tool.functionDeclarations || []) || [];
    const expected = listMoodieCapabilities("voice", "viewer").map((capability) => capability.name).sort();
    expect(declarations.map((declaration) => declaration.name).sort()).toEqual(expected);
    for (const declaration of declarations) {
      expect(declaration.description).toBe(MOODIE_CAPABILITIES[declaration.name].voiceDescription);
    }
  });

  it("keeps static system knowledge in the realtime brain and long work in background runs", () => {
    const adminConfig = buildMoodieLiveConnectConfig({ voice: "Zephyr", role: "admin" });
    const instruction = adminConfig.systemInstruction?.parts?.map((part) => part.text || "").join("\n") || "";

    expect(instruction).toContain("cấu trúc tổng quan Mood Studio");
    expect(instruction).toContain("Knowledge pack hệ thống Mood Studio");
    expect(instruction).toContain("Không dùng ask_moodie để chờ một cuộc điều tra dài");
    expect(instruction).toContain("Admin có thể yêu cầu phân tích codebase");
  });

  it("keeps consequential confirmation and external evidence policy explicit", () => {
    expect(MOODIE_CAPABILITIES.submit_moodie_task.confirmation).toBe("explicit");
    expect(MOODIE_CAPABILITIES.submit_moodie_task.sideEffect).toBe("consequential");
    expect(MOODIE_CAPABILITIES.search_web.boundary).toBe("external");
    expect(MOODIE_CAPABILITIES.search_web.expectsSources).toBe(true);
    expect(MOODIE_CAPABILITIES.start_deep_research.executionMode).toBe("background");
  });
});
