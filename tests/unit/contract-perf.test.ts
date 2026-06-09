import { describe, it, expect, jest } from "@jest/globals";
import { runOptimisticMutation } from "@/lib/optimistic-mutation";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { glob } from "glob";

// ─── runOptimisticMutation: optimistic apply/rollback contract ──

describe("runOptimisticMutation (optimistic UI core)", () => {
  it("calls apply() synchronously BEFORE awaiting action()", async () => {
    const order: string[] = [];
    await runOptimisticMutation({
      apply: () => order.push("apply"),
      rollback: () => {},
      action: async () => {
        order.push("action");
        return { success: true as const };
      },
      onSuccess: () => { order.push("onSuccess"); },
    });
    expect(order[0]).toBe("apply");
    expect(order[1]).toBe("action");
    expect(order[2]).toBe("onSuccess");
  });

  it("calls rollback() when action returns success=false", async () => {
    const rollback = jest.fn();
    const onError = jest.fn();
    await runOptimisticMutation({
      apply: () => {},
      rollback,
      action: async () => ({ success: false as const, error: "Server rejected" }),
      onError,
    });
    expect(rollback).toHaveBeenCalledTimes(1);
    expect(onError).toHaveBeenCalledTimes(1);
  });

  it("calls rollback() when action throws", async () => {
    const rollback = jest.fn();
    const onError = jest.fn();
    await runOptimisticMutation({
      apply: () => {},
      rollback,
      action: async () => { throw new Error("Network timeout"); },
      onError,
    });
    expect(rollback).toHaveBeenCalledTimes(1);
    expect(onError).toHaveBeenCalledTimes(1);
  });

  it("does NOT call rollback on success", async () => {
    const rollback = jest.fn();
    await runOptimisticMutation({
      apply: () => {},
      rollback,
      action: async () => ({ success: true as const }),
    });
    expect(rollback).not.toHaveBeenCalled();
  });

  it("awaits onSuccess (background revalidation) after action resolves", async () => {
    let revalidated = false;
    const result = await runOptimisticMutation({
      apply: () => {},
      rollback: () => {},
      action: async () => ({ success: true as const }),
      onSuccess: async () => {
        await new Promise((r) => setTimeout(r, 10));
        revalidated = true;
      },
    });
    expect(revalidated).toBe(true);
    expect(result?.success).toBe(true);
  });

  it("returns the action result on success", async () => {
    const result = await runOptimisticMutation({
      apply: () => {},
      rollback: () => {},
      action: async () => ({ success: true as const, data: { id: "abc" } }),
    });
    expect(result).toEqual({ success: true, data: { id: "abc" } });
  });

  it("returns the failed result on action failure", async () => {
    const result = await runOptimisticMutation({
      apply: () => {},
      rollback: () => {},
      action: async () => ({ success: false as const, error: "Bad request" }),
    });
    expect(result).toEqual({ success: false, error: "Bad request" });
  });

  it("returns undefined when action throws", async () => {
    const result = await runOptimisticMutation({
      apply: () => {},
      rollback: () => {},
      action: async () => { throw new Error("crash"); },
    });
    expect(result).toBeUndefined();
  });
});

// ─── "use no memo" directive: React Compiler opt-out guard ──

describe("React Compiler opt-out protection", () => {
  const ROOT = path.resolve(__dirname, "../..");

  function readSource(relativePath: string): string {
    return readFileSync(path.join(ROOT, relativePath), "utf8");
  }

  it("next.config.ts has reactCompiler enabled", () => {
    const config = readSource("next.config.ts");
    expect(config).toMatch(/reactCompiler\s*:\s*true/);
  });

  it("CalendarWrapper has 'use no memo' directive", () => {
    const src = readSource("components/calendar/calendar-wrapper.tsx");
    expect(src).toContain('"use no memo"');
  });

  it("useCalendarData has 'use no memo' directive", () => {
    const src = readSource("hooks/use-calendar-data.ts");
    expect(src).toContain('"use no memo"');
  });

  it("all 'use no memo' files are accounted for (no untracked opt-outs)", () => {
    const tsxFiles = glob.sync("**/*.{tsx,ts}", {
      cwd: ROOT,
      ignore: ["node_modules/**", ".next/**", "test-results/**", "plans/**", "tests/**"],
    });
    const optedOut = tsxFiles.filter((f) => {
      const content = readFileSync(path.join(ROOT, f), "utf8");
      return content.includes('"use no memo"');
    });
    const knownOptOuts = new Set([
      "components/calendar/calendar-wrapper.tsx",
      "hooks/use-calendar-data.ts",
    ]);
    const normalized = optedOut.map((f) => f.replace(/\\/g, "/"));
    const unknown = normalized.filter((f) => !knownOptOuts.has(f));
    expect(unknown).toEqual([]);
  });
});
