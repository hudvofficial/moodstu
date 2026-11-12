import {
  guardStaleServerActionToasts,
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

describe("guardStaleServerActionToasts", () => {
  function makeToast() {
    const calls: string[] = [];
    const warnings: string[] = [];
    const target = {
      error: (message: unknown) => calls.push(String(message)),
      warning: (message: unknown) => warnings.push(String(message)),
      success: (message: unknown) => calls.push(`ok:${String(message)}`),
    };
    return { target, calls, warnings };
  }

  it("chạy recovery trước khi hiện toast lỗi và vẫn hiện toast", () => {
    const seen: unknown[] = [];
    const { target, calls } = makeToast();
    guardStaleServerActionToasts(target, ["error", "warning"], (error) => {
      seen.push(error);
      return true;
    });

    target.error("Server Action \"abc\" was not found on the server.");

    expect(seen).toHaveLength(1);
    expect(calls).toHaveLength(1);
  });

  it("không đụng tới toast.success", () => {
    const seen: unknown[] = [];
    const { target, calls } = makeToast();
    guardStaleServerActionToasts(target, ["error", "warning"], (error) => {
      seen.push(error);
      return false;
    });

    target.success("Đã lưu");

    expect(seen).toHaveLength(0);
    expect(calls).toEqual(["ok:Đã lưu"]);
  });

  it("idempotent: mount lại không bọc chồng", () => {
    const seen: unknown[] = [];
    const { target, calls } = makeToast();
    const onStale = (error: unknown) => {
      seen.push(error);
      return false;
    };

    guardStaleServerActionToasts(target, ["error"], onStale);
    const patched = target.error;
    guardStaleServerActionToasts(target, ["error"], onStale);

    expect(target.error).toBe(patched);

    target.error("x");
    expect(seen).toHaveLength(1);
    expect(calls).toHaveLength(1);
  });
});
