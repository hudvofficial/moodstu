# HANDOFF — T-20260723-worktree-salvage-prune — claude → codex

- **Task:** T-20260723-worktree-salvage-prune — Cứu 2 thay đổi chưa commit trong worktree cũ, rồi mới gỡ worktree (thu hồi 5.2 GB)
- **Từ → Đến:** claude → codex
- **Branch / worktree:** `codex/worktree-salvage` / (làm ngay trên repo chính)
- **Locks (vùng độc quyền):**
  - `components/contracts/gallery/use-gallery-data.ts`
  - `components/gallery/public-gallery-client.tsx`
- **Ngày:** 2026-07-23

> ⚠️ **Task này ĐỘNG VÀO MÔI TRƯỜNG MÁY USER, không chỉ code.** Phần gỡ worktree (Task 3) **chỉ được làm sau khi user xác nhận riêng**, kể cả khi spec này đã duyệt. Xoá nhầm là mất việc dở không lấy lại được bằng git (nó chưa commit).

## 1. Mục tiêu bước này

`.claude/worktrees/` có 2 worktree cũ, mỗi cái là một bản sao repo gần đầy đủ, tổng **5.2 GB**. Nhưng **cả hai đều đang giữ thay đổi chưa commit**, và **cả hai thay đổi đó đều CHƯA có trên `main`**.

Nên trình tự bắt buộc là: **cứu trước, gỡ sau**. Không được đảo.

## 2. Đã làm / hiện trạng — đã kiểm chứng

### Hiện trạng worktree
```
.claude/worktrees/elated-jones-1134b5        2.3 GB  branch claude/elated-jones-1134b5      @ fcc71b6
.claude/worktrees/trusting-dijkstra-c5e0c4   2.9 GB  branch claude/trusting-dijkstra-c5e0c4 @ fcc71b6
.claude/worktrees/vscode-not-working-febdc2   36 KB  branch main @ a521109  (sạch, vô hại)
```

### Hai thay đổi cần cứu — đều là vá lỗi bị nuốt im lặng

**(A)** `elated-jones-1134b5` → `components/contracts/gallery/use-gallery-data.ts` (+20 −3)
Hai hàm `fetchAllSelectedDownloadFiles` và `fetchAllHeartedDownloadFiles` đang `return []` khi server trả lỗi. Hệ quả: Download Manager hiện **"0 file"** — trông y hệt trường hợp "khách chưa chọn ảnh nào", nên lỗi thật bị che. Diff thêm `console.error` + `toast.error` với thông điệp từ server.

**(B)** `trusting-dijkstra-c5e0c4` → `components/gallery/public-gallery-client.tsx` (+9 −2)
`upsertComment` thất bại thì chỉ `return result.success` — viewer rollback im lặng, khách không biết vì sao ghi chú không lưu (ví dụ album đã quá hạn chọn ảnh). Diff thêm `toast.error(result.error)` với `id` cố định để retry không xếp chồng toast.

### Xác nhận chưa có trên main
```
grep -c "toast.error" components/contracts/gallery/use-gallery-data.ts   → 0
grep -c "toast.error" components/gallery/public-gallery-client.tsx        → 0
```
Cả hai file trên `main` đều **chưa** có `toast.error` → việc dở thật sự chưa được cứu.

### Vì sao đáng cứu chứ không vứt
Cả hai đều sửa đúng một lớp bệnh mà phiên hôm nay đã gặp lại nhiều lần: **nuốt lỗi rồi trả giá trị rỗng**, khiến triệu chứng nhìn giống trạng thái bình thường. Đây là code hữu ích, không phải thử nghiệm bỏ đi.

## 3. Files touched

- `components/contracts/gallery/use-gallery-data.ts` — nhận diff (A)
- `components/gallery/public-gallery-client.tsx` — nhận diff (B)
- (Task 3, sau khi user xác nhận) gỡ 2 worktree + 2 branch `claude/*`

## 4. Bước tiếp cần làm

### Task 1 — cứu diff (A) vào main
```
git -C .claude/worktrees/elated-jones-1134b5 diff -- components/contracts/gallery/use-gallery-data.ts > /tmp/salvage-a.patch
git apply /tmp/salvage-a.patch
```
Nếu `git apply` báo xung đột (file trên main đã đổi từ `fcc71b6`): **DỪNG, không tự sửa tay** — báo Claude để đọc lại diff và ráp thủ công.

Kiểm bằng mắt: file phải có `import { toast } from "sonner";` và 2 khối `toast.error` trong `fetchAllSelectedDownloadFiles` + `fetchAllHeartedDownloadFiles`.

Verify: `npx eslint components/contracts/gallery/use-gallery-data.ts` → exit 0, `npm run build` → exit 0.

Commit riêng:
```
fix(gallery): báo lỗi khi tải danh sách ảnh đã chọn/thả tim thất bại

Cứu từ worktree claude/elated-jones-1134b5 (chưa commit, chưa có trên main).
Trước: server lỗi → return [] → Download Manager hiện "0 file", trông y hệt
"khách chưa chọn ảnh nào" nên lỗi thật bị che.
```

### Task 2 — cứu diff (B) vào main
```
git -C .claude/worktrees/trusting-dijkstra-c5e0c4 diff -- components/gallery/public-gallery-client.tsx > /tmp/salvage-b.patch
git apply /tmp/salvage-b.patch
```
Xung đột → DỪNG, báo Claude (như trên).

Kiểm bằng mắt: file phải có `import { toast } from "sonner";` và khối `toast.error(result.error || "Không thể lưu ghi chú", { id: "gallery-save-note-error" })`.

Verify: `npx eslint components/gallery/public-gallery-client.tsx` → exit 0, `npm run build` → exit 0.

Render verify (đây là đường khách dùng thật): `npm run dev`, mở `http://localhost:3001/gallery/amtgzexYOnXG`, mở 1 ảnh, gõ ghi chú rồi lưu — đường thành công phải vẫn im lặng như cũ (không toast). Không ép được đường lỗi thì ghi rõ là chưa kiểm được nhánh lỗi, đừng nói đã kiểm.

Commit riêng:
```
fix(gallery): báo khách khi lưu ghi chú thất bại

Cứu từ worktree claude/trusting-dijkstra-c5e0c4 (chưa commit, chưa có trên main).
Trước: upsertComment fail → viewer rollback im lặng, khách không biết lý do
(vd album đã hết hạn chọn ảnh). Toast dùng id cố định để retry không xếp chồng.
```

### Task 3 — CHỜ USER XÁC NHẬN RIÊNG rồi mới gỡ worktree

Chỉ chạy khi Task 1 + Task 2 đã commit xong và user đã nói rõ "gỡ đi".

```
git worktree remove .claude/worktrees/elated-jones-1134b5 --force
git worktree remove .claude/worktrees/trusting-dijkstra-c5e0c4 --force
git worktree prune
git branch -D claude/elated-jones-1134b5 claude/trusting-dijkstra-c5e0c4
```

**GIỮ LẠI** `.claude/worktrees/vscode-not-working-febdc2` — 36 KB, sạch, đang ở `main`, không cản trở gì.

Verify: `git worktree list` chỉ còn repo chính (+ `vscode-not-working-febdc2` nếu nó vẫn được git đăng ký); `du -sh .claude/worktrees/*` cho thấy đã thu hồi ~5.2 GB.

## 5. Cách verify

1. `npx eslint components/contracts/gallery/use-gallery-data.ts components/gallery/public-gallery-client.tsx` → exit 0
2. `npm run build` → exit 0
3. `grep -c "toast.error"` trên 2 file → phải `> 0` cả hai (trước task là `0`)
4. Render album công khai, lưu 1 ghi chú thành công → không toast lỗi, ghi chú hiện đúng
5. (Sau Task 3) `git worktree list` + `du -sh .claude/worktrees/*`

## 6. Ràng buộc / cạm bẫy phải giữ

- **TUYỆT ĐỐI không gỡ worktree trước khi 2 diff đã commit trên main.** Thay đổi chưa commit thì `git` không cứu lại được sau khi `worktree remove --force`.
- **Không `git add -A`** — 2 worktree đó nằm trong cây thư mục repo chính; quét bừa có thể kéo rác vào commit. Chỉ `git add` đúng file đã nêu.
- Hai diff là **2 module khác nhau** (admin gallery vs public gallery) → **2 commit riêng**, đừng gộp.
- Đường thành công của cả 2 hàm phải giữ nguyên hành vi — chỉ thêm nhánh báo lỗi.

## 7. Câu hỏi mở / rủi ro

- **`git apply` có thể xung đột.** Cả 2 worktree đứng ở `fcc71b6`, còn `main` giờ ở `a521109` — đã qua nhiều commit gallery (`6cb9a26`, `2c8ced0`, `48672c8`, `01a2ca8`, `1477090`). Nếu vùng code quanh diff đã đổi thì patch trượt. Spec cố ý bắt DỪNG thay vì để tự chế.
- **Chưa kiểm được nhánh lỗi của (B).** Muốn thấy toast thật thì phải ép `upsertComment` fail (ví dụ đặt album quá hạn chọn ảnh). Tôi không tự đổi dữ liệu nghiệp vụ của album khách để test. Nếu user muốn kiểm tận mắt thì cần một album nháp.
- **Không rõ 2 worktree này còn dùng vào việc gì khác.** Chúng do phiên Claude trước tạo ra; ngoài 2 file trên thì cây làm việc sạch. Nhưng đây là môi trường máy user nên Task 3 vẫn phải hỏi lại.
