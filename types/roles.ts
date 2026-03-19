// ═══════════════════════════════════════════
// Mood Studio V2 — Role-Based Access Control
// 5 roles as per Plan P01
// ═══════════════════════════════════════════

export const ROLES = ["admin", "manager", "sale", "media", "viewer"] as const;

export type Role = (typeof ROLES)[number];

/** Menu items visible to each role (V1-matching IDs) */
export const ROLE_PERMISSIONS: Record<Role, string[]> = {
  admin: [
    "dashboard", "contracts", "crm", "finance",
    "inventory", "calendar", "productivity", "reports",
    "employees", "printing", "settings", "services",
    "dresses", "moodie",
  ],
  manager: [
    "dashboard", "contracts", "crm", "finance",
    "inventory", "calendar", "productivity", "reports",
    "employees", "printing", "services", "dresses",
  ],
  sale: [
    "dashboard", "contracts", "crm", "calendar",
    "dresses",
  ],
  media: [
    "dashboard", "productivity", "calendar",
  ],
  viewer: [
    "dashboard", "moodie",
  ],
};

/** Check if a role can access a route */
export function canAccess(role: Role, route: string): boolean {
  return ROLE_PERMISSIONS[role]?.includes(route) ?? false;
}
