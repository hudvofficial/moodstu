import { config } from "dotenv";
import { createClient } from "@supabase/supabase-js";
import { runMoodieEngine } from "@/lib/moodie/engine";
import type { Database } from "@/types/database.types";

config({ path: ".env.local", quiet: true });

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const describeLive = url && serviceKey ? describe : describe.skip;

describeLive("Moodie studio_daily_brief live", () => {
  it("executes the structured workflow against live studio data", async () => {
    const supabase = createClient<Database>(url!, serviceKey!, { auth: { persistSession: false } });
    const result = await runMoodieEngine({
      supabase,
      role: "admin",
      prompt: "Tình hình studio hiện tại thế nào?",
      history: [{ role: "user", content: "Tình hình studio hiện tại thế nào?" }],
      userContext: { id: "live-verifier", fullName: "Admin", email: null, department: null, position: null, role: "admin" },
    });

    expect(result.metadata.skill_id).toBe("studio_daily_brief");
    expect(result.metadata.note).toBe("evidence_complete");
    expect(result.metadata.trace?.tools[0]?.name).toBe("get_team_summary");
    expect(result.metadata.parts?.some((part) => part.type === "metric_grid")).toBe(true);

    const metricGrid = result.metadata.parts?.find((part) => part.type === "metric_grid");
    if (!metricGrid || metricGrid.type !== "metric_grid") throw new Error("missing metric grid");
    const overdue = Number(metricGrid.items.find((item) => item.label === "Công việc quá hạn")?.value || 0);
    if (overdue > 0) {
      expect(result.metadata.trace?.tools.map((tool) => tool.name)).toContain("get_overdue_tasks");
      expect(result.metadata.parts?.some((part) => part.type === "alert_list")).toBe(true);
      expect(result.metadata.parts?.some((part) => part.type === "action_list")).toBe(true);
      expect(result.content).toContain("đã đối chiếu chi tiết");
    }
  }, 30_000);
});
