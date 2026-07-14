import { getAppShellRouteMode } from "@/lib/app-shell-route-mode";

describe("getAppShellRouteMode", () => {
  it.each([
    ["/calendar", "app"],
    ["/calendar/week", "app"],
    ["/moodie", "chat"],
    ["/moodie/thread/1", "chat"],
    ["/contracts/create", "form"],
    ["/contracts/abc/edit", "form"],
    ["/services/abc/quote", "form"],
    ["/contracts/abc/gallery", "gallery"],
    ["/printing/orders/abc/print", "fullpage"],
    ["/dashboard", "normal"],
  ])("maps %s to %s", (pathname, expected) => {
    expect(getAppShellRouteMode(pathname)).toBe(expected);
  });
});
