Refactor trang Employee Detail (/employees/[id]) theo Stitch design mới. Áp dụng pattern detail-grid từ module Contracts (đã proven) cho layout 2 cột desktop + 1 cột mobile.

## MỤC TIÊU

Trang employee detail hiện tại có 3 card riêng biệt (Cá nhân, Công việc, Lương) xếp grid 2 cột → lãng phí vertical space, không có visual hierarchy. Cần refactor theo pattern đã chuẩn hóa ở module Contracts:
- Desktop: 2-column grid (main 8 cột + sidebar 4 cột)
- Mobile: 1-column stack, tất cả sections gộp trong 1 card
- Dùng SSOT CSS classes đã có sẵn, KHÔNG tạo class mới

## STITCH DESIGN REFERENCE

Stitch project "Mood Studio v2" (ID: 3342062284752503492):
- Desktop screen ID: 37b83c1ee5a3420e9c2561774ae0f1ba
- Mobile screen ID: c273800255c94bbf83f862b60b1ba4d4

## FILES CẦN SỬA (CHỈ 2 FILE)

### FILE 1: components/employees/employee-info-card.tsx

Hiện tại component này luôn render wrapper card (bg-bg-card rounded-xl shadow-xs p-4). Cần thêm prop `embedded` để khi gộp nhiều section vào 1 card chung, mỗi section không tự render card riêng.

Thay đổi:
1. Thêm prop `embedded?: boolean` vào interface Props
2. Tách nội dung (title + items list) thành biến `content`
3. Nếu `embedded=true` → return content trực tiếp (không wrapper)
4. Nếu `embedded=false` hoặc undefined → return content bọc trong wrapper div như cũ
5. Title khi embedded dùng style: `text-xs font-semibold text-text-muted uppercase tracking-wide mb-3`
6. Title khi không embedded giữ nguyên: `text-sm font-semibold text-text mb-3`

Code đầy đủ sau khi sửa:

```tsx
interface InfoItem {
  label: string;
  value: string | null;
  href?: string;
}

interface Props {
  title: string;
  items: InfoItem[];
  embedded?: boolean;
}

export default function EmployeeInfoCard({ title, items, embedded }: Props) {
  const content = (
    <>
      <h3 className={embedded ? "text-xs font-semibold text-text-muted uppercase tracking-wide mb-3" : "text-sm font-semibold text-text mb-3"}>
        {title}
      </h3>
      <div className="space-y-2.5">
        {items.map((item) => (
          <div key={item.label} className="flex items-center justify-between">
            <span className="text-xs text-text-muted">{item.label}</span>
            {item.href && item.value ? (
              <a href={item.href} className="text-sm text-primary font-medium hover:underline">
                {item.value}
              </a>
            ) : (
              <span className="text-sm text-text font-medium">{item.value || "—"}</span>
            )}
          </div>
        ))}
      </div>
    </>
  );

  if (embedded) return content;

  return (
    <div className="bg-bg-card rounded-xl shadow-xs p-4">
      {content}
    </div>
  );
}
```

### FILE 2: components/employees/employee-detail-page.tsx

Refactor phần layout (từ dòng `{/* ── Info Cards Grid ── */}` trở xuống). Giữ nguyên 100% logic: imports, state, handleSoftDelete, handleRestore, breadcrumb, header card, EmployeeFormModal.

Thay đổi:
1. Chuẩn bị 3 mảng data items (đặt trước return, sau biến isDeleted)
2. Xóa phần grid cũ (`grid grid-cols-1 lg:grid-cols-2`) và EmployeeNotes standalone
3. Thay bằng 2 block layout riêng: Desktop (max-lg:hidden) + Mobile (lg:hidden)

Thêm 3 biến data items (đặt sau dòng `const isDeleted = !!employee.deleted_at;`):

```tsx
const personalItems = [
  { label: "Giới tính", value: employee.gender },
  { label: "Số điện thoại", value: employee.phone ? formatPhone(employee.phone) : null, href: employee.phone ? `tel:${employee.phone}` : undefined },
  { label: "Email", value: employee.email, href: employee.email ? `mailto:${employee.email}` : undefined },
];

const workItems = [
  { label: "Phòng ban", value: employee.department },
  { label: "Chức vụ", value: employee.position },
  { label: "Vai trò", value: getRoleLabel(employee.role as EmployeeRole) },
  { label: "Ngày bắt đầu", value: employee.start_date ? formatDate(employee.start_date) : "—" },
];

const salaryItems = [
  { label: "Lương cơ bản", value: salary.base_salary ? `${formatCurrency(salary.base_salary)} ₫` : null },
  { label: "Ngân hàng", value: salary.bank_name || null },
  { label: "Số tài khoản", value: salary.bank_account_no || null },
  { label: "Tên tài khoản", value: salary.bank_account_name || null },
];
```

Thay thế phần `{/* ── Info Cards Grid ── */}` và `{/* ── Notes ── */}` bằng:

```tsx
{/* ── Desktop Layout ── */}
<div className="max-lg:hidden">
  <div className="detail-grid">
    <div className="detail-main">
      <div className="card-base p-5">
        <EmployeeInfoCard title="Thông tin cá nhân" items={personalItems} embedded />
        <div className="h-px bg-border/30 my-4" />
        <EmployeeInfoCard title="Thông tin công việc" items={workItems} embedded />
      </div>
    </div>
    <div className="detail-sidebar">
      <EmployeeInfoCard title="Thông tin lương" items={salaryItems} />
      <EmployeeNotes employeeId={employee.id} initialNotes={employee.notes} />
    </div>
  </div>
</div>

{/* ── Mobile Layout ── */}
<div className="lg:hidden">
  <div className="card-base p-4">
    <EmployeeInfoCard title="Cá nhân" items={personalItems} embedded />
    <div className="h-px bg-border/30 my-3" />
    <EmployeeInfoCard title="Công việc" items={workItems} embedded />
    <div className="h-px bg-border/30 my-3" />
    <EmployeeInfoCard title="Lương" items={salaryItems} embedded />
  </div>
  <EmployeeNotes employeeId={employee.id} initialNotes={employee.notes} />
</div>
```

## CSS CLASSES ĐÃ CÓ SẴN (app/styles/pages.css) — KHÔNG TẠO MỚI

- `detail-grid` → Mobile: flex-column gap-24px. Desktop (≥1024px): CSS grid 12 cột
- `detail-main` → Desktop: span 8 cột. Mobile: flex-column
- `detail-sidebar` → Desktop: span 4 cột, display flex. Mobile: display none (ẩn hoàn toàn)
- `card-base` → bg-bg-card, rounded-xl, shadow-xs
- `h-px bg-border/30` → divider giữa các sections (thay vì border)

## QUY TẮC BẮT BUỘC

1. KHÔNG tạo CSS class mới — chỉ dùng classes đã có trong pages.css và design-system.css
2. KHÔNG dùng border — divider = `h-px bg-border/30`
3. KHÔNG thay đổi business logic (handleSoftDelete, handleRestore, showForm state)
4. KHÔNG thay đổi imports (giữ nguyên tất cả import hiện tại)
5. KHÔNG thay đổi header card và breadcrumb
6. Giữ nguyên tất cả data fields hiện tại — không bỏ sót field nào
7. EmployeeFormModal giữ nguyên vị trí cuối component
8. File sau khi sửa PHẢI dưới 200 dòng

## PATTERN THAM KHẢO

Xem file `components/contracts/detail/detail-layout-sections.tsx` — đây là gold standard cho pattern detail-grid. Cách desktop dùng `max-lg:hidden` wrapper + `detail-grid > detail-main + detail-sidebar`, mobile dùng `lg:hidden` wrapper + stack 1 cột.

## VERIFICATION

Sau khi code xong:
1. Chạy `npm run build` — phải pass không lỗi TypeScript
2. Mở browser desktop (≥1024px) → kiểm tra 2-column: main có 1 card gộp 2 sections, sidebar có Lương + Ghi chú
3. Thu nhỏ browser (< 1024px) → mobile 1-column: 1 card gộp 3 sections, Ghi chú riêng phía dưới
4. Kiểm tra tất cả data fields hiển thị đúng (phone có link tel:, email có link mailto:)
5. Kiểm tra nút Sửa mở form modal, nút Cho nghỉ hoạt động
