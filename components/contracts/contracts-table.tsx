"use client";

import { memo } from "react";
import { ChevronRight, FileText, CheckCircle, Calendar } from "lucide-react";
import { TableWrapper, THead, TBody, TH, TD, TR } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/ux-states";
import { ContractsTabletTable } from "./contracts-tablet-table";
import { TierSwitch } from "@/components/ui/tier-switch";
import { formatCurrency, formatDate, getInitials, CURRENCY_SYMBOL } from "@/lib/utils";
import { getServiceColor, getServiceBadgeColor } from "@/constants/service-colors";
import { Pagination } from "@/components/ui/pagination";
import {
  CONTRACT_STATUS_MAP,
  getServiceLabel,
  getStatusLabel,
} from "@/types/contract-constants";
import type { ContractChecklistSummary, ContractStatus, Contract } from "@/types/contract";
import MissingInfoBadge from "@/components/contracts/missing-info-badge";
import type { ContractChecklistForBadge } from "@/components/contracts/missing-info-badge";
import ProgressBadge, { getProgressInfo } from "@/components/contracts/progress-badge";
import { ContractMilestones } from "@/components/contracts/contract-milestones";

// ─── HELPERS ─────────────────────────────────────

function fmt(amount: number): string {
  return formatCurrency(amount) + " " + CURRENCY_SYMBOL;
}

function fmtDate(dateStr: string | null): string {
  if (!dateStr) return "---";
  return formatDate(dateStr);
}

function getAvatarColor(serviceType: string | null): string {
  const c = getServiceColor(serviceType);
  return `${c.bg} ${c.text}`;
}

function getStatusVariant(status: ContractStatus): "info" | "warning" | "success" | "error" {
  return CONTRACT_STATUS_MAP[status]?.variant || "info";
}

// Field lợi nhuận chỉ có mặt trong payload khi role đang xem có quyền "finance" (server
// xóa hẳn key nếu không đủ quyền — xem contract-queries.ts). Dùng sự có mặt của field
// để quyết định render cột, không cần truyền role riêng qua nhiều lớp component.
function hasFinancials(contracts: Contract[]): boolean {
  return contracts.length > 0 && contracts[0].profit !== undefined;
}

// ─── PROPS ────────────────────────────────────────

interface ContractsTableProps {
  contracts: Contract[];
  onView: (contract: Contract) => void;
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
  onHover?: (id: string) => void;
  onViewProfit?: (id: string) => void;
  // Pagination props
  page?: number;
  totalPages?: number;
  onPageChange?: (page: number) => void;
  total?: number;
  visibleStart?: number;
  visibleEnd?: number;
}

type ProgressTask = {
  id: string;
  work_type: string;
  status: string;
  deadline: string | null;
};

// ─── TYPE HELPERS (safe accessors for Record) ────

function getStr(obj: any, key: string): string {
  return (obj[key] as string) || "";
}

function getNum(obj: any, key: string): number {
  return Number(obj[key]) || 0;
}

function getArr(obj: any, key: string): any[] {
  const val = obj[key];
  return Array.isArray(val) ? val : [];
}

function getChecklistSummary(
  obj: any,
): ContractChecklistSummary | null {
  const value = obj.checklist_summary;
  if (!value || typeof value !== "object") return null;

  const summary = value as Record<string, unknown>;
  const total = Math.max(0, Number(summary.total) || 0);
  const done = Math.min(total, Math.max(0, Number(summary.done) || 0));
  return {
    total,
    done,
    missing: Math.max(0, total - done), // Force canonical missing instead of trusting RPC missing
  };
}

// ─── DESKTOP TABLE ───────────────────────────────

// #30a — bảng desktop tự co theo bề rộng KHUNG (container query, TableWrapper containerQuery):
//   < 880px: 6 cột (ẩn Sự kiện) · 880–1079: 7 cột · ≥ 1080: 8 cột (thêm Lợi nhuận).
//   Mọi cột đều có bề rộng cơ sở border-box: 228+100+132+136+136+132+44 = 908px ≤ 912px (khung 1280 sidebar mở); 8 cột = 1.044 < 1.080;
//   6 cột = 772 < 880. Màn rộng hơn → table-fixed chia phần dư THEO TỶ LỆ cho
//   mọi cột (pill w-full giãn theo, tiền căn phải, chip căn giữa) — không để một cột auto nuốt hết khoảng trống.
const CELL = "px-3 2xl:px-3";
const CELL_PILL = "px-2 2xl:px-2"; // pill có min-w-30 (120px) → cột 136 border-box vừa khít
const COL_EVENTS = "hidden @min-[880px]:table-cell";
const COL_PROFIT = "hidden @min-[1080px]:table-cell";
const NO_COST_TITLE = "Chưa ghi chi phí — lợi nhuận chưa xác định (bấm để xem/ghi chi phí)";

/** HĐ đã xong: pill MẢNH 1 dòng cùng bề rộng với pill đang chạy (cùng ngôn ngữ hình khối, hàng thấp hơn nhưng ô không "trống") */
function DoneMark({ done, total, label }: { done: number; total: number; label: string }) {
  if (total === 0) {
    return (
      <div className="flex w-full items-center justify-center rounded-md bg-bg-hover/60 px-2 py-1 text-tiny italic text-text-muted">
        Không có {label}
      </div>
    );
  }
  const allDone = done === total;
  return (
    <div
      className={`flex w-full items-center justify-between gap-2 rounded-md px-2 py-1 text-tiny font-semibold ${allDone ? "bg-success/10 text-success" : "bg-bg-hover text-text-secondary"}`}
      title={`${done}/${total} ${label} hoàn tất`}
    >
      <span className="inline-flex items-center gap-1 truncate">
        <CheckCircle className="size-3 shrink-0" />
        {allDone ? "Hoàn tất" : `Còn ${total - done} ${label}`}
      </span>
      <span className="shrink-0 tabular-nums">{done}/{total}</span>
    </div>
  );
}

const DesktopTableRow = memo(function DesktopTableRow({
  c,
  onView,
  onHover,
  onViewProfit,
  showFinancials,
}: {
  c: Contract;
  onView: (contract: Contract) => void;
  onHover?: (id: string) => void;
  onViewProfit?: (id: string) => void;
  showFinancials: boolean;
}) {
  const id = getStr(c, "id");
  const status = getStr(c, "status") as ContractStatus;
  const isCancelled = status === "da_huy";
  const customer = c.customers as any;
  const customerName = customer?.full_name || "Khách vãng lai";
  const serviceType = getStr(c, "service_type");
  const svcBadge = getServiceBadgeColor(serviceType);
  const profit = getNum(c, "profit");
  const totalCost = getNum(c, "total_cost");
  const contractCode = getStr(c, "contract_code");
  const workDate = getStr(c, "work_date");
  const checklist = getChecklistSummary(c);
  const remaining = getNum(c, "remaining_amount");
  // #30a đợt 2: HĐ đã xong/huỷ → pill co thành 1 dòng "✓ n/n"; chi phí = 0 → lợi nhuận chưa xác định
  const isClosed = status === "hoan_thanh" || isCancelled;
  const events = getArr(c, "contract_events").filter((e: any) => e?.status !== "da_huy");
  const eventsDone = events.filter((e: any) => e?.status === "hoan_thanh").length;
  const progress = getProgressInfo(getArr(c, "work_tasks") as ProgressTask[]);

  return (
    <TR
      onClick={() => onView(c)}
      onMouseEnter={() => onHover?.(id)}
      onPointerDown={() => onHover?.(id)}
      className={isCancelled ? "opacity-50" : ""}
    >
      {/* 1. Khách hàng — tên là danh tính; mã HĐ lùi xuống dòng phụ (#30a) */}
      <TD className={CELL}>
        <div className="flex min-w-0 items-center gap-2">
          <div className={`size-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${getAvatarColor(serviceType)}`}>
            {getInitials(customerName)}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex min-w-0 items-center gap-2">
              <span
                className={`truncate font-semibold text-text-main group-hover:underline underline-offset-4 decoration-primary/30 ${isCancelled ? "line-through" : ""}`}
                title={customerName}
              >
                {customerName}
              </span>
              <span className={`text-tiny px-1.5 py-0.5 rounded-md shrink-0 ${svcBadge.bg} ${svcBadge.text}`}>
                {getServiceLabel(serviceType as import("@/types/contract").ServiceType)}
              </span>
            </div>
            <div className="mt-0.5 flex min-w-0 items-center gap-2">
              <span className="truncate text-tiny tabular-nums text-text-muted" title={contractCode}>
                {contractCode}
              </span>
              {checklist && checklist.missing > 0 && (
                <MissingInfoBadge
                  summary={checklist}
                  items={getArr(c, "contract_checklists") as unknown as ContractChecklistForBadge[]}
                />
              )}
            </div>
          </div>
        </div>
      </TD>
      {/* 2. Ngày chụp — mốc vận hành (C0); chưa có ngày chụp → ngày ký, đánh dấu "ký" */}
      <TD className={`${CELL} text-text-secondary tabular-nums`}>
        {workDate ? (
          fmtDate(workDate)
        ) : (
          <span className="text-text-muted" title="Chưa có ngày chụp — hiện ngày ký">
            <span className="text-tiny">ký </span>
            {fmtDate(getStr(c, "contract_date") || null)}
          </span>
        )}
      </TD>
      {/* 3. Trạng thái — luôn nằm trong khung; badge cỡ tiny như bảng tablet để "ĐANG THỰC HIỆN" nằm gọn 136px */}
      <TD className={`${CELL} text-center [&_.badge]:px-2 [&_.badge]:py-1 [&_.badge]:text-tiny`}>
        <Badge variant={getStatusVariant(status)} dot>
          {getStatusLabel(status)}
        </Badge>
      </TD>
      {/* 4. Sự kiện — ẩn khi khung bảng < 880px (mốc vẫn xem trong drawer) */}
      <TD className={`${CELL_PILL} ${COL_EVENTS}`}>
        {isClosed ? (
          <DoneMark done={eventsDone} total={events.length} label="mốc" />
        ) : (
          <ContractMilestones contract={c} compact />
        )}
      </TD>
      {/* 5. Tiến độ */}
      <TD className={CELL_PILL}>
        {isClosed ? (
          <DoneMark done={progress?.completed ?? 0} total={progress?.total ?? 0} label="việc" />
        ) : (
          <ProgressBadge tasks={getArr(c, "work_tasks") as ProgressTask[]} />
        )}
      </TD>
      {/* 6. Còn nợ / Tổng — gộp như bảng tablet */}
      <TD className={`${CELL} text-right`}>
        {remaining > 0 ? (
          <div className="font-semibold text-error">{fmt(remaining)}</div>
        ) : (
          <Badge variant="success">Đủ</Badge>
        )}
        <div className="mt-0.5 text-tiny text-text-muted tabular-nums">Tổng {fmt(getNum(c, "total_amount"))}</div>
      </TD>
      {/* 7. Lợi nhuận — chỉ khi có quyền finance và khung bảng ≥ 1080px */}
      {showFinancials && (
        <TD
          className={`${CELL} ${COL_PROFIT} text-right`}
          onClick={(e) => {
            e.stopPropagation();
            onViewProfit?.(id);
          }}
        >
          {totalCost === 0 ? (
            <div className="cursor-pointer text-tiny leading-tight text-text-muted" title={NO_COST_TITLE}>
              — chưa ghi<br />chi phí
            </div>
          ) : (
            <div className="cursor-pointer">
              <div className="text-xs text-text-muted">Chi phí {fmt(totalCost)}</div>
              <div className={`font-semibold ${profit >= 0 ? "text-success" : "text-error"}`}>
                {profit >= 0 ? "+" : ""}
                {fmt(profit)}
              </div>
            </div>
          )}
        </TD>
      )}
      {/* 8. Mở chi tiết */}
      <TD className={`${CELL} text-right`}>
        <div className="h-8 w-8 inline-flex items-center justify-center rounded-md shadow-xs bg-bg-card text-text-secondary group-hover:bg-primary group-hover:text-white group-hover:shadow-sm transition-all">
          <ChevronRight className="w-4 h-4" />
        </div>
      </TD>
    </TR>
  );
}, (prev, next) =>
  prev.c.id === next.c.id &&
  prev.c.status === next.c.status &&
  prev.c.total_amount === next.c.total_amount &&
  prev.c.remaining_amount === next.c.remaining_amount &&
  prev.c.paid_amount === next.c.paid_amount &&
  prev.c.contract_code === next.c.contract_code &&
  prev.c.contract_date === next.c.contract_date &&
  prev.c.service_type === next.c.service_type &&
  prev.c.customers?.full_name === next.c.customers?.full_name &&
  prev.c.profit === next.c.profit &&
  prev.c.total_cost === next.c.total_cost &&
  prev.showFinancials === next.showFinancials &&
  JSON.stringify(prev.c.checklist_summary) === JSON.stringify(next.c.checklist_summary) &&
  JSON.stringify(prev.c.contract_checklists) === JSON.stringify(next.c.contract_checklists) &&
  JSON.stringify(prev.c.contract_events) === JSON.stringify(next.c.contract_events) &&
  prev.c.work_date === next.c.work_date &&
  (prev.c.customers as { wedding_date?: string | null } | null)?.wedding_date === (next.c.customers as { wedding_date?: string | null } | null)?.wedding_date
);

const DesktopTable = memo(function DesktopTable({
  contracts,
  onView,
  onHover,
  onViewProfit,
  page,
  totalPages,
  onPageChange,
  total,
  visibleStart,
  visibleEnd,
}: ContractsTableProps) {
  const showFinancials = hasFinancials(contracts);
  return (
    // Tablet (md, 768+): hiện bảng dạng block (page tự cuộn). Desktop (lg): flex-fill + sticky scroll.
    <div className="lg:flex lg:flex-col lg:flex-1 lg:min-h-0">
      <TableWrapper
        // flex-initial (thay flex-1 mặc định): card cao theo NỘI DUNG — hàng ít thì footer
        // ôm sát hàng cuối, không ghim đáy viewport để lại khoảng trống; hàng nhiều vẫn
        // bị cap bởi parent (min-h-0) → cuộn trong bảng như cũ.
        containerClassName="lg:flex-initial"
        className="table-fixed"
        showScrollbar
        containerQuery
        footer={
          totalPages !== undefined && totalPages > 1 && onPageChange ? (
            <div className="bg-bg-card border-t border-border px-5 py-3.5 flex items-center justify-between shrink-0">
              <p className="text-xs text-text-muted md:text-sm italic">
                <span className="font-semibold italic text-primary">{visibleStart}-{visibleEnd}</span>
                <span className="text-text-muted"> / {total} hợp đồng</span>
              </p>
              <Pagination
                page={page || 1}
                totalPages={totalPages}
                onChange={onPageChange}
                compact
                variant="footer"
              />
            </div>
          ) : null
        }
      >
        <THead>
          <tr>
            <TH className={`${CELL} w-[228px]`}>Khách hàng</TH>
            <TH className={`${CELL} w-[100px]`}>Ngày chụp</TH>
            <TH className={`${CELL} w-[132px] text-center`}>Trạng thái</TH>
            <TH className={`${CELL_PILL} w-[136px] ${COL_EVENTS}`}>Sự kiện</TH>
            <TH className={`${CELL_PILL} w-[136px]`}>Tiến độ</TH>
            <TH className={`${CELL} w-[132px] text-right`}>Còn nợ</TH>
            {showFinancials && <TH className={`${CELL} w-[136px] ${COL_PROFIT} text-right`}>Lợi nhuận</TH>}
            <TH className={`${CELL} w-11`} aria-label="Mở chi tiết" />
          </tr>
        </THead>
        <TBody>
          {contracts.map((c) => (
            <DesktopTableRow
              key={getStr(c, "id")}
              c={c}
              onView={onView}
              onHover={onHover}
              onViewProfit={onViewProfit}
              showFinancials={showFinancials}
            />
          ))}
        </TBody>
      </TableWrapper>
    </div>
  );
});

// ─── MOBILE CARD LIST ────────────────────────────

const MobileCardRow = memo(function MobileCardRow({
  c,
  index: i,
  onView,
  onHover,
  onViewProfit,
}: {
  c: Contract;
  index: number;
  onView: (contract: Contract) => void;
  onHover?: (id: string) => void;
  onViewProfit?: (id: string) => void;
}) {
  const id = getStr(c, "id");
  const status = getStr(c, "status") as ContractStatus;
  const isCancelled = status === "da_huy";
  const total = getNum(c, "total_amount");
  const paid = getNum(c, "paid_amount");
  const debt = getNum(c, "remaining_amount");
  const paidPct = total > 0 ? Math.min(100, Math.round((paid / total) * 100)) : 0;
  const isFullyPaid = debt === 0 && total > 0;
  const customer = c.customers as any;
  const customerName = customer?.full_name || "Khách vãng lai";
  const serviceType = getStr(c, "service_type");
  const svc = getServiceBadgeColor(serviceType);
  const showProfit = c.profit !== undefined;
  const profit = getNum(c, "profit");

  return (
    <Button unstyled
      onClick={() => onView(c)}
      onPointerEnter={() => onHover?.(id)}
      onPointerDown={() => onHover?.(id)}
      onFocus={() => onHover?.(id)}
      className={`card-base p-4 text-left transition-all active:scale-[0.99] entrance entrance-${Math.min(i + 1, 5)} ${isCancelled ? "opacity-50" : ""}`}
    >
      {/* Row 1: Mã HĐ + Status badge */}
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs text-text-muted">
          {getStr(c, "contract_code")}
        </span>
        <Badge variant={getStatusVariant(status)} className="text-tiny">
          {getStatusLabel(status)}
        </Badge>
      </div>

      {/* Row 2: Tên khách hàng */}
      <h3 className={`text-sm font-bold text-text-main mb-1.5 truncate ${isCancelled ? "line-through" : ""}`}>
        {customerName}
      </h3>

      {/* Row 3: Service badge + Date */}
      <div className="flex items-center gap-2 mb-3">
        <span className={`text-tiny px-2 py-0.5 rounded-md ${svc.bg} ${svc.text}`}>
          {getServiceLabel(serviceType as import("@/types/contract").ServiceType)}
        </span>
        <span className="flex items-center gap-1 text-xs text-text-muted">
          <Calendar className="w-3 h-3" />
          {fmtDate(getStr(c, "work_date") || getStr(c, "contract_date") || null)}
        </span>
      </div>

      {/* Row 3.5: Operational milestones */}
      <ContractMilestones contract={c} className="mb-3 rounded-lg bg-bg-subtle/70 p-2.5" />

      {/* Row 3.75: Task Progress */}
      <div className="mb-3">
        <ProgressBadge tasks={getArr(c, "work_tasks") as ProgressTask[]} />
      </div>

      {/* Row 4: Tổng tiền + Payment info */}
      <div className="flex items-baseline justify-between mb-2">
        <p className="text-sm font-semibold text-text-main">{fmt(total)}</p>
        {isFullyPaid ? (
          <span className="flex items-center gap-1 text-tiny text-success font-medium">
            <CheckCircle className="w-3 h-3" />
            Đã thanh toán
          </span>
        ) : paid > 0 ? (
          <span className="text-tiny text-text-secondary">
            Đã thu: {fmt(paid)}
          </span>
        ) : (
          <span className="text-tiny text-text-muted">Chưa thu</span>
        )}
      </div>

      {/* Row 4.5: Lợi nhuận (chỉ role có quyền finance) — bấm mở breakdown chi phí.
          Dùng div (không phải <button>) vì card cha đã là <button> — HTML không cho
          lồng button trong button. */}
      {showProfit && (
        <div
          onClick={(e) => {
            e.stopPropagation();
            onViewProfit?.(id);
          }}
          className="mb-2 flex cursor-pointer items-center justify-between text-tiny"
        >
          <span className="text-text-muted">Lợi nhuận</span>
          {getNum(c, "total_cost") === 0 ? (
            <span className="text-text-muted" title={NO_COST_TITLE}>— chưa ghi chi phí</span>
          ) : (
            <span className={`font-semibold ${profit >= 0 ? "text-success" : "text-error"}`}>
              {profit >= 0 ? "+" : ""}
              {fmt(profit)}
            </span>
          )}
        </div>
      )}

      {/* Row 5: Payment progress bar */}
      <div className="h-1 rounded-full bg-border/30 overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${isFullyPaid ? "bg-success" : "bg-primary"}`}
          style={{ width: `${paidPct}%` }}
        />
      </div>
    </Button>
  );
}, (prev, next) =>
  prev.c.id === next.c.id &&
  prev.c.status === next.c.status &&
  prev.c.total_amount === next.c.total_amount &&
  prev.c.remaining_amount === next.c.remaining_amount &&
  prev.c.paid_amount === next.c.paid_amount &&
  prev.c.contract_code === next.c.contract_code &&
  prev.c.contract_date === next.c.contract_date &&
  prev.c.service_type === next.c.service_type &&
  prev.c.customers?.full_name === next.c.customers?.full_name &&
  prev.c.profit === next.c.profit &&
  JSON.stringify(prev.c.checklist_summary) === JSON.stringify(next.c.checklist_summary) &&
  JSON.stringify(prev.c.contract_checklists) === JSON.stringify(next.c.contract_checklists) &&
  JSON.stringify(prev.c.contract_events) === JSON.stringify(next.c.contract_events) &&
  prev.c.work_date === next.c.work_date &&
  (prev.c.customers as { wedding_date?: string | null } | null)?.wedding_date === (next.c.customers as { wedding_date?: string | null } | null)?.wedding_date
);

const MobileCardList = memo(function MobileCardList({ contracts, onView, onHover, onViewProfit }: ContractsTableProps) {
  return (
    <div className="flex flex-col gap-3 pt-1">
      {contracts.map((c, i) => (
        <MobileCardRow key={getStr(c, "id")} c={c} index={i} onView={onView} onHover={onHover} onViewProfit={onViewProfit} />
      ))}
    </div>
  );
});

// ─── MAIN EXPORT ─────────────────────────────────

export const ContractsTable = memo(function ContractsTable(props: ContractsTableProps) {
  if (props.contracts.length === 0) return (
    <EmptyState
      icon={FileText}
      title="Chưa có hợp đồng"
      description="Chưa ghi nhận hợp đồng nào phù hợp với bộ lọc hiện tại."
    />
  );
  return (
    <TierSwitch
      phone={<MobileCardList {...props} />}
      tablet={<ContractsTabletTable {...props} />}
      desktop={<DesktopTable {...props} />}
      desktopAt="xl"
    />
  );
});
