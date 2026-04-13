# Phase 04: Final Verification & Audit
Status: ⬜ Pending
Dependencies: Bắt buộc hoàn thành 100% Phase 00 → 03e.

## Objective
Kiểm định toàn diện 5 lớp (Build, Visual, Logic, Integrity, SSOT Compliance). Cung cấp bằng chứng cụ thể trước khi bàn giao module Finance V2.

---

## 1. LAYER 1: Build & Type Safety (Hard Gate)

Không được phép có bất kỳ lỗi TS/build nào kể cả ở file không liên quan trực tiếp (bảo vệ CI/CD).

```bash
# Lệnh chạy
npm run type-check
npm run build
npm run lint
```
**Quy tắc**: Phải pass `0 errors`. Bất kỳ warning nào về `eslint-disable` hay nuốt lỗi (`catch {}` trống) đều bị đánh fail.

---

## 2. LAYER 2: Logic & Integrity Validation

Thực hiện các test cases trọng yếu để verify việc harden Server Actions đã hoạt động.

| # | Hạng mục | Test Case | Expected Result |
|---|---|---|---|
| 2.1 | **Bugs (B1-B9) Fix** | Kiểm tra source code và execute 9 bugs đã define | Đã được khắc phục hoàn toàn. Không còn schema mismatch hay nuốt lỗi. |
| 2.2 | **Security (RBAC)** | Login tài khoản Nhân viên (thay vì Admin), thử tạo 1 Expense bằng API (Server Action) | Action bị từ chối với Unauthorized error. |
| 2.3 | **Period Lock** | Tạo 1 phiếu chi cho ngày thuộc kỳ `2026-03` đã bị `locked` trong `finance_monthly_closes`. | Action từ chối (DB chặn bằng check ở query action). UI hiện warning. |
| 2.4 | **Audit Logging** | Sửa số tiền của 1 Phiếu thu, sau đó xoá phiếu đó. | Cả 2 thao tác đề ghi log vào bảng `audit_logs` (thông qua `writeAuditLog`). |
| 2.5 | **Concurrency (Lock)** | Submit đồng thời 2 yêu cầu cập nhật cùng 1 Debt (với `expectedUpdatedAt` giống nhau) | Request 1 pass, request 2 fail `Dữ liệu đã bị thay đổi`. |

---

## 3. LAYER 3: SSOT Validation (Scripted Check)

Dùng PowerShell (hoặc grep) quét codebase phần `/finance` để đảm bảo không vi phạm SSOT. Phải trả về `0 results` cho các case vi phạm.

```powershell
// CHẠY TRONG FOLDER: app/(protected)/finance/ & components/finance/

// 1. Quét thẻ input số không qua CurrencyInput
Select-String -Path ".\*.tsx" -Pattern "<input.*type=[\`"']number[\`"']" -Recurse

// 2. Quét hex colors cứng (chống lại design system)
Select-String -Path ".\*.tsx" -Pattern "#[0-9a-fA-F]{3,6}\b|rgb\(|rgba\(" -Recurse

// 3. Quét vi phạm fetch (client fetch dạo)
Select-String -Path ".\*.tsx" -Pattern "useEffect.*fetch\(" -Recurse

// 4. Quét vi phạm class padding (tự fix layout thay vì box container)
Select-String -Path ".\*.tsx" -Pattern " className=[\`"'].*\b(p-4|px-6|py-8)\b" -Recurse

// 5. Quét Swallowed Errors (Nuốt lỗi trong try/catch)
Select-String -Path ".\*.ts" -Pattern "catch\s*\([^\)]*\)\s*\{\s*\}" -Recurse
```

---

## 4. LAYER 4: Performance Validation

Đảm bảo hợp đồng Performance Contract được tuân thủ.

| Contract (Phase 02) | Test Case | Target | Output cần chụp |
|---|---|---|---|
| **4.1 Dashboard Metrics** | Truy cập `/finance` trong tháng có >2000 giao dịch | < 200ms query | Terminal log / Browser Network Panel |
| **4.3 Ledger Query** | Truy cập `/finance/cashflow` | Pagination đúng 20 items. Delay < 200ms. | UI table |
| **4.4 Debts Query** | Truy cập `/finance/debts` | Aging được map chính xác, k lag. < 200ms. Giá trị được phân cụm vào 0-30/31-60/120+ đúng DB. | UI table |

---

## 5. LAYER 5: Visual Check (Aesthetics & Layout)

Dùng browser chụp screenshot hoặc Agent Visual Check:
- **Mobile View (375px)**: Đảm bảo không bị overflow ngang. Table chuyển thành List Cards. Header có safe padding.
- **Desktop View (1440px)**: Grid 2+ cột không bị méo. Table phải sticky header nếu nội dung dài. Modals (`<UnifiedModal>`) hiển thị đúng layout và lock scroll trang ngoài. No Inline Styles.

---

## Final Output

Khi vượt qua 5 Layer, Agent / Developer điền [x] và update `plan.md` thành `🟢 Done`. Module V2 sẽ được dán nhãn **Gold Standard Approved**.
Lưu giữ lại Artifact `walkthrough.md`.
