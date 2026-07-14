import { config } from "dotenv";
import { createClient } from "@supabase/supabase-js";
import { afterAll, beforeAll, describe, expect, it, jest as vi } from "@jest/globals";

vi.mock("server-only", () => ({}));
config({ path: ".env.local", quiet: true });

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
const describeLive = url && key ? describe : describe.skip;

describeLive("Moodie durable memory runtime", () => {
  const supabase = createClient(url!, key!, { auth: { persistSession: false, autoRefreshToken: false } });
  const marker = `E2EMemoryGraph${Math.random().toString(36).slice(2, 10)}`;
  let userId = "";
  let otherUserId = "";
  let userEmail = "";
  let otherEmail = "";
  const password = "E2eMemory!2026";

  beforeAll(async () => {
    userEmail = `${marker.toLowerCase()}@test.local`;
    otherEmail = `${marker.toLowerCase()}-other@test.local`;
    const [{ data, error }, { data: otherData, error: otherError }] = await Promise.all([
      supabase.auth.admin.createUser({ email: userEmail, password, email_confirm: true }),
      supabase.auth.admin.createUser({ email: otherEmail, password, email_confirm: true }),
    ]);
    if (error || !data.user) throw error || new Error("Unable to create memory test user");
    if (otherError || !otherData.user) throw otherError || new Error("Unable to create second memory test user");
    userId = data.user.id;
    otherUserId = otherData.user.id;
  });

  afterAll(async () => {
    const employeeIds = [userId, otherUserId].filter(Boolean);
    if (employeeIds.length > 0) {
      const { error: employeeCleanupError } = await supabase
        .from("employees")
        .delete()
        .in("id", employeeIds);
      if (employeeCleanupError) throw employeeCleanupError;
    }

    await Promise.all([
      userId ? supabase.auth.admin.deleteUser(userId) : Promise.resolve(),
      otherUserId ? supabase.auth.admin.deleteUser(otherUserId) : Promise.resolve(),
    ]);
  });

  it("creates a supersedes relation and archives the previous memory", async () => {
    const { createPendingMoodieMemory } = await import("../../lib/moodie/memory-store");
    const base = {
      scope: "user" as const,
      memoryType: "preference" as const,
      confidence: 0.95,
      importance: 0.8,
      subject: "user",
      predicate: `preference.${marker}`,
      autoActivate: true,
    };
    expect(await createPendingMoodieMemory({
      supabase: supabase as never,
      userId,
      candidate: { ...base, content: `${marker} first`, value: { text: `${marker} first` } },
    })).toBe(true);
    expect(await createPendingMoodieMemory({
      supabase: supabase as never,
      userId,
      candidate: { ...base, content: `${marker} second`, value: { text: `${marker} second` } },
    })).toBe(true);

    const { data: memories } = await supabase.from("moodie_memories")
      .select("id, content, status, supersedes_memory_id")
      .eq("user_id", userId)
      .eq("predicate", base.predicate)
      .order("created_at", { ascending: true });
    expect(memories).toHaveLength(2);
    expect(memories?.[0]).toMatchObject({ status: "archived" });
    expect(memories?.[1]).toMatchObject({ status: "active", supersedes_memory_id: memories?.[0]?.id });

    const { data: relation } = await supabase.from("moodie_memory_relations")
      .select("source_memory_id, target_memory_id, relation_type")
      .eq("user_id", userId)
      .single();
    expect(relation).toMatchObject({
      source_memory_id: memories?.[1]?.id,
      target_memory_id: memories?.[0]?.id,
      relation_type: "supersedes",
    });
  }, 60_000);

  it("keeps observations and memory relations isolated by user RLS", async () => {
    const owner = createClient(url!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, { auth: { persistSession: false } });
    const outsider = createClient(url!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, { auth: { persistSession: false } });
    await Promise.all([
      owner.auth.signInWithPassword({ email: userEmail, password }),
      outsider.auth.signInWithPassword({ email: otherEmail, password }),
    ]);

    const { error: ownerInsertError } = await owner.from("moodie_observations").insert({
      user_id: userId,
      prompt_summary: `${marker} private observation`,
      succeeded: true,
    });
    expect(ownerInsertError).toBeNull();

    const { data: outsiderRows } = await outsider.from("moodie_observations")
      .select("id")
      .eq("user_id", userId);
    expect(outsiderRows).toEqual([]);

    const { error: forgedInsertError } = await outsider.from("moodie_observations").insert({
      user_id: userId,
      prompt_summary: `${marker} forged observation`,
      succeeded: true,
    });
    expect(forgedInsertError).not.toBeNull();

    const { data: outsiderRelations } = await outsider.from("moodie_memory_relations")
      .select("id")
      .eq("user_id", userId);
    expect(outsiderRelations).toEqual([]);
    await owner.from("moodie_observations").delete().ilike("prompt_summary", `%private observation%`);
  }, 30_000);

  it("reflects three observations into a pending episodic memory", async () => {
    const rows = ["plan", "execute", "verify"].map((phase) => ({
      user_id: userId,
      prompt_summary: `${marker} ${phase}`,
      outcome_summary: `${phase} completed`,
      tool_names: phase === "execute" ? ["browse_page"] : [],
      succeeded: true,
    }));
    const { error } = await supabase.from("moodie_observations").insert(rows);
    expect(error).toBeNull();

    const { reflectNextMoodieObservationBatch } = await import("../../lib/moodie/observation-store");
    const result = await reflectNextMoodieObservationBatch({ supabase, userId, minimumCount: 3 });
    expect(result).toMatchObject({ userId, observationCount: 3 });

    const { data: reflected } = await supabase.from("moodie_observations")
      .select("reflected_at")
      .eq("user_id", userId);
    expect(reflected).toHaveLength(3);
    expect(reflected?.every((row) => Boolean(row.reflected_at))).toBe(true);

    const { data: memory } = await supabase.from("moodie_memories")
      .select("memory_type, status, predicate, content")
      .eq("user_id", userId)
      .eq("predicate", "observation.reflection")
      .single();
    expect(memory).toMatchObject({ memory_type: "episodic", status: "pending", predicate: "observation.reflection" });
    expect(memory?.content.length).toBeGreaterThan(10);
  }, 90_000);
});
