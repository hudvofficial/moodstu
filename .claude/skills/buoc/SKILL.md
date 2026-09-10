---
name: buoc
description: Thi hành chương trình tối ưu mood-studio ĐÚNG MỘT bước mỗi lần theo sổ agent/GOALS.yaml — đúng thứ tự, đúng cổng, chỉ "done" khi có bằng chứng verify. Dùng khi chủ gõ /buoc, /buoc next, /buoc duyệt, /buoc done, /buoc <id>, /buoc status. (Tên "goal" bị lệnh có sẵn của Claude Code chiếm.) Từ chối mọi việc không có trong sổ.
---

# /buoc — một bước, một lần, có bằng chứng

## Luật sắt

```
KHÔNG CÓ TRONG agent/GOALS.yaml  →  KHÔNG LÀM
KHÔNG QUA GATE                   →  KHÔNG BẮT ĐẦU
KHÔNG CÓ bang_chung              →  KHÔNG done
```

Việc ngoài sổ mà chủ yêu cầu → trả lời đúng một câu: *"Việc này chưa có trong sổ 32 bước. Thêm vào sổ (ghi lý do + gate) rồi làm, hay bỏ?"* — chủ quyết, không tự thêm.

## Nguồn chân lý (đọc trước khi làm gì)
1. `agent/GOALS.yaml` — trạng thái từng bước, gate, bằng chứng.
2. `agent/PHUONG-AN.md` — nội dung chương trình (vì sao, chuẩn, cổng).
3. `vault/90-van-hanh-thuc-te/quyet-dinh-C0-C9.md` — 10 luật đã chốt; spec đụng tới phải tuân.
4. `agent/AGENT_RULES.md` + `CLAUDE.md` — pipeline 2 cổng người; E2E chạm prod; khoá kiến trúc.
5. Skill `verification-before-completion` — bắt buộc trước khi ghi done.

## Lệnh

| Gõ | Làm gì |
|---|---|
| `/buoc` hoặc `/buoc status` | In **thẻ trạng thái** (mẫu dưới). Không làm gì khác. |
| `/buoc next` | Chọn bước có `status: todo` nhỏ nhất mà **mọi gate đã done** (cổng G* phải `trang_thai: qua`). Thi hành theo `hinh_thuc`. |
| `/buoc <id>` | Như `next` nhưng bước chỉ định. Gate chưa đủ → **từ chối**, in đúng gate thiếu. |
| `/buoc duyệt` | Bước đang `cho-duyet` → `dang-lam`: code + verify theo spec → điền §Kết quả spec → `cho-xem-diff` → in `git diff --stat` + cách xem. |
| `/buoc done` | Bước `cho-xem-diff` (chủ đã xem diff) hoặc bước `chu`/`chung` chủ báo xong → kiểm `bang_chung` có thật → ghi `status: done`, `ngay_done`, `bang_chung` → cập nhật `buoc_hien_tai` → in thẻ trạng thái. |
| `/buoc hoãn <id> <lý do>` | `status: hoan` kèm lý do — không xoá khỏi sổ. |

## Thi hành theo hình thức

- **`doc`** (👁 chỉ đọc): làm ngay, không hỏi. Ghi kết quả số vào `bang_chung`. Cấm mọi lệnh ghi DB.
- **`chu`** (👤): in hướng dẫn + dữ liệu chủ cần (từ `huong_dan`), rồi dừng. Done khi chủ báo.
- **`chung`** (🤝): in tài liệu trình, chờ chủ.
- **`spec`** (📄): (1) viết `agent/HANDOFFS/T-YYYYMMDD-<slug>.spec.md` theo mẫu spec hiện có trong thư mục — có §0 vì sao (trỏ về sổ đối chiếu/bảng kiến trúc), §phạm vi, §ngoài phạm vi, §verify với SỐ chờ, §rủi ro & đường lùi, §kết quả trống; (2) ghi `spec:` vào GOALS.yaml, `status: cho-duyet`; (3) in **thẻ duyệt** (mẫu dưới) và DỪNG — không code khi chưa "duyệt".
- **`db`** (🗄️): như `spec` **cộng**: dump thân hàm/policy đang sống từ DB vào `agent/HANDOFFS/<slug>.revert.sql` TRƯỚC · ghi dòng vào `agent/DB-CHANGELOG.md` TRƯỚC khi áp · xác nhận backup đêm gần nhất OK (`H:ackups\mood-studioackup.log`) · diễn tập trên cluster local `restore-test` nếu đổi hàm tính tiền · sau áp: `npm run vault:db-truth` rồi **COMMIT NGAY** migration + revert + CHANGELOG + vault + sổ (repo phải khớp DB ngay lập tức — không chờ `/buoc done`; chủ đã duyệt spec là cổng; bài học 07/09 #12). Push vẫn chờ chủ nói "đẩy". `/buoc done` cho bước db chỉ còn ghi bằng chứng.

## Hai mẫu in — chỉ hai, không thêm

**Thẻ trạng thái** (`/buoc`, sau mỗi `done`):
```
GĐ1 · NỀN MÓNG — bước 6/32 · cổng G1 mở
✅ 1 2 3 4 5   ⏳ 6 (chủ: nhắn 5 khách)   ⬜ 7 8 9 10 11 …
Kế tiếp làm được ngay: #8 nhãn Doanh thu (spec) · #9 filter lương (spec) · #10 cờ script (spec)
Chờ chủ: #6 nhắn khách · #7 diễn tập restore
```

**Thẻ duyệt** (khi spec xong):
```
#8 · Sửa nhãn "Doanh thu" trên Trang chủ
Vì sao : thẻ đầu tiên mỗi sáng hiện tiền-đã-thu (18,35tr) dưới nhãn doanh thu (thật 46,33tr) — sổ đối chiếu R7
Sẽ đổi : 1 file (components/dashboard/…), đọc finance_month_summary().revenue; thêm thẻ "Đã thu (két)"
Không đổi: hàm DB, dữ liệu, các thẻ khác
Verify : số trên màn = số RPC, chênh 0đ
Bạn cần: gõ "duyệt"  (hoặc "bỏ" / "sửa: …")
```

Thẻ duyệt tối đa 6 dòng. Chủ không cần đọc spec để quyết — spec là để Claude tự ràng buộc mình.

## Sau mỗi `done`
1. Cập nhật `agent/GOALS.yaml` (status · ngay_done · bang_chung · buoc_hien_tai · updated).
2. Nếu bước vừa xong đóng được một cổng → đổi `cong.G*.trang_thai = qua` và in dòng "⛩ G* QUA — mở GĐ*".
3. Nếu bước có hệ quả lên hồ sơ (số đo mới, phát hiện mới) → sửa đúng chỗ trong `agent/inventory/00-lech-thiet-ke.md` / `SYSTEM_MAP.md`, không viết file mới.
4. `mem_save` một dòng tiến độ.
5. In thẻ trạng thái. **Không** tự chạy bước kế — chờ chủ gõ `/buoc next`.

## Luật vận hành ≠ kỹ thuật (chủ chốt 06–07/09)
- HĐ đang chạy, khách chưa trả, mốc chưa đánh, đơn in đang mở = **vận hành thật**, không phải dữ liệu bẩn. Chương trình chỉ sửa **hệ thống** (bug, hàm, ràng buộc, màn hình). Không bao giờ đặt "chủ phải dọn/đóng/huỷ/thu" làm điều kiện cổng hay bước gate.
- Thấy dữ liệu "lệch" do thao tác người → đó là **lỗ của hệ** (thiếu CHECK, thiếu nhắc, cho đóng khi chưa xong) → ghi sổ đối chiếu cho bước kỹ thuật (#26/#30…), không giao việc tay.
- Nhắc việc vận hành: **chỉ** trong V0 thứ Hai, 1 dòng, không gate.

## Sau MỌI lần chạm prod bằng test (e2e, jest live, script probe/seed)
1. `node scripts/db-q.mjs "$(cat scripts/sweep-e2e-residue.sql)"` — 23 bảng, mọi `n` = 0 (trừ `realtime_signals`). Khác 0 → dọn ngay bằng API service-role (cờ S3), quét lại, ghi `DB-CHANGELOG`.
2. Dán bảng số vào §6 spec. Không dán = chưa xong. (Chủ 10/09: "mỗi lần test mình dặn bạn phải dọn mà không chịu dọn" — sweep cũ chỉ quét `department='E2E'`, sót 86 dòng 2 tuần.)

## Cấm
- Gộp nhiều bước vào một lần chạy.
- Mở trang/artifact/tài liệu mới ngoài: spec của bước, sửa hồ sơ hiện có, GOALS.yaml.
- Đặt câu hỏi mở cho chủ; chỉ dùng 3 lựa chọn "duyệt / bỏ / sửa: …".
- Ghi `done` khi verify chưa chạy hoặc kết quả không có số.
- Chạy `node scripts/db-q.mjs` với lệnh ghi; E2E full suite (chạm prod).
