import type { EmployeeRole } from "./employee";

export const ROLES = ["admin", "manager", "sale", "media", "viewer"] as const;

export type Role = (typeof ROLES)[number];

export const ROLE_PERMISSIONS: Record<Role, string[]> = {
  admin: [
    "dashboard",
    "contracts",
    "crm",
    "finance",
    "inventory",
    "calendar",
    "productivity",
    "reports",
    "employees",
    "printing",
    "settings",
    "services",
    "dresses",
    "moodie",
  ],
  manager: [
    "dashboard",
    "contracts",
    "crm",
    "finance",
    "inventory",
    "calendar",
    "productivity",
    "reports",
    "employees",
    "printing",
    "settings",
    "services",
    "dresses",
  ],
  sale: ["dashboard", "contracts", "crm", "calendar", "dresses"],
  media: ["dashboard", "productivity", "calendar"],
  viewer: ["dashboard", "moodie"],
};

const VIEWER_ROLE_ALIASES = new Set(["viewer", "user", "ctv"]);

export function normalizeRole(value: string | null | undefined): Role {
  const normalized = value?.trim().toLowerCase();

  if (!normalized) return "viewer";
  if (normalized === "admin") return "admin";
  if (normalized === "manager") return "manager";
  if (normalized === "sale") return "sale";
  if (normalized === "media") return "media";
  if (VIEWER_ROLE_ALIASES.has(normalized)) return "viewer";

  return "viewer";
}

export function normalizeEmployeeRole(
  value: string | null | undefined,
): EmployeeRole {
  switch (normalizeRole(value)) {
    case "admin":
      return "admin";
    case "manager":
      return "manager";
    case "sale":
      return "sale";
    case "media":
      return "media";
    default:
      return "ctv";
  }
}

export function canManageSettingsRole(
  value: string | null | undefined,
): boolean {
  const role = normalizeRole(value);
  return role === "admin" || role === "manager";
}

export function canAccess(role: Role, route: string): boolean {
  return ROLE_PERMISSIONS[role]?.includes(route) ?? false;
}
