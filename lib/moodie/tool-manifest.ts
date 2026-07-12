import {
  MOODIE_CAPABILITIES,
  canUseMoodieCapability,
  type MoodieIntentDomain,
} from "@/lib/moodie/capability-registry";
import type { Role } from "@/types/roles";

export type { MoodieIntentDomain } from "@/lib/moodie/capability-registry";

export type MoodieToolManifestEntry = {
  name: string;
  domains: MoodieIntentDomain[];
  requiresData: boolean;
  readOnly: boolean;
  adminOnly?: boolean;
  priority: number;
};

export const MOODIE_TOOL_MANIFEST: Record<string, MoodieToolManifestEntry> = Object.fromEntries(
  Object.values(MOODIE_CAPABILITIES)
    .filter((capability) => capability.surfaces.includes("text"))
    .map((capability) => [capability.name, {
      name: capability.name,
      domains: capability.domains,
      requiresData: capability.requiresData,
      readOnly: capability.readOnly,
      adminOnly: capability.minimumRoles.length === 1 && capability.minimumRoles[0] === "admin",
      priority: capability.priority,
    }]),
);

export function getMoodieToolManifestEntry(name: string) {
  return MOODIE_TOOL_MANIFEST[name];
}

export function canExposeMoodieTool(name: string, role: Role) {
  return canUseMoodieCapability(name, role, "text");
}
