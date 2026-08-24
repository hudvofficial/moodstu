# T-20260824 — `/finance/closes`: nối "Khấu hao" + "Chốt P&L" vào số liệu thật, thêm hủy kỳ tạo nhầm

**Owner:** claude (fallback, user chỉ định "viết spec rồi tiến hành triển khai theo đề xuất bám spec") · **Trạng thái:** đã duyệt hướng, viết spec để implement
**Module:** tai-chinh (closes) · **Bối cảnh:** tiếp nối trace nghiệp vụ `/finance/receipts` — user yêu cầu đào sâu riêng phần "khóa sổ", phát hiện 7/8 bước chỉ là toggle trạng thái tay, không tính/đọc số liệu nào, dù 2 tính năng "Khấu hao" (bước 6) và "P&L" (bước 7) đã có thật, tính đúng, ở nơi khác trong app (`/finance/investments`, `/finance/reports`) nhưng chưa hề được nối vào đây. Xem báo cáo trace: artifact "Đường Đi Phiếu Thu" mục 05.

**Locks:**
- `app/actions/finance-close-actions.ts`
- `components/finance/closes/close-detail-client.tsx`
- `components/finance/closes/closes-client.tsx`

**Không đổi:** `advance_close_task` (RPC), schema `finance_monthly_closes`/`finance_close_tasks` (không cần migration DB — `snapshot_metrics` đã là `jsonb` linh hoạt sẵn).

---

## 0. Quyết định phạm vi (đọc trước khi code)

Trace sâu tìm ra 7 vấn đề ở module này (xem artifact). Task này **chỉ xử lý 2 việc có giá trị rõ, chi phí thấp, không phát minh hạ tầng mới**:

1. **Nối bước 6 (Khấu hao) + bước 7 (P&L) vào số liệu thật** — tái dùng đúng công thức khấu hao đường thẳng đã có ở `/finance/investments`, không viết công thức mới.
2. **Thêm hủy 1 kỳ chưa khóa** (`draft`/`in_progress`) — vá đúng lỗ hổng "tạo nhầm tháng thì kẹt vĩnh viễn" (ràng buộc `UNIQUE(period)`, không có nút xóa).

**Cố tình KHÔNG làm trong task này** (đã cân nhắc, ghi lý do để không lặp lại điều tra):
- **Tách vai trò kế toán riêng / nguyên tắc tách bạch người tạo–người duyệt khóa.** Đây là quyết định sản phẩm (thêm 1 role mới), không phải sửa lỗi — vì tính năng này **chưa từng được dùng thật một lần nào** (0 kỳ đã khóa tại thời điểm trace), chưa có tín hiệu nhu cầu thật để đầu tư thêm 1 hệ thống phân quyền mới. Nếu sau này bạn thật sự bắt đầu khóa sổ hàng tháng và thấy cần tách vai trò, mở task riêng.
- **Bước 1/2/3/5 (kiểm kê quỹ, đối soát ngân hàng, công nợ thẻ, thanh toán đối tác)** — các bước này không có tính năng "đã có sẵn nơi khác" để nối vào (không có khái niệm "số dư ngân hàng", không có bảng AR/AP aging nào được tính sẵn). Xây các tính năng đó là **xây mới hoàn toàn**, không phải "nối dây có sẵn" — ngoài phạm vi surgical fix, cần spec riêng nếu bạn muốn.
- **Bước 4 (thanh toán lương)** — số lương (`salaryCost`) đã có sẵn ở sidebar "Snapshot SSOT" cho cả kỳ; không tách riêng vào từng dòng bước vì không có gì mới để nối, giữ nguyên hiện trạng.

## 1. Fix 1 — `buildCloseSnapshot()`: thêm `depreciationCost` (khấu hao) + `netProfit` (P&L thật)

**File:** `app/actions/finance-close-actions.ts`

Thêm 1 truy vấn `investments` vào `Promise.all` hiện có (song song với payments/receipts/expenses/salary/fixed_costs):

```ts
supabase
  .from("investments")
  .select("purchase_date, purchase_price, useful_life_months, salvage_value, sold_date")
  .is("deleted_at", null),
```

Sau khối tính `fixedCost` hiện có, thêm:

```ts
const depreciationCost = (investmentsResult.data || []).reduce((sum, row) => {
  if (row.sold_date && row.sold_date < range.end) return sum; // đã thanh lý trước kỳ này
  if (!row.purchase_date || row.purchase_date >= range.end) return sum; // chưa mua tới kỳ này
  const usefulLife = row.useful_life_months || 36;
  const salvage = Number(row.salvage_value) || 0;
  const monthly = usefulLife > 0 ? Math.max(0, Number(row.purchase_price) - salvage) / usefulLife : 0;
  if (!monthly) return sum;
  const purchased = new Date(row.purchase_date);
  const periodEnd = new Date(range.end);
  const monthsElapsed = (periodEnd.getFullYear() - purchased.getFullYear()) * 12 + (periodEnd.getMonth() - purchased.getMonth());
  if (monthsElapsed > usefulLife) return sum; // đã khấu hao hết trước kỳ này
  return sum + Math.round(monthly);
}, 0);
```

Công thức khấu hao đường thẳng (`purchase_price - salvage`) ÷ `useful_life_months` **giống hệt** `investmentBookValue()` (`finance-operations-queries.ts:161-182`) — không phát minh công thức mới, chỉ chuyển sang tính theo mốc "cuối kỳ đang chốt" thay vì "hôm nay" (vì đây là số của 1 kỳ quá khứ cụ thể, không phải số hiện tại).

**Quan trọng — khấu hao KHÔNG cộng vào `totalOutflow`/`netCashflow`** (đó là dòng tiền mặt thật, khấu hao là chi phí phi tiền mặt — gộp vào sẽ sai bản chất kế toán). Thay vào đó thêm 1 con số P&L riêng:

```ts
const netProfit = netCashflow - depreciationCost; // netCashflow = totalInflow - totalOutflow (đã có sẵn)
```

Thêm `depreciationCost` và `netProfit` vào object trả về của `buildCloseSnapshot()` (giữ nguyên toàn bộ field cũ).

`updateCloseSnapshot()` không cần đổi — đã gọi lại `buildCloseSnapshot()` nguyên khối.

## 2. Fix 1 (tiếp) — hiển thị 2 số mới trong UI

**File:** `components/finance/closes/close-detail-client.tsx`

- Thêm `depreciationCost?: number | string | null;` và `netProfit?: number | string | null;` vào type `CloseSnapshotMetrics`.
- Thêm 2 field này vào mảng kiểm tra `hasMetric` trong `getSnapshotMetrics()`.
- Trong vòng lặp render từng `task`: khi `task.step_number === 6`, thêm 1 dòng nhỏ dưới `<h2>{task.step_name}</h2>` hiện `Khấu hao ước tính kỳ này: {formatVnd(snapshotNumber(snapshot?.depreciationCost))}` (chỉ hiện khi có `snapshot`). Khi `task.step_number === 7`, thêm dòng tương tự hiện `Lợi nhuận ròng (P&L) kỳ này: {formatVnd(snapshotNumber(snapshot?.netProfit))}`.
- Trong card "Snapshot SSOT" ở sidebar, thêm 2 dòng mới sau dòng "Chi phí cố định": "Khấu hao" và "Lợi nhuận ròng (P&L)" (tách biệt rõ với "Dòng tiền ròng" — 1 cái là tiền mặt thật, 1 cái là lợi nhuận kế toán có trừ khấu hao).

## 3. Fix 2 — hủy 1 kỳ chưa khóa

**File:** `app/actions/finance-close-actions.ts` — thêm action mới:

```ts
export async function cancelMonthlyClose(closeId: string) {
  return withAdmin(async (supabase: SupabaseClient<Database>, userId) => {
    const { data: close, error } = await supabase
      .from("finance_monthly_closes")
      .select("period, status")
      .eq("id", closeId)
      .single();

    if (error || !close) throw new Error("Khong tim thay ky chot so.");
    if (close.status === "locked") throw new Error("Ky da khoa so, khong the huy.");

    const { error: deleteError } = await supabase
      .from("finance_monthly_closes")
      .delete()
      .eq("id", closeId);
    if (deleteError) throw new Error(`Loi huy ky chot so: ${deleteError.message}`);

    await writeAuditLog({
      action: "DELETE",
      tableName: "finance_monthly_closes",
      recordId: closeId,
      performedBy: userId,
      oldData: { period: close.period, status: close.status },
      description: `Huy ky chot so thang ${close.period}`,
    });

    revalidateCloseRoutes();
    return null;
  });
}
```

`finance_close_tasks.close_id` có `ON DELETE CASCADE` (`20260411160000_finance_close_tables.sql:23`) — xóa `finance_monthly_closes` tự xóa sạch 8 dòng task, không cần xóa tay.

**File:** `components/finance/closes/closes-client.tsx` — thêm cột "Thao tác" cuối bảng, chỉ hiện nút xóa (icon `Trash2`, `variant="ghost"`) khi `item.status !== "locked"`. Bấm mở `ConfirmDialog` (component có sẵn `components/ui/confirm-dialog.tsx`, dùng lại nguyên mẫu, không viết modal mới) với message nêu rõ kỳ + cảnh báo "xóa toàn bộ 8 bước đã ghi nhận, không khôi phục được". Xác nhận → gọi `cancelMonthlyClose(item.id)` → `toast` kết quả → `refresh()`.

## 4. Fix nhỏ đi kèm — vá lỗ hổng audit log của `advanceCloseTask`

Trace phát hiện 2 lệnh `writeAuditLog` trong `advanceCloseTask` (cả nhánh RPC thành công và nhánh fallback khi thiếu RPC) đều thiếu `recordId`/`performedBy` — khiến log không nối được về đúng kỳ/đúng người thao tác khi xem lại ở `/audit-logs`. `closeId` và `userId` đã có sẵn trong scope tại cả 2 chỗ gọi — chỉ cần thêm 2 field:

```ts
await writeAuditLog({
  action: "UPDATE",
  tableName: "finance_close_tasks",
  recordId: closeId,
  performedBy: userId,
  description: `Cap nhat buoc ${stepNumber} chot so sang trang thai ${nextStatus}`,
});
```

(áp dụng cho cả 2 vị trí gọi trong file — dòng ~286-290 và ~314-318 hiện tại.)

## 5. Verify

1. `npx eslint` 3 file trong locks — 0 error.
2. `npm run build` — exit 0.
3. Render thật (`next start` local + production sau deploy, seed E2E admin rồi xóa):
   - Tạo 1 kỳ chốt sổ test (tháng chưa từng tạo) → xác nhận sidebar hiện đủ "Khấu hao"/"Lợi nhuận ròng (P&L)" (0đ hợp lý vì `investments` hiện chưa có dữ liệu thật — verify bằng cách chèn tạm 1 dòng `investments` test qua service-role, kiểm tra số hiện đúng, rồi xóa dòng test).
   - Bước 6/7 trong danh sách task hiện đúng dòng số liệu mới.
   - Bấm "Xóa" kỳ vừa tạo (chưa khóa) → `ConfirmDialog` hiện đúng cảnh báo → xác nhận → kỳ biến mất khỏi danh sách.
   - Không thử xóa kỳ đã khóa (hiện chưa có kỳ nào khóa thật trong production — không cần test riêng, code đã chặn cứng bằng `if (close.status === "locked") throw`).
4. Không tạo/xóa dữ liệu thật của studio khi verify — chỉ dùng kỳ/dòng investment tạo tạm để test rồi xóa sạch.

## 6. Ngoài phạm vi

Xem mục 0 — đã ghi rõ lý do không làm, tránh lặp điều tra ở task sau.

---

## 7. Kết quả thực thi (2026-08-24)

**Trạng thái:** merged vào `main`, đã deploy, đã xác nhận live bằng render thật.

### Verify

1. `npx eslint` (3 file trong locks) → 0 error.
2. `npm run build` → exit 0.
3. Render thật (`next start` local, seed E2E admin + chèn tạm 1 dòng `investments` test qua service-role — mua 2024-01-01, giá 36.000.000đ, useful_life 36 tháng, salvage 0 → khấu hao/tháng lý thuyết = 1.000.000đ):
   - Tạo kỳ chốt test `2025-01` → sidebar "Snapshot SSOT" hiện đúng **"Khấu hao: 1.000.000 VND"**, **"Dòng tiền ròng: 0 VND"** (kỳ test không có giao dịch thật), **"Lợi nhuận ròng (P&L): -1.000.000 VND"** (= 0 − 1.000.000, đúng công thức).
   - Bước 6 ("Khấu hao tài sản...") và bước 7 ("Chốt báo cáo lãi lỗ...") trong danh sách task đều hiện đúng dòng số liệu tương ứng.
   - Bấm nút "Hủy kỳ chốt sổ" (chỉ hiện với kỳ chưa khóa) → `ConfirmDialog` hiện đúng cảnh báo "Xóa toàn bộ kỳ chốt sổ 2025-01 và cả 8 bước đã ghi nhận — không khôi phục được." → xác nhận → toast "Đã hủy kỳ chốt sổ 2025-01." → danh sách quay về "Chưa có kỳ chốt sổ năm 2025" (đã xóa sạch, kể cả 8 dòng task nhờ `ON DELETE CASCADE`).
   - Đã xóa sạch dòng `investments` test + kỳ chốt test sau khi verify — xác nhận lại bằng query, cả 2 đều 0 dòng còn sót.
4. Không đụng tới dữ liệu tài chính thật của studio trong lúc verify.

**Kết luận:** đúng spec, cả 2 fix (số liệu thật cho bước 6/7 + hủy kỳ chưa khóa) hoạt động đúng công thức, không phát sinh lệch hành vi ngoài dự kiến.
