import type { MoodieMessage, MoodieTrace } from "@/types/moodie";

const LEGACY_DISPLAY_TEXT = new Map<string, string>([
  ["Chua co", "Chưa có"],
  ["Ngay mai", "Ngày mai"],
  ["Hom nay", "Hôm nay"],
  ["7 ngay toi", "7 ngày tới"],
  ["Cong no hien tai the nao?", "Công nợ hiện tại thế nào?"],
  ["Nhung hop dong nao con phai thu?", "Những hợp đồng nào còn phải thu?"],
  ["Tien do cac muc tieu tai chinh ra sao?", "Tiến độ các mục tiêu tài chính ra sao?"],
  ["Tai chinh tong quan thang nay ra sao?", "Tài chính tổng quan tháng này ra sao?"],
  ["Tai chinh tong quan thang nay", "Tài chính tổng quan tháng này"],
  ["Tra cuu hop dong cua khach Lan", "Tra cứu hợp đồng của khách Lan"],
  ["Tim hop dong cua khach Lan", "Tìm hợp đồng của khách Lan"],
  ["Lich hom nay co gi?", "Lịch hôm nay có gì?"],
  ["Ngay mai ekip co lich nao?", "Ngày mai ê-kíp có lịch nào?"],
  ["Ngày mai ekip có lịch nào?", "Ngày mai ê-kíp có lịch nào?"],
  ["Khach chua ro", "Khách chưa rõ"],
  ["So hop dong", "Số hợp đồng"],
  ["Su kien", "Sự kiện"],
  ["Danh muc doanh thu noi bat", "Danh mục doanh thu nổi bật"],
  ["Co the danh cho muc tieu", "Có thể dành cho mục tiêu"],
  ["Tien do tong", "Tiến độ tổng"],
  ["Dong tien cho muc tieu", "Dòng tiền cho mục tiêu"],
  ["Tien do muc tieu", "Tiến độ mục tiêu"],
  ["Phai thu", "Phải thu"],
  ["Phai tra", "Phải trả"],
  ["Qua han", "Quá hạn"],
  ["No rong", "Nợ ròng"],
  ["Bucket tuoi no", "Nhóm tuổi nợ"],
  ["Danh sach can thu", "Danh sách cần thu"],
  ["Khoan can thu noi bat", "Khoản cần thu nổi bật"],
  ["Khung thoi gian", "Khung thời gian"],
  ["Gia goi baby la bao nhieu?", "Giá gói baby là bao nhiêu?"],
  ["Ky hien tai", "Kỳ hiện tại"],
  ["Net cashflow", "Dòng tiền ròng"],
  ["Công nợ hien tai", "Công nợ hiện tại"],
]);

export function normalizeMoodieDisplayText(value: string) {
  const exactMatch = LEGACY_DISPLAY_TEXT.get(value.trim());
  if (exactMatch) return exactMatch;

  return value
    .replace(/^(\d+) ngay toi$/i, "$1 ngày tới")
    .replace(/^(\d+)-(\d+) ngay$/i, "$1-$2 ngày")
    .replace(/^>\s*(\d+) ngay$/i, "> $1 ngày")
    .replace(/^Can them (.+)\/thang$/i, "Cần thêm $1/tháng");
}

export type MoodieActivityStage = {
  label: string;
  state: "done" | "active" | "idle";
};

function buildStagesFromTrace(trace: MoodieTrace | undefined): MoodieActivityStage[] {
  if (!trace) {
    return [
      { label: "Đang hiểu yêu cầu", state: "active" },
      { label: "Chuẩn bị tra dữ liệu", state: "idle" },
      { label: "Tổng hợp câu trả lời", state: "idle" },
    ];
  }

  const usedTools = trace.tool_call_count > 0;
  return [
    { label: "Đã hiểu yêu cầu", state: "done" },
    {
      label: trace.retrieval_used ? "Đã tra ngữ cảnh liên quan" : "Bỏ qua bước tra ngữ cảnh",
      state: trace.retrieval_used ? "done" : "idle",
    },
    {
      label: usedTools ? `Đã gọi ${trace.tool_call_count} công cụ` : "Không cần gọi công cụ",
      state: usedTools ? "done" : "idle",
    },
    {
      label: trace.fallback_used ? "Đã dùng bộ xử lý dự phòng" : "Đã tổng hợp câu trả lời",
      state: "done",
    },
  ];
}

export function getMoodieActivityStages(params: {
  loading: boolean;
  pendingPrompt: string | null;
  conversation: { messages: MoodieMessage[] } | null;
}) {
  if (params.loading) {
    return [
      { label: "Đang hiểu yêu cầu", state: "done" },
      { label: "Đang tra dữ liệu và ngữ cảnh", state: "active" },
      { label: "Đang tổng hợp câu trả lời", state: "idle" },
    ] satisfies MoodieActivityStage[];
  }

  const lastAssistant = [...(params.conversation?.messages || [])]
    .reverse()
    .find((message) => message.role === "assistant");

  return buildStagesFromTrace(lastAssistant?.metadata?.trace);
}
