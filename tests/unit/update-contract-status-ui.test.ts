import { describe, expect, it, jest, beforeEach } from "@jest/globals";
import { handleContractStatusUpdate } from "@/lib/contracts/update-contract-status-ui";
import { toast } from "sonner";

jest.mock("sonner", () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn(),
  },
}));

jest.mock("@/app/actions/contract-mutations", () => ({
  updateContractStatus: jest.fn(),
}));

jest.mock("@/lib/hooks/use-contract-queries", () => ({
  updateContractStatusCache: jest.fn(),
}));

describe("handleContractStatusUpdate", () => {
  const queryClient = {} as any;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("when server action returns success:false", () => {
    it("returns false, does NOT update cache or show success toast", async () => {
      const updateStatus = jest.fn(async () => ({
        success: false as const,
        error: "Khong co quyen",
      }));
      const updateCache = jest.fn();
      const onFailure = jest.fn();

      const result = await handleContractStatusUpdate({
        contractId: "contract-1",
        newStatus: "hoan_thanh",
        queryClient,
        updateStatus: updateStatus as any,
        updateCache,
        onFailure,
      });

      expect(result).toBe(false);
      expect(updateCache).not.toHaveBeenCalled();
      expect(toast.success).not.toHaveBeenCalled();
      expect(toast.error).toHaveBeenCalledWith("Khong co quyen");
      expect(onFailure).toHaveBeenCalledTimes(1);
    });
  });

  describe("when server action throws (network failure, 500 crash etc.)", () => {
    it("returns false, shows error toast, calls onFailure exactly once — no silent failure", async () => {
      const updateStatus = jest.fn(async () => {
        throw new Error("Network error");
      });
      const updateCache = jest.fn();
      const onFailure = jest.fn();

      const result = await handleContractStatusUpdate({
        contractId: "contract-1",
        newStatus: "dang_thuc_hien",
        queryClient,
        updateStatus: updateStatus as any,
        updateCache,
        onFailure,
      });

      expect(result).toBe(false);
      expect(updateCache).not.toHaveBeenCalled();
      expect(toast.success).not.toHaveBeenCalled();
      expect(toast.error).toHaveBeenCalledWith("Network error");
      expect(onFailure).toHaveBeenCalledTimes(1);
    });
  });

  describe("when server action returns success:true", () => {
    it("returns true, updates cache, shows success toast, does NOT call onFailure", async () => {
      const updateStatus = jest.fn(async () => ({ success: true as const, data: null }));
      const updateCache = jest.fn();
      const onFailure = jest.fn();

      const result = await handleContractStatusUpdate({
        contractId: "contract-1",
        newStatus: "dang_thuc_hien",
        queryClient,
        updateStatus: updateStatus as any,
        updateCache,
        onFailure,
      });

      expect(result).toBe(true);
      expect(updateCache).toHaveBeenCalledWith(queryClient, "contract-1", "dang_thuc_hien");
      expect(toast.success).toHaveBeenCalledWith("Đã cập nhật trạng thái hợp đồng");
      expect(toast.error).not.toHaveBeenCalled();
      expect(onFailure).not.toHaveBeenCalled();
    });
  });
});
