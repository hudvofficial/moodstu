# HANDOFF — T-20260723-settings-member-card-overflow — claude → codex

- **Task:** T-20260723-settings-member-card-overflow — Thẻ thành viên (Cài đặt): cột tên/email bị bóp còn 18px, chữ "Admin · active" đè lên ô chọn quyền
- **Từ → Đến:** claude → codex
- **Branch / worktree:** `codex/settings-member-card-overflow` / (không cần worktree — 1 file)
- **Locks (vùng độc quyền):** `components/settings/member-card.tsx`
- **Ngày:** 2026-07-23

## 1. Mục tiêu bước này

Thẻ thành viên phải đọc được tên + email + dòng quyền ở **mọi bề ngang thẻ**, không có chữ nào đè lên ô chọn quyền. Sửa đúng 1 file, không đụng `members-section.tsx`, không đụng `SelectForm`, không đụng layout `detail-grid`.

## 2. Đã làm / hiện trạng — root cause đã truy xong

### Hiện tượng
Trang `/settings`, thẻ "Thành viên", ở **desktop ≥1024px**: chuỗi `Admin · active` (dòng quyền) vẽ đè lên ô select cũng đang hiện chữ `Admin` → nhìn thành **"AdminAdmin"**. Tên và email gần như biến mất.

### Số đo thật (đo bằng chrome-devtools trên `/settings`, dev server)

| Viewport | Bề ngang thẻ | Cột tên/email (`flex-1 min-w-0`) | Email cần | Chồng lấn ngang |
|---|---|---|---|---|
| 1440 | 286px | **18px** | 116–155px | **16px** |
| 375  | 305px | **37px** | 116–155px | 0 (nhưng chữ vẫn mất) |
| 768  | 666px | 398px | vừa đủ | 0 — **bình thường** |

### Root cause
Hàng trong thẻ là 1 dòng flex không cho xuống dòng, gồm 3 cụm:

- avatar `w-10` = 40px (`shrink-0`)
- cột thông tin `flex-1 min-w-0` — **co được xuống 0**
- cụm phải `shrink-0` = select `w-32` (128px) + nút icon 32px + gap 8px = **168px cứng**

Tại sidebar desktop, thẻ chỉ rộng 286px → phần còn lại cho cột thông tin = `286 − 24(p-3) − 40 − 12 − 12 − 168` ≈ **30px** (đo thật 18px). Cột bị bóp nát; riêng dòng `{ROLE_LABELS[linked.role]} · {linked.status}` ([member-card.tsx:114](components/settings/member-card.tsx#L114)) **không có `truncate`** nên chữ tràn khỏi hộp và vẽ đè lên select.

### Đã loại trừ nghi can
Lỗi **KHÔNG** do đợt bỏ border `.input-base` ngày 23/07. Chứng minh: tiêm lại đúng CSS cũ (`border: 1px solid var(--color-border); background: var(--color-bg-card)`) lên trang đang chạy rồi đo lại — **số đo giống hệt từng pixel** (cột 18px, chồng 16px). Hình học không phụ thuộc border vì mọi thứ là `border-box`.

### Bẫy phải biết trước khi sửa
**Bề ngang thẻ KHÔNG tương quan với breakpoint viewport.** Ở `lg` (≥1024) thẻ nằm trong `.detail-sidebar` (4/10 cột) nên **hẹp 286px**; ở `md` (768) layout 1 cột nên thẻ **rộng 666px**. Sửa bằng `md:`/`lg:` sẽ làm hỏng đúng chiều ngược lại. Vì vậy giải pháp dưới đây **không dùng breakpoint nào**.

## 3. Files touched

- `components/settings/member-card.tsx` — 4 điểm, đều trong khối JSX trả về.

Chạm ngoài danh sách này → DỪNG, báo lại Claude.

## 4. Bước tiếp cần làm — 4 thay đổi, chép nguyên văn

Giải pháp: cho hàng **tự xuống dòng** khi không đủ chỗ, và đặt **sàn bề ngang** cho cột thông tin. Không breakpoint, không container query — tự đúng ở mọi bề ngang.

### Task 1 — cho hàng xuống dòng được
File `components/settings/member-card.tsx`, **dòng 84**.

Từ:
```tsx
        <div className="flex items-center gap-3">
```
Thành:
```tsx
        <div className="flex flex-wrap items-center gap-3">
```

### Task 2 — đặt sàn bề ngang cho cột thông tin
File `components/settings/member-card.tsx`, **dòng 100**.

Từ:
```tsx
          <div className="flex-1 min-w-0">
```
Thành:
```tsx
          <div className="flex-1 min-w-32">
```

> `min-w-32` = 8rem = 128px. Đây là con số quyết định: khi avatar(40) + 128 + cụm phải(168) + gap(24) = 360px **vượt** bề ngang thẻ thì cụm phải tự rớt xuống dòng 2; khi thẻ rộng hơn 360px thì mọi thứ giữ nguyên 1 dòng như hiện tại. Đổi `min-w-0` → `min-w-32` **không** làm hỏng `truncate` của tên/email bên trong, vì min-width vẫn là giá trị cố định nhỏ hơn nội dung (đã kiểm chứng bằng nguyên mẫu, xem §5).

### Task 3 — cụm phải căn phải khi đã rớt xuống dòng 2
File `components/settings/member-card.tsx`, **dòng 138**.

Từ:
```tsx
          <div className="flex items-center gap-2 shrink-0">
```
Thành:
```tsx
          <div className="ml-auto flex items-center gap-2 shrink-0">
```

### Task 4 — chặn dòng quyền tràn hộp (đây là dòng chữ đã đè lên select)
File `components/settings/member-card.tsx`, **dòng 112–117**.

Từ:
```tsx
              <div className="flex items-center gap-1 mt-0.5">
                <Shield className="w-3 h-3 text-text-muted shrink-0" />
                <span className="text-tiny text-text-muted">
                  {ROLE_LABELS[linked.role]} · {linked.status}
                </span>
              </div>
```
Thành:
```tsx
              <div className="flex min-w-0 items-center gap-1 mt-0.5">
                <Shield className="w-3 h-3 text-text-muted shrink-0" />
                <span className="truncate text-tiny text-text-muted">
                  {ROLE_LABELS[linked.role]} · {linked.status}
                </span>
              </div>
```

> Cần **cả hai**: `min-w-0` trên div cha (không có nó thì flex item không co được, `truncate` sẽ không kích hoạt) và `truncate` trên span. Chuỗi dài nhất có thể là `"Cộng tác viên · inactive"` ≈ 150px > sàn 128px, nên vẫn cần cắt.

**KHÔNG** đổi gì khác: giữ nguyên `w-32` của select, giữ `SelectForm`, giữ `icon-btn w-8! h-8!`, giữ toàn bộ logic `handleRoleChange`/`handleUnlink`.

## 5. Cách verify

Nguyên mẫu 4 thay đổi này đã được **chạy thử thật** bằng chrome-devtools trên `/settings` (tiêm style tương đương rồi đo). Kết quả kỳ vọng — Codex/Roo phải đo lại và khớp:

| Viewport | Cột thông tin: trước → sau | Chiều cao hàng: trước → sau | Chồng lấn sau |
|---|---|---|---|
| 1440 | 18px → **210px** | 83px → 97px (xuống 2 dòng) | **không** |
| 375  | 37px → **229px** | 83px → 97px (xuống 2 dòng) | **không** |
| 768  | 398px → **398px** (không đổi) | 53px → **53px** (giữ 1 dòng) | **không** |

Lệnh + thao tác bắt buộc:

1. `npx eslint components/settings/member-card.tsx` → exit 0
2. `npm run build` → exit 0
3. chrome-devtools mở `http://localhost:3001/settings`, lần lượt `emulate` **1440x900x1**, **375x812x3,mobile,touch**, **768x1024x2,mobile,touch**, mỗi lần chạy đoạn đo dưới đây và xác nhận `overlaps: false` ở cả 3, `infoW` khớp bảng trên:

```js
[...document.querySelectorAll('div')]
  .filter(d => typeof d.className === 'string' && d.className.includes('rounded-lg p-3 transition-colors'))
  .map(card => {
    const info = card.querySelector('.flex-1');
    const sel  = card.querySelector('.relative.w-32');
    const r1 = info.getBoundingClientRect(), r2 = sel.getBoundingClientRect();
    const ox = Math.min(r1.right, r2.right) - Math.max(r1.left, r2.left);
    const oy = Math.min(r1.bottom, r2.bottom) - Math.max(r1.top, r2.top);
    return {
      cardW: Math.round(card.getBoundingClientRect().width),
      infoW: Math.round(r1.width),
      rowH: Math.round(card.firstElementChild.getBoundingClientRect().height),
      overlaps: (ox > 0 && oy > 0),
    };
  });
```

4. Chụp màn hình `/settings` @1440 — mắt phải đọc được **đủ** tên, email, dòng quyền của cả 2 thành viên.

## 6. Ràng buộc / cạm bẫy phải giữ

- **CẤM dùng `md:` / `lg:`** cho việc này — bề ngang thẻ ngược chiều với breakpoint (xem §2). Sửa bằng breakpoint = hỏng tablet.
- **CẤM đụng** `components/settings/members-section.tsx`, `components/ui/select/SelectForm.tsx`, `app/styles/layout.css` (`.detail-grid`/`.detail-sidebar`). Ngoài locks.
- **Không dùng border** (Lesson #64) — 4 thay đổi trên chỉ là spacing/flex, không thêm viền.
- Giữ nguyên style code hiện có của file (thứ tự class kiểu Tailwind như file đang viết, không format lại cả file).
- Không đổi kiến trúc, không thêm container query (dự án hiện chưa dùng `@container` ở đâu — thêm là đổi kiến trúc, phải qua ADR).

## 7. Câu hỏi mở / rủi ro

- **Đổi thị giác có chủ đích:** ở desktop và phone, thẻ sẽ **cao thêm ~14px** vì select + nút xuống dòng 2. Đây là cái giá để đọc được tên/email — nếu user muốn giữ 1 dòng thì phương án thay thế là bỏ ô select khỏi thẻ (đưa vào menu), nhưng đó là đổi nghiệp vụ, phải mở task khác.
- **Chưa kiểm với tên dài thật:** dữ liệu hiện chỉ có 2 tài khoản ("Đinh Hân", "Admin"). Tên ~30 ký tự sẽ bị `truncate` — đúng ý đồ, nhưng chưa nhìn tận mắt.
- **Ngoài phạm vi, chỉ ghi nhận:** `agent/TASKS.yaml` trước task này **không parse được** — dòng 33 là một `notes:` mồ côi còn sót lại khi task `T-20260717-auth-employee-context-retry-timeout` được chuyển sang `done` (nội dung đó đã có sẵn trong mục `done` của chính task ấy). Đã gỡ dòng mồ côi để thêm được task này; nếu user muốn giữ, revert lại từ git.
