/**
 * #19 (T-20260911-audit-co-danh-tinh) — khoá hành vi của ngữ cảnh "ai đang thao tác".
 * Ba điều phải đúng, nếu sai thì nhật ký hoặc mất danh tính, hoặc tệ hơn: ghi nhầm người.
 * Không DB, không mạng.
 */
import { getAuditActor, runWithAuditActor } from "@/lib/audit-context";

describe("audit-context — #19", () => {
  it("danh tính sống sót qua promise trôi (fire-and-forget sau khi action đã trả về)", async () => {
    let seen: string | null | undefined;

    // Mô phỏng đúng cách fireAuditLog chạy: gọi trong ngữ cảnh, không await, action return ngay.
    const floating = runWithAuditActor({ performedBy: "user-A" }, () => {
      return new Promise<void>((resolve) => {
        setTimeout(() => {
          seen = getAuditActor()?.performedBy;
          resolve();
        }, 10);
      });
    });

    expect(getAuditActor()).toBeNull(); // ngoài ngữ cảnh: không thấy gì
    await floating;
    expect(seen).toBe("user-A");
  });

  it("hai ngữ cảnh song song không lẫn danh tính của nhau", async () => {
    const doi = async (id: string) =>
      runWithAuditActor({ performedBy: id }, async () => {
        await new Promise((r) => setTimeout(r, Math.random() > 0.5 ? 5 : 15));
        return getAuditActor()?.performedBy;
      });

    const [a, b, c] = await Promise.all([doi("user-A"), doi("user-B"), doi("user-C")]);
    expect([a, b, c]).toEqual(["user-A", "user-B", "user-C"]);
  });

  it("ngoài mọi wrapper thì trả null, không ném lỗi", () => {
    expect(getAuditActor()).toBeNull();
  });

  it("ngữ cảnh lồng nhau: lớp trong thắng", async () => {
    const ket_qua = runWithAuditActor({ performedBy: "ngoai" }, () =>
      runWithAuditActor({ performedBy: "trong" }, () => getAuditActor()?.performedBy),
    );
    expect(ket_qua).toBe("trong");
  });

  it("chở được cả IP và user-agent", () => {
    const ket_qua = runWithAuditActor(
      { performedBy: "user-A", ipAddress: "1.2.3.4", userAgent: "Mozilla/5.0" },
      () => getAuditActor(),
    );
    expect(ket_qua).toEqual({ performedBy: "user-A", ipAddress: "1.2.3.4", userAgent: "Mozilla/5.0" });
  });
});
