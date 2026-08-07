# ARCHITECTURE.md — Bất biến kiến trúc (mood-studio)

> Đây là những thứ **CẤM đổi khi chưa có entry trong `DECISIONS.md` + user duyệt**.
> Codex/Roo gặp chỗ buộc phải đổi một trong các mục dưới → **DỪNG**, viết HANDOFF trả Claude.
> `CLAUDE.md → "Ràng buộc dự án (cứng)"` là canonical; file này là bản đồ + đánh dấu mục nào cần DECISION.
>
> 📚 **Chi tiết hệ thống đã chuyển sang [`vault/`](../vault/README.md)** — bắt đầu ở [`vault/00-INDEX.md`](../vault/00-INDEX.md).
> File này giữ nguyên vai trò: **danh sách bất biến cần DECISION**. Vault mô tả *hệ thống là gì*; file này quy định *cái gì cấm đổi*.

## Bản đồ module & thư viện data (không đồng nhất — đừng generalize)

| Nhóm | Module | Lib data | Realtime |
|---|---|---|---|
| A. SWR + form-modal | Dresses, CRM-customers, Inventory, Services, Printing, Productivity | SWR | một phần (signal/publication) |
| B. React Query | **Contracts** | React Query (`setQueryData`) | postgres_changes (9 bảng đã vào publication) |
| C. Drag-drop | CRM-leads (kanban), Calendar | dnd-kit + local state | signal |
| D. RSC/read-only | Employees, Dashboard | Server Components | dashboard: signal refresh |

## Bất biến (🔒 = cần DECISION mới được đổi)

1. 🔒 **Đường data mặc định = Server Action.** Không tự chuyển module sang client-direct (browser query Supabase) — đó là **quyết định bảo mật** (RLS). Contracts & nhóm bảng nhạy cảm **chưa đủ RLS scope-studio** để client-direct.
2. 🔒 **Finance = server-truth.** GIỮ `revalidatePath`; KHÔNG patch optimistic giá trị tài chính; action update phiếu PHẢI giữ optimistic-lock `updated_at`.
3. 🔒 **Optimistic chỉ ở tầng hiển thị.** `runOptimisticMutation` (`lib/optimistic-mutation.ts`) là chuẩn — tái dùng, không viết helper mới. Server tính lại (mã tự sinh, recalc totals, tồn kho, status atomic) → **"đóng modal + revalidate"**, không patch số.
4. 🔒 **RLS/grant posture.** anon = least-privilege (đã REVOKE toàn schema); bảng server-only KHÔNG grant SELECT cho authenticated — auto-refresh dùng **signal-table**, không đưa bảng nguồn vào publication. Đổi = task bảo mật riêng.
5. **Responsive 3-tier** (`lib/breakpoints.ts`): mật độ layout toggle ở `md:` (768), chrome full-width ở `lg:` (1024), overlay căn giữa ở `sm:` (640).
6. **Tách module, không liên đới** — 1 task / 1 module; file shared chỉ additive hoặc verify đa module.
7. **Deploy = git push main** (Vercel). Không `vercel --prod`.

## Nav / rendering hiện trạng (bối cảnh, không phải bất biến)
- 41 page dùng `export const dynamic = "force-dynamic"` → server render lại mỗi lần vào. Giảm đau bằng **intent-based prefetch + SSR bootstrap**, chưa gỡ tận gốc.
- Hướng gỡ tận gốc đã cân nhắc: **PPR/`cacheComponents` (Next 16)** — được ưu tiên hơn client-direct vì né rào RLS. Chưa triển khai → nếu làm phải mở DECISION.
