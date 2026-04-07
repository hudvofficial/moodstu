/**
 * 📄 Contract Print Template — A5 Layout
 * Phase 02C: V1 template adapted for V2
 * Uses: V2 types, service_type enum, shared constants
 * NO client Supabase — all data passed as props from server
 */

import type { Contract, ContractItem, PaymentPlan, StudioInfo } from "@/types/contract";
import type { Customer } from "@/types/crm";
import { getServiceLabel } from "@/types/contract-constants";

// ═══════════════════════════════════════════
// Shared format helpers (print-specific)
// ═══════════════════════════════════════════

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("vi-VN").format(amount);
}

function formatDate(date: string | null): string {
  if (!date) return "___/___/______";
  return new Date(date).toLocaleDateString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
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
}: ContractTemplateProps) {
  const isWedding = contract.service_type === "ngay_cuoi";
  const serviceLabel = getServiceLabel(contract.service_type);

  // Financial calculations
  const subtotal = items.reduce((sum, item) => sum + item.total_amount, 0);
  const discount = contract.discount_amount || 0;
  const total = contract.total_amount;
  const paid = contract.paid_amount;
  const remaining = contract.remaining_amount;

  return (
    <div
      id="print-template"
      className="print-template"
      style={{
        width: "148mm",
        minHeight: "195mm",
        padding: "8mm 10mm",
        fontFamily: "'Segoe UI', Tahoma, sans-serif",
        fontSize: "9.5px",
        lineHeight: "1.5",
        color: "var(--color-text-primary)",
        background: "var(--color-bg-base)",
      }}
    >
      {/* ── HEADER ── */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "6mm" }}>
        <div style={{ flex: "0 0 auto" }}>
          {studio.logo_url && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={studio.logo_url}
              alt={studio.name}
              style={{ width: "50px", height: "50px", objectFit: "contain" }}
            />
          )}
        </div>
        <div style={{ flex: 1, textAlign: "center" }}>
          <div style={{ fontSize: "14px", fontWeight: 700, color: "var(--color-primary)", textTransform: "uppercase" }}>
            {studio.name}
          </div>
          <div style={{ fontSize: "8px", color: "var(--color-text-muted)", marginTop: "2px" }}>
            {studio.address}
          </div>
          <div style={{ fontSize: "8px", color: "var(--color-text-muted)" }}>
            Hotline: {studio.hotline || "___________"}
          </div>
        </div>
        <div style={{ flex: "0 0 auto", textAlign: "right" }}>
          <div style={{ fontSize: "7px", color: "var(--color-text-muted)" }}>Số HĐ</div>
          <div style={{ fontSize: "11px", fontWeight: 700, color: "var(--color-primary)" }}>
            {contract.contract_code}
          </div>
        </div>
      </div>

      {/* ── TITLE ── */}
      <div style={{ textAlign: "center", marginBottom: "5mm" }}>
        <div style={{ fontSize: "16px", fontWeight: 700, color: "var(--color-primary)", letterSpacing: "1px" }}>
          HỢP ĐỒNG DỊCH VỤ
        </div>
        <div style={{ fontSize: "9px", color: "var(--color-text-muted)", marginTop: "2px" }}>
          Loại: {serviceLabel} — Ngày: {formatDate(contract.contract_date)}
        </div>
      </div>

      {/* ── CUSTOMER INFO ── */}
      <div style={{ border: "1px solid var(--color-border)", borderRadius: "4px", padding: "4mm", marginBottom: "5mm" }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "3px 8mm" }}>
          <InfoRow label="Khách hàng" value={customer.full_name} bold />
          <InfoRow label="Điện thoại" value={customer.phone || "___________"} />
          <InfoRow label="Địa chỉ" value={customer.address || "___________"} />
          <InfoRow label="Email" value={customer.email || "___________"} />
          {isWedding && (
            <>
              <InfoRow label="Ngày cưới" value={formatDate(customer.wedding_date || null)} />
              <InfoRow label="Ghi chú" value={contract.notes || ""} />
            </>
          )}
        </div>
      </div>

      {/* ── SERVICES TABLE ── */}
      <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: "4mm", fontSize: "9px" }}>
        <thead>
          <tr style={{ background: "var(--color-primary)", color: "var(--color-bg-base)" }}>
            <Th width="8%">STT</Th>
            <Th width="42%" align="left">Dịch vụ / Sản phẩm</Th>
            <Th width="10%">SL</Th>
            <Th width="20%">Đơn giá</Th>
            <Th width="20%">Thành tiền</Th>
          </tr>
        </thead>
        <tbody>
          {items.map((item, i) => (
            <tr key={item.id} style={{ borderBottom: "1px solid var(--color-border)" }}>
              <Td align="center">{i + 1}</Td>
              <Td align="left">
                {item.item_name}
                {item.is_addon && <span style={{ color: "var(--color-text-muted)", fontSize: "7px" }}> (phát sinh)</span>}
              </Td>
              <Td align="center">{item.quantity}</Td>
              <Td align="right">{formatCurrency(item.unit_price)}</Td>
              <Td align="right">{formatCurrency(item.total_amount)}</Td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <SumRow label="Tạm tính" amount={subtotal} />
          {discount > 0 && <SumRow label="Giảm giá" amount={-discount} color="var(--color-error)" />}
          <SumRow label="Tổng thanh toán" amount={total} bold />
          <SumRow label="Đã thanh toán" amount={paid} color="var(--color-success)" />
          <SumRow label="Còn lại" amount={remaining} bold color="var(--color-error)" />
        </tfoot>
      </table>

      {/* ── PAYMENT SCHEDULE ── */}
      {paymentPlans.length > 0 && (
        <div style={{ marginBottom: "4mm" }}>
          <div style={{ fontSize: "10px", fontWeight: 600, marginBottom: "3px", color: "var(--color-primary)" }}>
            Lịch thanh toán
          </div>
          <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
            {paymentPlans.map((plan, i) => {
              const isPaid = plan.status === "paid";
              const dotColor = isPaid ? "var(--color-success)" : i === 0 ? "var(--color-warning)" : "var(--color-border)";
              return (
                <div
                  key={plan.id}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "4px",
                    fontSize: "8px",
                    color: "var(--color-text-muted)",
                  }}
                >
                  <span
                    style={{
                      width: "8px",
                      height: "8px",
                      borderRadius: "50%",
                      background: dotColor,
                      display: "inline-block",
                    }}
                  />
                  <span>
                    {plan.stage_name}: {formatCurrency(plan.amount)}
                    {plan.due_date && ` (${formatDate(plan.due_date)})`}
                  </span>
                </div>
              );
            })}
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
          marginTop: "6mm",
          marginBottom: "4mm",
        }}
      >
        <div>
          <div style={{ fontWeight: 600, fontSize: "10px" }}>Khách hàng</div>
          <div style={{ fontSize: "7px", color: "var(--color-text-muted)", marginTop: "2px" }}>(Ký và ghi rõ họ tên)</div>
          <div style={{ height: "20mm" }} />
        </div>
        <div>
          <div style={{ fontWeight: 600, fontSize: "10px" }}>Đại diện Studio</div>
          <div style={{ fontSize: "7px", color: "var(--color-text-muted)", marginTop: "2px" }}>(Ký và đóng dấu)</div>
          <div style={{ height: "20mm" }} />
        </div>
      </div>

      {/* ── NOTES ── */}
      <div style={{ fontSize: "7.5px", color: "var(--color-text-secondary)", borderTop: "1px solid var(--color-border)", paddingTop: "3mm" }}>
        <div style={{ fontWeight: 600, marginBottom: "2px" }}>Lưu ý:</div>
        <ul style={{ margin: 0, paddingLeft: "12px" }}>
          <li>Hợp đồng có giá trị kể từ ngày ký. Mọi thay đổi cần có sự đồng ý của cả hai bên.</li>
          <li>Khách hàng vui lòng thanh toán đúng hạn theo lịch trên.</li>
          <li>Studio cam kết thực hiện dịch vụ chuyên nghiệp và đúng tiến độ.</li>
        </ul>
      </div>

      {/* ── FOOTER ── */}
      <div
        style={{
          textAlign: "center",
          fontSize: "7px",
          color: "var(--color-text-muted)",
          marginTop: "4mm",
          borderTop: "1px dashed var(--color-border)",
          paddingTop: "2mm",
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

function InfoRow({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <div style={{ display: "flex", gap: "4px" }}>
      <span style={{ color: "var(--color-text-secondary)", minWidth: "60px" }}>{label}:</span>
      <span style={{ fontWeight: bold ? 600 : 400 }}>{value}</span>
    </div>
  );
}

function Th({ children, width, align = "center" }: { children: React.ReactNode; width: string; align?: string }) {
  return (
    <th
      style={{
        width,
        padding: "4px 6px",
        textAlign: align as React.CSSProperties["textAlign"],
        fontSize: "8px",
        fontWeight: 600,
      }}
    >
      {children}
    </th>
  );
}

function Td({ children, align = "center" }: { children: React.ReactNode; align?: string }) {
  return (
    <td style={{ padding: "3px 6px", textAlign: align as React.CSSProperties["textAlign"] }}>
      {children}
    </td>
  );
}

function SumRow({ label, amount, bold, color }: { label: string; amount: number; bold?: boolean; color?: string }) {
  return (
    <tr>
      <td colSpan={4} style={{ textAlign: "right", padding: "3px 6px", fontWeight: bold ? 700 : 400 }}>
        {label}
      </td>
      <td
        style={{
          textAlign: "right",
          padding: "3px 6px",
          fontWeight: bold ? 700 : 400,
          color: color || "inherit",
        }}
      >
        {formatCurrency(amount)}
      </td>
    </tr>
  );
}
