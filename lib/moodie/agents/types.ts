import type { MoodieIntentDomain } from "@/lib/moodie/tool-manifest";
import type { Role } from "@/types/roles";

export type MoodieAgentId =
  | "studio_advisor"
  | "finance_analyst"
  | "operations_assistant"
  | "codebase_analyst";

export interface MoodieAgentProfile {
  id: MoodieAgentId;
  version: number;
  label: string;
  mission: string;
  domains: MoodieIntentDomain[];
  roles: Role[];
  instructions: string[];
  successMetrics: string[];
}

