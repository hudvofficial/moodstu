import { config } from "dotenv";
import { createClient } from "@supabase/supabase-js";
import { runMoodieEngine } from "@/lib/moodie/engine";
import type { Database } from "@/types/database.types";

config({ path: ".env.local", quiet: true });
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
const describeLive = url && key ? describe : describe.skip;

describeLive("Moodie workflow v2 live integrations", () => {
  const supabase = createClient<Database>(url!, key!, { auth: { persistSession: false } });
  const userContext = { id: "workflow-live", fullName: "Admin", email: null, department: null, position: null, role: "admin" as const };

  it("grounds user identity in the authenticated session", async () => {
    const result = await runMoodieEngine({ supabase, role: "admin", prompt: "Bạn biết mình là ai không?", userContext });
    expect(result.content).toContain("Admin");
    expect(result.content).not.toContain("chưa giới thiệu");
    expect(result.content).not.toContain("chưa biết");
  }, 60_000);

  it("runs financial health review with multiple required tools", async () => {
    const result = await runMoodieEngine({ supabase, role: "admin", prompt: "Tình hình tài chính hiện tại có rủi ro dòng tiền không?", userContext });
    expect(result.metadata.skill_id).toBe("financial_health_review");
    expect(result.metadata.note).toBe("evidence_complete");
    expect(result.metadata.trace?.tools.map((tool) => tool.name)).toEqual(expect.arrayContaining(["get_financial_summary", "get_debt_summary"]));
    expect(result.metadata.parts?.filter((part) => part.type === "metric_grid").length).toBeGreaterThanOrEqual(2);
  }, 60_000);

  it("runs contract risk review across collections and schedules", async () => {
    const result = await runMoodieEngine({ supabase, role: "admin", prompt: "Rủi ro hợp đồng nào cần xử lý?", userContext });
    expect(result.metadata.skill_id).toBe("contract_risk_review");
    expect(result.metadata.note).toBe("evidence_complete");
    expect(result.metadata.trace?.tools.map((tool) => tool.name)).toEqual(expect.arrayContaining(["get_pending_collections", "get_upcoming_schedules"]));
    expect(result.metadata.parts?.some((part) => part.type === "metric_grid")).toBe(true);
  }, 60_000);

  it("builds a scoped customer brief from a real customer", async () => {
    const { data: customer } = await supabase.from("customers").select("full_name").not("full_name", "is", null).limit(1).maybeSingle();
    if (!customer?.full_name) return;
    const result = await runMoodieEngine({ supabase, role: "admin", prompt: `Khách ${customer.full_name} còn hợp đồng nào?`, userContext });
    expect(result.metadata.skill_id).toBe("customer_lookup");
    expect(result.metadata.note).toBe("evidence_complete");
    expect(result.metadata.trace?.tools.map((tool) => tool.name)).toContain("search_contracts");
    expect(result.content).toContain(customer.full_name);
  }, 30_000);
});
