import { describe, expect, it } from "@jest/globals";
import { buildMoodieSessionIdentityResponse, buildMoodieUnavailableResult } from "@/lib/moodie/engine";
import { routeMoodieIntent } from "@/lib/moodie/intent-router";
import { createMoodieTrace } from "@/lib/moodie/trace";
import { verifyMoodieAnswer } from "@/lib/moodie/answer-verifier";

describe("Moodie engine contract", () => {
  it("answers authenticated user identity through the zero-model fast path", () => {
    const userContext = { id: "user-admin", fullName: "Admin", email: "admin@moodwedding.com", role: "admin" as const };

    expect(buildMoodieSessionIdentityResponse("Bạn biết mình là ai không?", userContext))
      .toBe("Bạn đang đăng nhập với tên Admin, vai trò admin tại Mood Studio.");
    expect(buildMoodieSessionIdentityResponse("Tình hình studio hôm nay?", userContext)).toBeNull();
  });
  it("routes casual conversation to the model without requiring data", () => {
    const route = routeMoodieIntent({ prompt: "hi", role: "admin" });

    expect(route.intent).toBe("general");
    expect(route.needsData).toBe(false);
    expect(route.reason).toBe("general_chat");
  });

  it("does not let prior assistant suggestions force a business route", () => {
    const route = routeMoodieIntent({
      prompt: "hi",
      role: "admin",
      history: [{
        role: "assistant",
        content: "Tóm tắt tài chính tháng này và kiểm tra công nợ quá hạn.",
      }],
    });

    expect(route.intent).toBe("general");
    expect(route.needsData).toBe(false);
  });

  it("uses recent user context only for a short follow-up", () => {
    const route = routeMoodieIntent({
      prompt: "còn thế nào?",
      role: "admin",
      history: [{ role: "user", content: "Tóm tắt tài chính tháng này" }],
    });

    expect(route.intent).toBe("finance");
    expect(route.needsData).toBe(true);
  });

  it("returns an honest degraded response when the chat provider is unavailable", () => {
    const result = buildMoodieUnavailableResult("upstream timeout");

    expect(result.content).toContain("không kết nối được với model trò chuyện");
    expect(result.content).not.toContain("không match được đúng nghiệp vụ");
    expect(result.metadata.note).toBe("upstream timeout");
  });

  it("keeps provider and fallback timings separate", () => {
    const traceState = createMoodieTrace({ provider: "G1", route_intent: "general" });
    const trace = traceState.finish({
      engine: "core_fallback",
      fallback_used: true,
      fallback_reason: "provider_error",
      provider_latency_ms: 900,
      fallback_latency_ms: 2,
    });

    expect(trace.provider_latency_ms).toBe(900);
    expect(trace.fallback_latency_ms).toBe(2);
    expect(trace.fallback_reason).toBe("provider_error");
  });

  it("rejects answers that ignore authenticated user identity", () => {
    const route = routeMoodieIntent({ prompt: "Bạn biết mình là ai không?", role: "admin" });
    const first = verifyMoodieAnswer({
      userPrompt: "Bạn biết mình là ai không?",
      route,
      assistantMessage: { role: "assistant", content: "Mình chưa biết bạn là ai vì bạn chưa giới thiệu." },
      toolUsedInTurn: false,
      correctionCount: 0,
      authenticatedUser: { fullName: "Admin", role: "admin" },
    });
    expect(first.ok).toBe(false);
    if (!first.ok) expect(first.correctiveInstruction).toContain("tên Admin");

    const second = verifyMoodieAnswer({
      userPrompt: "Bạn biết mình là ai không?",
      route,
      assistantMessage: { role: "assistant", content: "Mình vẫn chưa biết." },
      toolUsedInTurn: false,
      correctionCount: 1,
      authenticatedUser: { fullName: "Admin", role: "admin" },
    });
    expect(second).toEqual({ ok: true, replacementContent: "Bạn đang đăng nhập với tên Admin, vai trò admin tại Mood Studio." });
  });

  it("accepts an answer grounded in authenticated user identity", () => {
    const route = routeMoodieIntent({ prompt: "Bạn biết mình là ai không?", role: "admin" });
    expect(verifyMoodieAnswer({
      userPrompt: "Bạn biết mình là ai không?",
      route,
      assistantMessage: { role: "assistant", content: "Bạn là Admin, đang giữ vai trò admin tại Mood Studio." },
      toolUsedInTurn: false,
      correctionCount: 0,
      authenticatedUser: { fullName: "Admin", role: "admin" },
    })).toEqual({ ok: true });
  });

  it("rejects anonymous answers to identity questions", () => {
    const route = routeMoodieIntent({ prompt: "Bạn là ai?", role: "admin" });
    const result = verifyMoodieAnswer({
      userPrompt: "Bạn là ai?",
      route,
      assistantMessage: { role: "assistant", content: "Mình là trợ lý AI của studio." },
      toolUsedInTurn: false,
      correctionCount: 0,
    });

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.correctiveInstruction).toContain("Mình là Moodie");
  });

  it("requires successful external evidence for current facts", () => {
    const route = routeMoodieIntent({ prompt: "Tin OpenAI mới nhất hôm nay", role: "admin" });
    const missing = verifyMoodieAnswer({
      userPrompt: "Tin OpenAI mới nhất hôm nay",
      route,
      assistantMessage: { role: "assistant", content: "OpenAI vừa công bố một sản phẩm mới." },
      toolUsedInTurn: true,
      externalResearchUsed: false,
      externalSourceCount: 0,
      correctionCount: 0,
    });
    expect(missing.ok).toBe(false);

    const sourced = verifyMoodieAnswer({
      userPrompt: "Tin OpenAI mới nhất hôm nay",
      route,
      assistantMessage: { role: "assistant", content: "Theo các nguồn vừa tra, đây là các cập nhật mới [1]." },
      toolUsedInTurn: true,
      externalResearchUsed: true,
      externalSourceCount: 3,
      correctionCount: 0,
    });
    expect(sourced).toEqual({ ok: true });
  });

  it("rejects generic identity even when the answer mentions Moodie", () => {
    const route = routeMoodieIntent({ prompt: "Bạn là ai?", role: "admin" });
    const result = verifyMoodieAnswer({
      userPrompt: "Bạn là ai?",
      route,
      assistantMessage: { role: "assistant", content: "Mình là Moodie, một trợ lý AI đa năng." },
      toolUsedInTurn: false,
      correctionCount: 0,
    });

    expect(result.ok).toBe(false);
  });
});
