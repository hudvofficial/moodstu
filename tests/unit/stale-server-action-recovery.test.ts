import {
  isStaleServerActionError,
  reloadCurrentBuildOnce,
} from "@/lib/client/stale-server-action-recovery";

describe("stale Server Action recovery", () => {
  it.each([
    new Error('Server Action "abc" was not found on the server.'),
    new Error("Failed to find Server Action. This request might be from an older deployment."),
    { name: "UnrecognizedActionError", message: "unknown action" },
    "https://nextjs.org/docs/messages/failed-to-find-server-action",
  ])("recognizes deployment-skew errors", (error) => {
    expect(isStaleServerActionError(error)).toBe(true);
  });

  it("does not classify unrelated application errors", () => {
    expect(isStaleServerActionError(new Error("Gallery was not found"))).toBe(false);
  });

  it("reloads at most once for the same build key", () => {
    const values = new Map<string, string>();
    const reload = jest.fn();
    const environment = {
      storage: {
        getItem: (key: string) => values.get(key) ?? null,
        setItem: (key: string, value: string) => {
          values.set(key, value);
        },
      },
      reload,
    };

    expect(reloadCurrentBuildOnce("storage-build", environment)).toBe(true);
    expect(reloadCurrentBuildOnce("storage-build", environment)).toBe(false);
    expect(reload).toHaveBeenCalledTimes(1);
  });

  it("still reloads when session storage is unavailable", () => {
    const reload = jest.fn();
    const environment = {
      storage: {
        getItem: () => {
          throw new Error("blocked");
        },
        setItem: jest.fn(),
      },
      reload,
    };

    expect(reloadCurrentBuildOnce("blocked-storage-build", environment)).toBe(true);
    expect(reloadCurrentBuildOnce("blocked-storage-build", environment)).toBe(false);
    expect(reload).toHaveBeenCalledTimes(1);
  });
});
