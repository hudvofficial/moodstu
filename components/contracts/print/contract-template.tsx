/**
 * 📄 Contract Print Template — A5 Layout
 * Phase 02C: V1 template adapted for V2
 * Uses: V2 types, service_type enum, shared constants
 * NO client Supabase — all data passed as props from server
 */

import type {
  Contract,
  ContractItem,
  PaymentPlan,
  StudioInfo,
} from "@/types/contract";
import type { Customer } from "@/types/crm";

const PRINT_FONT_FAMILY = "var(--font-sans)";
const PRINT_BODY_SIZE = "calc(var(--font-size-micro) + 0.5px)";
const PRINT_TABLE_SIZE = "var(--font-size-micro)";
const PRINT_NOTE_SIZE = "calc(var(--font-size-micro) - 1px)";
const PRINT_META_SIZE = "calc(var(--font-size-micro) - 1.5px)";
const PRINT_RADIUS = "calc(var(--radius-md) / 2)";

interface PrintPaymentScheduleRow {
  id: string;
  label: string;
  amount: number;
  dueDate: string | null;
  status: string | null;
}

// ═══════════════════════════════════════════
// Shared format helpers (print-specific)
// ═══════════════════════════════════════════

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("vi-VN").format(amount);
}

function formatDate(date: string | null): string {
  if (!date) return "___/___/______";
  return new Date(date).toLocaleDateString("vi-VN");
}

function getPaymentScheduleRows(
  paymentPlans: PaymentPlan[],
  contract: Contract,
): PrintPaymentScheduleRow[] {
  const planRows = paymentPlans
    .filter((plan) => plan.status !== "cancelled")
    .map((plan) => ({
      id: plan.id,
      label: plan.stage_name || "Đợt thanh toán",
      amount: Number(plan.amount) || 0,
      dueDate: plan.due_date,
      status: plan.status,
      createdAt: plan.created_at,
    }))
    .sort((a, b) => {
      const dueA = a.dueDate
        ? new Date(a.dueDate).getTime()
        : Number.MAX_SAFE_INTEGER;
      const dueB = b.dueDate
        ? new Date(b.dueDate).getTime()
        : Number.MAX_SAFE_INTEGER;
      if (dueA !== dueB) return dueA - dueB;
      return String(a.createdAt || "").localeCompare(String(b.createdAt || ""));
    })
    .map((row) => ({
      id: row.id,
      label: row.label,
      amount: row.amount,
      dueDate: row.dueDate,
      status: row.status,
    }));

  if (planRows.length > 0) return planRows;

  const remaining = Number(contract.remaining_amount) || 0;
  if (remaining <= 0) return [];

  return [
    {
      id: "remaining-balance",
      label: "Thanh toán còn lại",
      amount: remaining,
      dueDate:
        contract.delivery_date ||
        contract.work_date ||
        contract.contract_date ||
        null,
      status: "pending",
    },
  ];
}

// ═══════════════════════════════════════════
// Props
// ═══════════════════════════════════════════

interface ContractTemplateProps {
  contract: Contract;
  customer: Customer;
  items: ContractItem[];
  paymentPlans: PaymentPlan[];
  studio: StudioInfo;
  logoUrl?: string;
  templateId?: string;
}

// ═══════════════════════════════════════════
// Template Component (Pure — no hooks, no state)
// ═══════════════════════════════════════════

export default function ContractTemplate({
  contract,
  customer,
  items,
  paymentPlans,
  studio,
  logoUrl,
  templateId,
}: ContractTemplateProps) {
  const isWedding = contract.service_type === "ngay_cuoi";

  // Financial calculations
  const subtotal = items.reduce((sum, item) => sum + item.total_amount, 0);
  const discount = contract.discount_amount || 0;
  const total = contract.total_amount;
  const paid = contract.paid_amount;
  const remaining = contract.remaining_amount;
  const paymentScheduleRows = getPaymentScheduleRows(paymentPlans, contract);

  return (
    <div
      id={templateId}
      className="print-template"
      style={{
        width: "148mm",
        minHeight: "195mm",
        padding: "7mm 8mm",
        boxSizing: "border-box",
        fontFamily: PRINT_FONT_FAMILY,
        fontSize: PRINT_BODY_SIZE,
        lineHeight: "1.42",
        color: "var(--color-text-primary)",
        background: "var(--color-bg-card)",
      }}
    >
      {/* ── HEADER ── */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: "5mm",
          borderBottom: "1.5px solid var(--color-primary)",
          paddingBottom: "2.5mm",
          marginBottom: "4mm",
          minHeight: "13mm",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "2.5mm",
            minWidth: 0,
          }}
        >
          <div
            style={{
              flex: "0 0 22mm",
              height: "12mm",
              display: "flex",
              alignItems: "center",
            }}
          >
            {logoUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={logoUrl}
                alt={studio.name}
                crossOrigin="anonymous"
                style={{ width: "19mm", height: "12mm", objectFit: "contain" }}
              />
            )}
          </div>
          <div
            style={{
              width: "1px",
              height: "10mm",
              background: "var(--color-border)",
              flex: "0 0 auto",
            }}
          />
          <div style={{ minWidth: 0 }}>
            <div
              style={{
                fontSize: "var(--font-size-tiny)",
                fontWeight: 800,
                color: "var(--color-primary)",
                lineHeight: 1.2,
              }}
            >
              {studio.name}
            </div>
            <div
              style={{
                fontSize: PRINT_META_SIZE,
                color: "var(--color-text-muted)",
                lineHeight: 1.35,
                whiteSpace: "nowrap",
              }}
            >
              ĐC: {studio.address || "___________"}
            </div>
            <div
              style={{
                fontSize: PRINT_META_SIZE,
                color: "var(--color-text-muted)",
                lineHeight: 1.35,
                whiteSpace: "nowrap",
              }}
            >
              Hotline: {studio.hotline || "___________"}
            </div>
          </div>
        </div>

        <div style={{ flex: "0 0 auto", textAlign: "right", lineHeight: 1.25 }}>
          <div
            style={{
              fontSize: "var(--font-size-label)",
              fontWeight: 800,
              color: "var(--color-primary)",
              letterSpacing: "0.8px",
            }}
          >
            Hợp đồng dịch vụ
          </div>
          <div
            style={{
              fontSize: PRINT_NOTE_SIZE,
              fontWeight: 700,
              color: "var(--color-primary)",
            }}
          >
            Số: {contract.contract_code}
          </div>
          <div
            style={{
              fontSize: PRINT_NOTE_SIZE,
              fontWeight: 700,
              color: "var(--color-text-secondary)",
            }}
          >
            Ngày: {formatDate(contract.contract_date)}
          </div>
        </div>
      </div>

      {/* ── CUSTOMER INFO ── */}
      <div
        style={{
          border: "1px solid var(--color-border)",
          borderRadius: PRINT_RADIUS,
          padding: "2.6mm 3mm 3mm",
          marginBottom: "3.5mm",
          background: "var(--color-bg-card)",
        }}
      >
        <SectionTitle>Thông tin khách hàng</SectionTitle>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            columnGap: "7mm",
            rowGap: "1.7mm",
            fontSize: PRINT_TABLE_SIZE,
          }}
        >
          <InfoField label="Khách" value={customer.full_name} bold />
          <InfoField label="SĐT" value={customer.phone || "..."} bold />
          <InfoField
            label="Địa chỉ"
            value={customer.address || "Chưa cập nhật"}
            italic
            span={2}
          />
          {isWedding && (
            <>
              <InfoField
                label="Ngày cưới"
                value={formatDate(customer.wedding_date || null)}
              />
              <InfoField
                label="Ghi chú"
                value={contract.notes || "..."}
                allowWrap
              />
            </>
          )}
        </div>
      </div>

      {/* ── SERVICES TABLE ── */}
      <SectionTitle>Chi tiết dịch vụ</SectionTitle>
      <table
        style={{
          width: "100%",
          borderCollapse: "collapse",
          tableLayout: "fixed",
          marginBottom: "2mm",
          fontSize: PRINT_TABLE_SIZE,
        }}
      >
        <thead>
          <tr
            style={{
              background: "var(--color-primary)",
              color: "var(--color-text-inverse)",
            }}
          >
            <Th width="8%" radius="left">
              STT
            </Th>
            <Th width="42%" align="left">
              Dịch vụ / Sản phẩm
            </Th>
            <Th width="10%">SL</Th>
            <Th width="20%">Đơn giá</Th>
            <Th width="20%" radius="right">
              Thành tiền
            </Th>
          </tr>
        </thead>
        <tbody
          style={{
            borderLeft: "1px solid var(--color-border)",
            borderRight: "1px solid var(--color-border)",
            borderBottom: "1px solid var(--color-border)",
          }}
        >
          {items.map((item, i) => (
            <tr key={item.id}>
              <Td align="center">{i + 1}</Td>
              <Td align="left" strong>
                {item.item_name}
                {item.is_addon && (
                  <span
                    style={{
                      color: "var(--color-text-muted)",
                      fontSize: PRINT_META_SIZE,
                      fontWeight: 500,
                    }}
                  >
                    {" "}
                    (phát sinh)
                  </span>
                )}
              </Td>
              <Td align="center">{item.quantity}</Td>
              <Td align="right" muted>
                {formatCurrency(item.unit_price)}
              </Td>
              <Td align="right" strong>
                {formatCurrency(item.total_amount)}
              </Td>
            </tr>
          ))}
        </tbody>
      </table>
      <FinancialSummary
        subtotal={subtotal}
        discount={discount}
        total={total}
        paid={paid}
        remaining={remaining}
      />

      {/* ── PAYMENT SCHEDULE ── */}
      {paymentScheduleRows.length > 0 && (
        <div style={{ marginBottom: "3mm" }}>
          <SectionTitle>Lộ trình thanh toán</SectionTitle>
          <div style={{ borderRadius: PRINT_RADIUS, overflow: "hidden" }}>
            <table
              style={{
                width: "100%",
                borderCollapse: "collapse",
                tableLayout: "fixed",
                fontSize: PRINT_TABLE_SIZE,
              }}
            >
              <tbody>
                {paymentScheduleRows.map((row) => (
                  <PaymentScheduleRow key={row.id} row={row} />
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── SIGNATURES ── */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: "8mm",
          textAlign: "center",
          marginTop: "4mm",
          marginBottom: "3mm",
        }}
      >
        <div>
          <div style={{ fontWeight: 600, fontSize: "var(--font-size-tiny)" }}>
            Khách hàng
          </div>
          <div
            style={{
              fontSize: PRINT_META_SIZE,
              color: "var(--color-text-muted)",
              marginTop: "2px",
            }}
          >
            (Ký và ghi rõ họ tên)
          </div>
          <div style={{ height: "15mm" }} />
        </div>
        <div>
          <div style={{ fontWeight: 600, fontSize: "var(--font-size-tiny)" }}>
            Đại diện Studio
          </div>
          <div
            style={{
              fontSize: PRINT_META_SIZE,
              color: "var(--color-text-muted)",
              marginTop: "2px",
            }}
          >
            (Ký và đóng dấu)
          </div>
          <div style={{ height: "15mm" }} />
        </div>
      </div>

      {/* ── NOTES ── */}
      <div
        style={{
          fontSize: PRINT_NOTE_SIZE,
          color: "var(--color-text-secondary)",
          border: "1px dashed var(--color-border)",
          borderRadius: "var(--radius-md)",
          padding: "2.5mm 3.5mm",
          lineHeight: 1.35,
        }}
      >
        <div
          style={{
            fontWeight: 700,
            marginBottom: "1.5mm",
            color: "var(--color-primary)",
          }}
        >
          * Lưu ý:
        </div>
        <ul
          style={{
            margin: 0,
            paddingLeft: "12px",
            display: "grid",
            gap: "1px",
          }}
        >
          <li>
            Quý khách xem kỹ trước khi ký vào hợp đồng. Hợp đồng đã ký vui lòng
            không đổi trả với bất kỳ lý do nào, hủy bỏ hợp đồng sẽ mất toàn bộ
            số tiền đặt cọc.
          </li>
          <li>
            Khách thuê đồ và trả đồ trong vòng 3 ngày. Tuyệt đối không để dính
            rượu vang, xăng, dầu mỡ... nếu có phải bồi thường theo giá trị hàng
            hóa.
          </li>
          <li>
            Tuyệt đối không tự ý giặt đồ thuê dưới mọi hình thức để tránh làm
            hỏng chất liệu sản phẩm.
          </li>
        </ul>
      </div>

      {/* ── FOOTER ── */}
      <div
        style={{
          textAlign: "center",
          fontSize: PRINT_META_SIZE,
          color: "var(--color-text-muted)",
          marginTop: "3mm",
          borderTop: "1px dashed var(--color-border)",
          paddingTop: "1.5mm",
        }}
      >
        {studio.name} — Cảm ơn quý khách!
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════
// Sub-components (print-only, inline style OK for print)
// ═══════════════════════════════════════════

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: "2mm",
        marginBottom: "1.5mm",
      }}
    >
      <span
        style={{
          width: "1mm",
          height: "3.4mm",
          borderRadius: "999px",
          background: "var(--color-primary)",
          flex: "0 0 auto",
        }}
      />
      <span
        style={{
          fontSize: "var(--font-size-tiny)",
          fontWeight: 800,
          color: "var(--color-primary)",
          whiteSpace: "nowrap",
        }}
      >
        {children}
      </span>
      <span
        style={{
          flex: 1,
          borderTop: "1px solid var(--color-border)",
        }}
      />
    </div>
  );
}

function InfoField({
  label,
  value,
  bold,
  italic,
  span,
  allowWrap,
}: {
  label: string;
  value: string;
  bold?: boolean;
  italic?: boolean;
  span?: number;
  allowWrap?: boolean;
}) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: allowWrap ? "flex-start" : "center",
        gap: "2mm",
        borderBottom: "1px solid var(--color-border-light)",
        paddingBottom: "0.6mm",
        gridColumn: span ? `span ${span}` : undefined,
        minWidth: 0,
        minHeight: "4mm",
      }}
    >
      <span
        style={{
          flex: "0 0 18mm",
          fontSize: PRINT_META_SIZE,
          fontWeight: 800,
          color: "var(--color-text-secondary)",
          textTransform: "uppercase",
          whiteSpace: "nowrap",
          letterSpacing: "0.2px",
        }}
      >
        {label}:
      </span>
      <span
        style={{
          minWidth: 0,
          overflow: allowWrap ? "visible" : "hidden",
          textOverflow: allowWrap ? undefined : "ellipsis",
          whiteSpace: allowWrap ? "normal" : "nowrap",
          fontWeight: bold ? 700 : 500,
          fontStyle: italic ? "italic" : undefined,
          color: "var(--color-text-primary)",
          lineHeight: 1.25,
        }}
      >
        {value}
      </span>
    </div>
  );
}

function PaymentScheduleRow({ row }: { row: PrintPaymentScheduleRow }) {
  const isPaid = row.status === "paid";

  return (
    <tr>
      <td
        style={{
          width: "55%",
          padding: "1.7mm 2mm",
          borderBottom: "1px solid var(--color-border)",
        }}
      >
        <span
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "1.8mm",
            fontWeight: 600,
            color: isPaid
              ? "var(--color-text-muted)"
              : "var(--color-text-primary)",
          }}
        >
          <span
            style={{
              width: "1.5mm",
              height: "1.5mm",
              borderRadius: "50%",
              background: isPaid
                ? "var(--color-success)"
                : "var(--color-primary)",
              flex: "0 0 auto",
            }}
          />
          {row.label}
        </span>
      </td>
      <td
        style={{
          width: "20%",
          padding: "1.7mm 2mm",
          textAlign: "center",
          color: "var(--color-text-muted)",
          borderBottom: "1px solid var(--color-border)",
        }}
      >
        {formatDate(row.dueDate)}
      </td>
      <td
        style={{
          width: "25%",
          padding: "1.7mm 2mm",
          textAlign: "right",
          fontWeight: 800,
          color: isPaid ? "var(--color-success)" : "var(--color-primary)",
          borderBottom: "1px solid var(--color-border)",
        }}
      >
        {formatCurrency(row.amount)}
      </td>
    </tr>
  );
}

function Th({
  children,
  width,
  align = "center",
  radius,
}: {
  children: React.ReactNode;
  width: string;
  align?: string;
  radius?: "left" | "right";
}) {
  return (
    <th
      style={{
        width,
        padding: "2mm 2mm",
        textAlign: align as React.CSSProperties["textAlign"],
        fontSize: PRINT_NOTE_SIZE,
        fontWeight: 800,
        textTransform: "uppercase",
        letterSpacing: "0.4px",
        borderTopLeftRadius: radius === "left" ? PRINT_RADIUS : undefined,
        borderTopRightRadius: radius === "right" ? PRINT_RADIUS : undefined,
      }}
    >
      {children}
    </th>
  );
}

function Td({
  children,
  align = "center",
  muted,
  strong,
}: {
  children: React.ReactNode;
  align?: string;
  muted?: boolean;
  strong?: boolean;
}) {
  return (
    <td
      style={{
        padding: "1.5mm 2mm",
        textAlign: align as React.CSSProperties["textAlign"],
        borderBottom: "1px solid var(--color-border)",
        color: muted
          ? "var(--color-text-secondary)"
          : "var(--color-text-primary)",
        fontWeight: strong ? 700 : 500,
      }}
    >
      {children}
    </td>
  );
}

function FinancialSummary({
  subtotal,
  discount,
  total,
  paid,
  remaining,
}: {
  subtotal: number;
  discount: number;
  total: number;
  paid: number;
  remaining: number;
}) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "flex-end",
        margin: "-0.4mm 0 3.2mm",
      }}
    >
      <div
        style={{
          width: "49mm",
          fontSize: PRINT_TABLE_SIZE,
        }}
      >
        <SummaryLine label="Tạm tính" amount={subtotal} />
        {discount > 0 && (
          <SummaryLine
            label="Giảm giá"
            amount={-discount}
            color="var(--color-error)"
          />
        )}
        <SummaryLine label="Tổng thanh toán" amount={total} tone="primary" />
        <SummaryLine
          label="Đã thanh toán"
          amount={paid}
          color="var(--color-success)"
        />
        <SummaryLine
          label="Còn lại"
          amount={remaining}
          tone="danger"
          color="var(--color-error)"
        />
      </div>
    </div>
  );
}

function SummaryLine({
  label,
  amount,
  color,
  tone = "default",
}: {
  label: string;
  amount: number;
  color?: string;
  tone?: "default" | "primary" | "danger";
}) {
  const isEmphasis = tone !== "default";
  const valueColor =
    color ||
    (tone === "primary" ? "var(--color-primary)" : "var(--color-text-primary)");
  const labelColor =
    tone === "danger"
      ? "var(--color-error)"
      : isEmphasis
        ? "var(--color-text-primary)"
        : "var(--color-text-secondary)";

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "1fr 23mm",
        alignItems: "baseline",
        columnGap: "3mm",
        minHeight: "4mm",
        padding: isEmphasis ? "1mm 1.5mm" : "0.8mm 1.5mm",
        borderTop:
          tone === "primary" ? "1.2px solid var(--color-primary)" : undefined,
        borderBottom: "1px solid var(--color-border-light)",
        borderRadius:
          tone === "danger" ? `0 0 ${PRINT_RADIUS} ${PRINT_RADIUS}` : undefined,
        background:
          tone === "primary" ? "var(--color-surface)" : "var(--color-bg-card)",
      }}
    >
      <span
        style={{
          textAlign: "right",
          fontWeight: isEmphasis ? 800 : 500,
          color: labelColor,
        }}
      >
        {label}
      </span>
      <span
        style={{
          textAlign: "right",
          fontWeight: isEmphasis ? 800 : 600,
          color: valueColor,
          fontVariantNumeric: "tabular-nums",
        }}
      >
        {formatCurrency(amount)}
      </span>
    </div>
  );
}
