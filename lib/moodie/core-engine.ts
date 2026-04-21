import type { SupabaseClient } from "@supabase/supabase-js";
import { fetchDebtStats, fetchGoals, fetchGoalsCashflow } from "@/app/actions/finance-operations-queries";
import { getPendingCollections } from "@/app/actions/finance-dashboard-queries";
import { getReportsSnapshot } from "@/app/actions/finance-reports-queries";
import { getMoodieCapabilityById, getMoodieDefaultSuggestions, MOODIE_PROVIDER_LABEL } from "@/lib/moodie/catalog";
import { getTodayInTimeZone } from "@/lib/studio-date";
import { canAccess, type Role } from "@/types/roles";
import type { ActionResult } from "@/types/action-result";
import type { MoodieMessageMeta, MoodieSkillId } from "@/types/moodie";
import type { ReportFiltersInput } from "@/types/reports";

type EngineResult = {
  content: string;
  metadata: MoodieMessageMeta;
};

type ContractLookupRow = {
  id: string;
  contract_code: string | null;
  contract_date: string | null;
  work_date: string | null;
  status: string | null;
  total_amount: number | null;
  paid_amount: number | null;
  remaining_amount: number | null;
  customers:
    | {
        full_name: string | null;
        phone: string | null;
      }
    | {
        full_name: string | null;
        phone: string | null;
      }[]
    | null;
};

type EventRow = {
  id: string;
  contract_id: string | null;
  title: string | null;
  event_type: string | null;
  event_date: string | null;
  start_time: string | null;
  location: string | null;
  status: string | null;
};

type ServiceRow = {
  id: string;
  service_code: string | null;
  name: string | null;
  service_type: string | null;
  selling_price: number | null;
  status: string | null;
};

function unwrap<T>(result: ActionResult<T>): T {
  if (!result.success) throw new Error(result.error);
  return result.data;
}

function normalizeText(value: string) {
  return value
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9\s/:-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function formatCurrency(value: number | null | undefined) {
  return `${Math.round(value || 0).toLocaleString("vi-VN")}đ`;
}

function formatPercent(value: number | null | undefined) {
  return `${Number(value || 0).toLocaleString("vi-VN")}%`;
}

function formatDate(value: string | null | undefined) {
  if (!value) return "Chưa có";
  return new Intl.DateTimeFormat("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date(`${value}T00:00:00`));
}

function formatShortTime(value: string | null | undefined) {
  return value?.slice(0, 5) || "--:--";
}

function detectSkill(prompt: string): MoodieSkillId {
  const text = normalizeText(prompt);

  if (["cong no", "qua han", "phai thu", "phai tra", "no rong"].some((keyword) => text.includes(keyword))) {
    return "debt_summary";
  }

  if (["can thu", "thu tien", "chua thanh toan", "con lai", "sap thu"].some((keyword) => text.includes(keyword))) {
    return "pending_collections";
  }

  if (["hop dong", "ma hd", "hd"].some((keyword) => text.includes(keyword))) {
    return "contract_lookup";
  }

  if (["lich", "hom nay", "ngay mai", "tuan nay", "su kien", "on set"].some((keyword) => text.includes(keyword))) {
    return "schedule_summary";
  }

  if (["nhan su", "ekip", "task tre", "qua han task", "tien do ekip"].some((keyword) => text.includes(keyword))) {
    return "team_summary";
  }

  if (["muc tieu", "quy du phong", "gop von", "tiet kiem", "goal"].some((keyword) => text.includes(keyword))) {
    return "goal_summary";
  }

  if (["dich vu", "bang gia", "goi baby", "goi chup", "service"].some((keyword) => text.includes(keyword))) {
    return "service_catalog";
  }

  if (["doanh thu", "loi nhuan", "thu chi", "tai chinh", "bao cao"].some((keyword) => text.includes(keyword))) {
    return "financial_summary";
  }

  return "fallback";
}

function getPermissionDeniedResult(role: Role, skillId: MoodieSkillId): EngineResult {
  const capability = getMoodieCapabilityById(skillId);

  return {
    content: [
      `Vai trò hiện tại là ${role}. Moodie chưa mở quyền truy cập dữ liệu cho yêu cầu này.`,
      "",
      "Bạn có thể hỏi những nội dung đang sẵn sàng cho quyền hiện tại, ví dụ:",
      ...getMoodieDefaultSuggestions(role).slice(0, 3).map((prompt) => `- ${prompt}`),
    ].join("\n"),
    metadata: {
      provider: MOODIE_PROVIDER_LABEL,
      skill_id: skillId,
      skill_label: capability?.label || "Moodie",
      note: "permission_denied",
      follow_ups: getMoodieDefaultSuggestions(role).slice(0, 3),
    },
  };
}

function deriveReportFilters(prompt: string): ReportFiltersInput {
  const today = getTodayInTimeZone();
  const [yearText, monthText] = today.split("-");
  const currentYear = Number(yearText);
  const currentMonth = Number(monthText);
  const text = normalizeText(prompt);

  const quarterMatch = text.match(/quy\s+([1-4])(?:\s*\/\s*(\d{4}))?/);
  if (quarterMatch) {
    return {
      periodType: "quarter",
      quarter: Number(quarterMatch[1]),
      year: quarterMatch[2] ? Number(quarterMatch[2]) : currentYear,
    };
  }

  const monthMatch = text.match(/thang\s+(\d{1,2})(?:\s*\/\s*(\d{4}))?/);
  if (monthMatch) {
    return {
      periodType: "month",
      month: Number(monthMatch[1]),
      year: monthMatch[2] ? Number(monthMatch[2]) : currentYear,
    };
  }

  const explicitYearMatch = text.match(/nam\s+(\d{4})/);
  if (text.includes("nam nay") || explicitYearMatch) {
    return {
      periodType: "year",
      year: explicitYearMatch ? Number(explicitYearMatch[1]) : currentYear,
    };
  }

  return { periodType: "month", month: currentMonth, year: currentYear };
}

function getScheduleRange(prompt: string) {
  const text = normalizeText(prompt);
  const base = new Date(`${getTodayInTimeZone()}T00:00:00`);

  if (text.includes("ngay mai")) {
    const tomorrow = new Date(base);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const iso = tomorrow.toISOString().slice(0, 10);
    return { start: iso, end: iso, label: "ngày mai" };
  }

  if (text.includes("tuan nay")) {
    const end = new Date(base);
    end.setDate(end.getDate() + 6);
    return {
      start: base.toISOString().slice(0, 10),
      end: end.toISOString().slice(0, 10),
      label: "7 ngày tới",
    };
  }

  if (text.includes("hom nay")) {
    const iso = base.toISOString().slice(0, 10);
    return { start: iso, end: iso, label: "hôm nay" };
  }

  const end = new Date(base);
  end.setDate(end.getDate() + 2);
  return {
    start: base.toISOString().slice(0, 10),
    end: end.toISOString().slice(0, 10),
    label: "3 ngày tới",
  };
}

function scoreNormalizedMatch(needle: string, haystack: string) {
  if (!needle) return 1;
  return normalizeText(haystack).includes(needle) ? 1 : 0;
}

function extractSearchTerm(prompt: string) {
  return normalizeText(prompt)
    .replace(/\b(hop dong|ma hd|hd|khach|cua|tim|tra cuu|cho toi|xem|nhung|dang|con|sap|den han|la bao nhieu)\b/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

async function respondFinancialSummary(role: Role, prompt: string): Promise<EngineResult> {
  if (!canAccess(role, "finance")) {
    return getPermissionDeniedResult(role, "financial_summary");
  }

  const snapshot = unwrap(await getReportsSnapshot(deriveReportFilters(prompt)));
  const summary = snapshot.summary;

  if (summary.totalContracts === 0) {
    return {
      content: `Hiện chưa có dữ liệu tài chính trong ${snapshot.range.label.toLowerCase()}.`,
      metadata: {
        provider: MOODIE_PROVIDER_LABEL,
        skill_id: "financial_summary",
        skill_label: "Tài chính tổng quan",
        sources: [{ label: "Kỳ báo cáo", value: snapshot.range.label }],
        follow_ups: ["Công nợ hiện tại thế nào?", "Những hợp đồng nào còn phải thu?"],
      },
    };
  }

  const profitSignal = summary.netProfit >= 0 ? "Kỳ này studio đang có lãi." : "Kỳ này studio đang âm lợi nhuận, nên rà lại chi phí và tốc độ thu tiền.";

  return {
    content: [
      `Trong ${snapshot.range.label.toLowerCase()}, studio ghi nhận:`,
      `- Doanh thu: ${formatCurrency(summary.totalRevenue)}`,
      `- Tổng chi: ${formatCurrency(summary.totalCost)}`,
      `- Lợi nhuận ròng: ${formatCurrency(summary.netProfit)} (${summary.profitMargin.toLocaleString("vi-VN")}%)`,
      `- Hợp đồng: ${summary.completedContracts}/${summary.totalContracts} đã hoàn thành`,
      `- Doanh thu phát sinh: ${formatCurrency(summary.addonRevenue)} (${summary.addonPercentage.toLocaleString("vi-VN")}%)`,
      "",
      profitSignal,
    ].join("\n"),
    metadata: {
      provider: MOODIE_PROVIDER_LABEL,
      skill_id: "financial_summary",
      skill_label: "Tài chính tổng quan",
      sources: [
        { label: "Kỳ báo cáo", value: snapshot.range.label },
        { label: "Giá trị TB / HĐ", value: formatCurrency(summary.avgContractValue) },
        { label: "Chi phí lương", value: formatCurrency(summary.salaryCost) },
      ],
      follow_ups: ["Công nợ hiện tại thế nào?", "Những hợp đồng nào còn phải thu?"],
    },
  };
}

async function respondDebtSummary(role: Role): Promise<EngineResult> {
  if (!canAccess(role, "finance")) {
    return getPermissionDeniedResult(role, "debt_summary");
  }

  const stats = unwrap(await fetchDebtStats());
  const dominantBucket = Object.entries(stats.aging)
    .sort((left, right) => Number(right[1]) - Number(left[1]))[0];

  const bucketLabelMap: Record<string, string> = {
    not_due: "Chưa đến hạn",
    days_1_30: "1-30 ngày",
    days_31_60: "31-60 ngày",
    days_61_90: "61-90 ngày",
    over_90: "> 90 ngày",
  };

  return {
    content: [
      "Ảnh chụp công nợ hiện tại:",
      `- Phải thu: ${formatCurrency(stats.receivable)}`,
      `- Phải trả: ${formatCurrency(stats.payable)}`,
      `- Nợ ròng: ${formatCurrency(stats.net_debt)}`,
      `- Quá hạn: ${formatCurrency(stats.overdue)}`,
      dominantBucket
        ? `- Bucket lớn nhất: ${bucketLabelMap[dominantBucket[0]] || dominantBucket[0]} (${formatCurrency(Number(dominantBucket[1]))})`
        : "- Chưa có bucket tuổi nợ nổi bật",
    ].join("\n"),
    metadata: {
      provider: MOODIE_PROVIDER_LABEL,
      skill_id: "debt_summary",
      skill_label: "Công nợ",
      sources: [
        { label: "Phải thu", value: formatCurrency(stats.receivable) },
        { label: "Phải trả", value: formatCurrency(stats.payable) },
        { label: "Quá hạn", value: formatCurrency(stats.overdue) },
      ],
      follow_ups: ["Những hợp đồng nào còn phải thu?", "Lợi nhuận tháng này ra sao?"],
    },
  };
}

async function respondPendingCollections(role: Role): Promise<EngineResult> {
  if (!canAccess(role, "finance")) {
    return getPermissionDeniedResult(role, "pending_collections");
  }

  const items = unwrap(await getPendingCollections(5));

  if (items.length === 0) {
    return {
      content: "Hiện không có hợp đồng nào nằm trong danh sách cần thu.",
      metadata: {
        provider: MOODIE_PROVIDER_LABEL,
        skill_id: "pending_collections",
        skill_label: "Danh sách cần thu",
        follow_ups: ["Công nợ hiện tại thế nào?", "Lợi nhuận tháng này ra sao?"],
      },
    };
  }

  return {
    content: [
      "Các khoản cần thu nổi bật lúc này:",
      ...items.slice(0, 5).map((item, index) => {
        const customerName = item.customers?.full_name || "Khách chưa rõ";
        return `${index + 1}. ${item.contract_code || item.id} - ${customerName}: còn ${formatCurrency(item.remaining_amount)}`;
      }),
    ].join("\n"),
    metadata: {
      provider: MOODIE_PROVIDER_LABEL,
      skill_id: "pending_collections",
      skill_label: "Danh sách cần thu",
      sources: [{ label: "Số hợp đồng", value: String(items.length) }],
      follow_ups: ["Công nợ hiện tại thế nào?", "Tìm hợp đồng của khách Lan"],
    },
  };
}

async function respondContractLookup(
  supabase: SupabaseClient,
  role: Role,
  prompt: string,
): Promise<EngineResult> {
  if (!canAccess(role, "contracts")) {
    return getPermissionDeniedResult(role, "contract_lookup");
  }

  const searchTerm = extractSearchTerm(prompt);
  const { data, error } = await supabase
    .from("contracts")
    .select("id, contract_code, contract_date, work_date, status, total_amount, paid_amount, remaining_amount, customers(full_name, phone)")
    .is("deleted_at", null)
    .order("contract_date", { ascending: false })
    .limit(24);

  if (error) throw new Error(`Không thể tra cứu hợp đồng: ${error.message}`);

  const rows = ((data || []) as ContractLookupRow[])
    .filter((row) => {
      if (!searchTerm) return true;
      const customer = Array.isArray(row.customers) ? row.customers[0] : row.customers;
      const haystack = [
        row.contract_code || "",
        customer?.full_name || "",
        customer?.phone || "",
        row.status || "",
      ].join(" ");
      return scoreNormalizedMatch(searchTerm, haystack) > 0;
    })
    .slice(0, 5);

  if (rows.length === 0) {
    return {
      content: "Tôi chưa tìm thấy hợp đồng khớp với mô tả này. Bạn có thể gửi mã HĐ hoặc tên khách cụ thể hơn.",
      metadata: {
        provider: MOODIE_PROVIDER_LABEL,
        skill_id: "contract_lookup",
        skill_label: "Tra cứu hợp đồng",
        follow_ups: ["Tìm hợp đồng HD026", "Những hợp đồng còn chưa thanh toán"],
      },
    };
  }

  return {
    content: [
      "Kết quả hợp đồng phù hợp:",
      ...rows.map((row, index) => {
        const customer = Array.isArray(row.customers) ? row.customers[0] : row.customers;
        return [
          `${index + 1}. ${row.contract_code || row.id} - ${customer?.full_name || "Khách chưa rõ"}`,
          `   Trạng thái: ${row.status || "Chưa rõ"} | Ngày HĐ: ${formatDate(row.contract_date)} | Công việc: ${formatDate(row.work_date)}`,
          `   Giá trị: ${formatCurrency(row.total_amount)} | Đã thu: ${formatCurrency(row.paid_amount)} | Còn lại: ${formatCurrency(row.remaining_amount)}`,
        ].join("\n");
      }),
    ].join("\n"),
    metadata: {
      provider: MOODIE_PROVIDER_LABEL,
      skill_id: "contract_lookup",
      skill_label: "Tra cứu hợp đồng",
      sources: [{ label: "Kết quả", value: String(rows.length) }],
      follow_ups: ["Những hợp đồng nào còn phải thu?", "Lịch hôm nay có gì?"],
    },
  };
}

async function respondScheduleSummary(
  supabase: SupabaseClient,
  role: Role,
  prompt: string,
): Promise<EngineResult> {
  if (!canAccess(role, "calendar")) {
    return getPermissionDeniedResult(role, "schedule_summary");
  }

  const range = getScheduleRange(prompt);
  const { data, error } = await supabase
    .from("contract_events")
    .select("id, contract_id, title, event_type, event_date, start_time, location, status")
    .gte("event_date", range.start)
    .lte("event_date", range.end)
    .order("event_date", { ascending: true })
    .order("start_time", { ascending: true })
    .limit(12);

  if (error) throw new Error(`Không thể tải lịch: ${error.message}`);

  const events = (data || []) as EventRow[];
  const contractIds = Array.from(new Set(events.map((event) => event.contract_id).filter((id): id is string => Boolean(id))));
  const contractMap = new Map<string, { contract_code: string | null; customer_name: string | null }>();

  if (contractIds.length > 0) {
    const { data: contracts, error: contractError } = await supabase
      .from("contracts")
      .select("id, contract_code, customers(full_name)")
      .in("id", contractIds);

    if (contractError) throw new Error(`Không thể tải hợp đồng lịch: ${contractError.message}`);

    for (const contract of contracts || []) {
      const customerRaw = contract.customers;
      const customer = Array.isArray(customerRaw) ? customerRaw[0] : customerRaw;
      contractMap.set(contract.id, {
        contract_code: contract.contract_code || null,
        customer_name: customer?.full_name || null,
      });
    }
  }

  if (events.length === 0) {
    return {
      content: `Không có lịch nào trong ${range.label}.`,
      metadata: {
        provider: MOODIE_PROVIDER_LABEL,
        skill_id: "schedule_summary",
        skill_label: "Lịch sắp tới",
        sources: [{ label: "Khung thời gian", value: range.label }],
        follow_ups: ["Ngày mai ekip có lịch nào?", "Nhân sự đang hoạt động thế nào?"],
      },
    };
  }

  return {
    content: [
      `Lịch ${range.label}:`,
      ...events.slice(0, 6).map((event, index) => {
        const contract = event.contract_id ? contractMap.get(event.contract_id) : null;
        return `${index + 1}. ${formatDate(event.event_date)} ${formatShortTime(event.start_time)} - ${event.title || event.event_type || "Sự kiện"} (${contract?.contract_code || "Không mã"}, ${contract?.customer_name || "chưa rõ khách"})${event.location ? ` @ ${event.location}` : ""}`;
      }),
    ].join("\n"),
    metadata: {
      provider: MOODIE_PROVIDER_LABEL,
      skill_id: "schedule_summary",
      skill_label: "Lịch sắp tới",
      sources: [
        { label: "Khung thời gian", value: range.label },
        { label: "Sự kiện", value: String(events.length) },
      ],
      follow_ups: ["Ngày mai ekip có lịch nào?", "Tìm hợp đồng của khách Lan"],
    },
  };
}

async function respondTeamSummary(
  supabase: SupabaseClient,
  role: Role,
): Promise<EngineResult> {
  if (!canAccess(role, "employees")) {
    return getPermissionDeniedResult(role, "team_summary");
  }

  const today = getTodayInTimeZone();
  const [employeesResult, tasksResult] = await Promise.all([
    supabase
      .from("employees")
      .select("id, department, role, status")
      .eq("status", "active")
      .is("deleted_at", null),
    supabase
      .from("work_tasks")
      .select("id, deadline, status")
      .lt("deadline", today),
  ]);

  if (employeesResult.error) throw new Error(`Không thể tải nhân sự: ${employeesResult.error.message}`);
  if (tasksResult.error) throw new Error(`Không thể tải task nhân sự: ${tasksResult.error.message}`);

  const activeEmployees = employeesResult.data || [];
  const overdueTasks = (tasksResult.data || []).filter((task) => task.status !== "hoan_thanh" && task.status !== "da_huy");
  const departments = new Set(activeEmployees.map((employee) => employee.department).filter(Boolean));

  return {
    content: [
      "Tình hình nhân sự hiện tại:",
      `- Nhân sự active: ${activeEmployees.length}`,
      `- Phòng ban đang hoạt động: ${departments.size}`,
      `- Task quá hạn: ${overdueTasks.length}`,
      overdueTasks.length > 0
        ? "- Nên ưu tiên xử lý các task trễ để không kéo lùi tiến độ hậu kỳ."
        : "- Chưa thấy task quá hạn nổi bật trong hệ thống.",
    ].join("\n"),
    metadata: {
      provider: MOODIE_PROVIDER_LABEL,
      skill_id: "team_summary",
      skill_label: "Nhân sự & tiến độ",
      sources: [
        { label: "Nhân sự active", value: String(activeEmployees.length) },
        { label: "Task trễ", value: String(overdueTasks.length) },
      ],
      follow_ups: ["Lịch hôm nay có gì?", "Tóm tắt tài chính tháng này"],
    },
  };
}

async function respondGoalSummary(role: Role): Promise<EngineResult> {
  if (!canAccess(role, "finance")) {
    return getPermissionDeniedResult(role, "goal_summary");
  }

  const [goalsPage, cashflow] = await Promise.all([
    unwrap(
      await fetchGoals({
        page: 1,
        pageSize: 4,
        includeContributions: false,
      }),
    ),
    unwrap(await fetchGoalsCashflow()),
  ]);

  const goals = goalsPage.items
    .filter((goal) => (goal.status || "").toLowerCase() !== "cancelled")
    .slice(0, 4);
  const activeGoals = goals.filter((goal) => (goal.status || "").toLowerCase() === "active");
  const totalTarget = activeGoals.reduce((sum, goal) => sum + goal.target_amount, 0);
  const totalSaved = activeGoals.reduce((sum, goal) => sum + goal.current_amount, 0);
  const overallProgress = totalTarget > 0 ? Math.round((totalSaved / totalTarget) * 100) : 0;

  if (goals.length === 0) {
    return {
      content: [
        "Hiện chưa có mục tiêu tài chính nào được thiết lập trong hệ thống.",
        `- Dòng tiền ròng kỳ này: ${formatCurrency(cashflow.netCashflow)}`,
        `- Có thể dành cho mục tiêu: ${formatCurrency(cashflow.availableForGoals)}`,
      ].join("\n"),
      metadata: {
        provider: MOODIE_PROVIDER_LABEL,
        skill_id: "goal_summary",
        skill_label: "Mục tiêu tài chính",
        sources: [
          { label: "Kỳ hiện tại", value: cashflow.currentPeriod },
          { label: "Có thể dành cho mục tiêu", value: formatCurrency(cashflow.availableForGoals) },
        ],
        follow_ups: ["Tóm tắt tài chính tháng này", "Công nợ hiện tại thế nào?"],
        widgets: [
          {
            type: "kpi_cards",
            title: "Dòng tiền cho mục tiêu",
            items: [
              { label: "Kỳ hiện tại", value: cashflow.currentPeriod },
              {
                label: "Net cashflow",
                value: formatCurrency(cashflow.netCashflow),
                tone: cashflow.netCashflow >= 0 ? "positive" : "danger",
              },
              {
                label: "Có thể dành cho mục tiêu",
                value: formatCurrency(cashflow.availableForGoals),
                tone: "positive",
              },
            ],
          },
        ],
      },
    };
  }

  return {
    content: [
      `Mục tiêu tài chính hiện tại (${cashflow.currentPeriod}):`,
      `- Tiến độ tổng: ${formatPercent(overallProgress)}`,
      `- Có thể dành cho mục tiêu: ${formatCurrency(cashflow.availableForGoals)}`,
      ...goals.map((goal, index) => {
        const monthlyNeeded = goal.monthly_needed ? ` | Cần thêm ${formatCurrency(goal.monthly_needed)}/tháng` : "";
        return `${index + 1}. ${goal.name}: ${formatCurrency(goal.current_amount)}/${formatCurrency(goal.target_amount)} (${goal.progress_percent}%)${monthlyNeeded}`;
      }),
    ].join("\n"),
    metadata: {
      provider: MOODIE_PROVIDER_LABEL,
      skill_id: "goal_summary",
      skill_label: "Mục tiêu tài chính",
      sources: [
        { label: "Kỳ hiện tại", value: cashflow.currentPeriod },
        { label: "Tiến độ tổng", value: formatPercent(overallProgress) },
        { label: "Có thể dành cho mục tiêu", value: formatCurrency(cashflow.availableForGoals) },
      ],
      follow_ups: ["Tóm tắt tài chính tháng này", "Công nợ hiện tại thế nào?"],
      widgets: [
        {
          type: "kpi_cards",
          title: "Dòng tiền cho mục tiêu",
          items: [
            { label: "Kỳ hiện tại", value: cashflow.currentPeriod },
            {
              label: "Net cashflow",
              value: formatCurrency(cashflow.netCashflow),
              tone: cashflow.netCashflow >= 0 ? "positive" : "danger",
            },
            {
              label: "Có thể dành cho mục tiêu",
              value: formatCurrency(cashflow.availableForGoals),
              tone: "positive",
            },
            { label: "Tiến độ tổng", value: formatPercent(overallProgress) },
          ],
        },
        {
          type: "progress_bars",
          title: "Tiến độ mục tiêu",
          items: goals.map((goal) => ({
            label: goal.name,
            current: goal.current_amount,
            target: goal.target_amount,
            unit: "VND",
            hint: goal.monthly_needed ? `Cần ${formatCurrency(goal.monthly_needed)}/tháng` : undefined,
            tone:
              goal.progress_percent >= 100
                ? "positive"
                : goal.monthly_needed && cashflow.availableForGoals < goal.monthly_needed
                  ? "warning"
                  : "default",
          })),
        },
      ],
    },
  };
}

async function respondServiceCatalog(
  supabase: SupabaseClient,
  role: Role,
  prompt: string,
): Promise<EngineResult> {
  if (!canAccess(role, "services")) {
    return getPermissionDeniedResult(role, "service_catalog");
  }

  const searchTerm = extractSearchTerm(prompt);
  const { data, error } = await supabase
    .from("services")
    .select("id, service_code, name, service_type, selling_price, status")
    .eq("status", "active")
    .is("deleted_at", null)
    .order("updated_at", { ascending: false })
    .limit(40);

  if (error) throw new Error(`Không thể tải dịch vụ: ${error.message}`);

  const rows = ((data || []) as ServiceRow[])
    .filter((row) => {
      if (!searchTerm) return true;
      const haystack = `${row.name || ""} ${row.service_code || ""} ${row.service_type || ""}`;
      return scoreNormalizedMatch(searchTerm, haystack) > 0;
    })
    .slice(0, 6);

  if (rows.length === 0) {
    return {
      content: "Tôi chưa tìm thấy dịch vụ khớp với mô tả này. Bạn có thể nêu rõ tên gói hoặc nhóm dịch vụ cần xem.",
      metadata: {
        provider: MOODIE_PROVIDER_LABEL,
        skill_id: "service_catalog",
        skill_label: "Dịch vụ & bảng giá",
        follow_ups: ["Giá gói baby là bao nhiêu?", "Những dịch vụ đang active"],
      },
    };
  }

  return {
    content: [
      "Các dịch vụ phù hợp:",
      ...rows.map((row, index) => `${index + 1}. ${row.name || row.service_code || row.id} - ${formatCurrency(row.selling_price)} (${row.service_type || "khác"})`),
    ].join("\n"),
    metadata: {
      provider: MOODIE_PROVIDER_LABEL,
      skill_id: "service_catalog",
      skill_label: "Dịch vụ & bảng giá",
      sources: [{ label: "Dịch vụ", value: String(rows.length) }],
      follow_ups: ["Giá gói baby là bao nhiêu?", "Tóm tắt tài chính tháng này"],
    },
  };
}

function respondFallback(role: Role): EngineResult {
  return {
    content: [
      "Tôi chưa match được đúng nghiệp vụ cho câu hỏi này.",
      "",
      "Hiện Moodie đang làm tốt các nhóm việc sau:",
      ...getMoodieDefaultSuggestions(role).slice(0, 4).map((prompt) => `- ${prompt}`),
    ].join("\n"),
    metadata: {
      provider: MOODIE_PROVIDER_LABEL,
      skill_id: "fallback",
      skill_label: "Điều hướng yêu cầu",
      note: "fallback",
      follow_ups: getMoodieDefaultSuggestions(role).slice(0, 4),
    },
  };
}

export async function runMoodieCoreEngine(params: {
  supabase: SupabaseClient;
  role: Role;
  prompt: string;
}): Promise<EngineResult> {
  const skillId = detectSkill(params.prompt);

  switch (skillId) {
    case "financial_summary":
      return respondFinancialSummary(params.role, params.prompt);
    case "debt_summary":
      return respondDebtSummary(params.role);
    case "pending_collections":
      return respondPendingCollections(params.role);
    case "contract_lookup":
      return respondContractLookup(params.supabase, params.role, params.prompt);
    case "schedule_summary":
      return respondScheduleSummary(params.supabase, params.role, params.prompt);
    case "team_summary":
      return respondTeamSummary(params.supabase, params.role);
    case "goal_summary":
      return respondGoalSummary(params.role);
    case "service_catalog":
      return respondServiceCatalog(params.supabase, params.role, params.prompt);
    default:
      return respondFallback(params.role);
  }
}
