export type AppShellRouteMode =
  | "normal"
  | "app"
  | "chat"
  | "form"
  | "gallery"
  | "fullpage";

const ROUTE_MODE_RULES: Array<{ mode: Exclude<AppShellRouteMode, "normal">; pattern: RegExp }> = [
  { mode: "fullpage", pattern: /\/print(\/.*)?$/ },
  { mode: "app", pattern: /^\/calendar(\/.*)?$/ },
  { mode: "chat", pattern: /^\/moodie(\/.*)?$/ },
  { mode: "form", pattern: /^\/contracts\/create$/ },
  { mode: "form", pattern: /^\/contracts\/[^/]+\/edit$/ },
  { mode: "form", pattern: /^\/services\/[^/]+\/quote$/ },
  { mode: "gallery", pattern: /\/contracts\/[^/]+\/gallery/ },
];

export function getAppShellRouteMode(pathname: string): AppShellRouteMode {
  return ROUTE_MODE_RULES.find((rule) => rule.pattern.test(pathname))?.mode || "normal";
}
