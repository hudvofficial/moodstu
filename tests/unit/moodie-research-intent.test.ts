import { classifyMoodieResearchIntent } from "@/lib/moodie/research-intent";

describe("Moodie research intent", () => {
  it.each([
    ["Tin AI mới nhất hôm nay", "news"],
    ["Search web giúp tôi về OpenAI", "web"],
    ["Tìm nguồn cho thông tin này", "web"],
    ["Kiểm tra online xem luật mới ra sao", "web"],
    ["Brave search xu hướng studio", "web"],
    ["OpenAI có announcement gì gần đây?", "news"],
    ["Giá vàng hiện tại", "web"],
    ["Current React version là gì?", "web"],
    ["Tìm nhà hàng gần studio", "local"],
    ["Restaurant near me", "local"],
    ["Cho mình citation về nhận định này", "web"],
    ["Verify online thông tin này", "web"],
    ["Tin tức công nghệ vừa qua", "news"],
    ["Xu hướng chụp cưới hiện nay", "web"],
    ["Quy định mới về thuế", "web"],
  ])("requires research for %s", (prompt, mode) => {
    const result = classifyMoodieResearchIntent(prompt);
    expect(result.required).toBe(true);
    expect(result.mode).toBe(mode);
  });

  it.each([
    "React là gì?",
    "Giải thích khái niệm cashflow",
    "What is a database index?",
    "Viết lời chúc sinh nhật",
    "Tóm tắt đoạn văn này",
    "Doanh thu studio tháng này",
    "Tôi là ai?",
    "Hợp đồng HD-001 có trạng thái gì?",
    "Lịch studio ngày mai",
    "Giá dịch vụ baby của studio",
    "Define dependency injection",
    "Viết email cảm ơn khách hàng",
    "Phân tích nội dung tôi vừa gửi",
    "Nhớ rằng tôi thích trả lời ngắn",
    "Mở hợp đồng vừa nhắc tới",
  ])("does not force external research for %s", (prompt) => {
    expect(classifyMoodieResearchIntent(prompt).required).toBe(false);
  });
});
