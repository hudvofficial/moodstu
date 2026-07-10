import { afterEach, describe, expect, it, jest } from "@jest/globals";
import { sendMoodieStreamingMessage } from "@/lib/moodie/stream-client";

describe("Moodie stream client", () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("parses status and result events across CRLF boundaries", async () => {
    const onStatus = jest.fn();
    const payload = [
      'data: {"type":"status","label":"Đang suy nghĩ"}\r\n\r\n',
      'data: {"type":"result","data":{"conversation":{"id":"conversation-1"},"message":{"id":"message-1"}}}\r\n\r\n',
      'data: {"type":"done"}\r\n\r\n',
    ].join("");

    jest.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(payload, {
        headers: { "Content-Type": "text/event-stream; charset=utf-8" },
      }),
    );

    const result = await sendMoodieStreamingMessage({
      conversationId: null,
      content: "Xin chào",
      onStatus,
    });

    expect(onStatus).toHaveBeenCalledWith("Đang suy nghĩ");
    expect(result.message.id).toBe("message-1");
  });

  it("reports an expired session when middleware returns HTML", async () => {
    jest.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response("<html>login</html>", {
        headers: { "Content-Type": "text/html; charset=utf-8" },
      }),
    );

    await expect(
      sendMoodieStreamingMessage({
        conversationId: null,
        content: "Xin chào",
        onStatus: jest.fn(),
      }),
    ).rejects.toThrow("Phiên đăng nhập đã hết hạn");
  });
});
