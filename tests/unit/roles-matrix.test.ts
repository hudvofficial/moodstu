/**
 * #22 (T-20260907-role-gate-route) — ma trận ROLE_PERMISSIONS là nguồn duy nhất của phân quyền tầng route.
 * Không DB. Khoá mỗi quyết định đã chốt: C1 (sale không CRM), khoá "admin" cho công cụ quản trị,
 * và mọi khoá trong ma trận phải trỏ tới một module có thật (hoặc "admin").
 */
import { MODULES } from "@/lib/navigation";
import { ROLE_PERMISSIONS, ROLES, canAccess } from "@/types/roles";

describe("ROLE_PERMISSIONS — #22", () => {
  it("C1: sale không còn CRM, vẫn có hợp đồng/lịch/váy", () => {
    expect(canAccess("sale", "crm")).toBe(false);
    expect(canAccess("sale", "contracts")).toBe(true);
    expect(canAccess("sale", "calendar")).toBe(true);
    expect(canAccess("sale", "dresses")).toBe(true);
  });

  it("admin + manager có khoá admin (công cụ quản trị) và settings; sale/media/viewer thì không", () => {
    for (const role of ["admin", "manager"] as const) {
      expect(canAccess(role, "admin")).toBe(true);
      expect(canAccess(role, "settings")).toBe(true);
      expect(canAccess(role, "crm")).toBe(true);
    }
    for (const role of ["sale", "media", "viewer"] as const) {
      expect(canAccess(role, "admin")).toBe(false);
      expect(canAccess(role, "settings")).toBe(false);
    }
  });

  it("viewer (ctv) chỉ dashboard + moodie", () => {
    expect([...ROLE_PERMISSIONS.viewer].sort()).toEqual(["dashboard", "moodie"]);
  });

  it("mọi khoá trong ma trận là id của MODULES, hoặc dashboard/admin", () => {
    const known = new Set([...MODULES.map((m) => m.id), "dashboard", "admin"]);
    for (const role of ROLES) {
      for (const key of ROLE_PERMISSIONS[role]) {
        expect(known.has(key) ? key : `${role}:${key} không có module`).toBe(key);
      }
    }
  });
});
