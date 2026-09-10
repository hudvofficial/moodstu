---
title: "Vault mood-studio — bộ nhớ thứ 2"
tags: [meta]
cap-nhat: 2026-09-10
trang-thai: da-kiem-2026-09-10
---

# Vault mood-studio

Bộ nhớ dài hạn của hệ thống mood-studio. **Đây là nguồn chân lý về kiến trúc & nghiệp vụ.**
Mở bằng Obsidian (chọn thư mục `vault/` làm vault) hoặc đọc thẳng file markdown.

Bắt đầu từ [[00-INDEX]].

## Vault này giải quyết chuyện gì

Agent (Claude/Codex/Roo) mỗi phiên đều bắt đầu từ số 0: không nhớ hệ thống có bao nhiêu bảng, ai ghi vào bảng nào, module nào ràng buộc gì. Hệ quả thực tế đã xảy ra: hỏi lại thứ code đã trả lời sẵn, viết rủi ro không tồn tại vào spec, đề xuất util đã có.

Vault khắc phục bằng cách ghi sẵn **thứ không đọc ra được từ một file đơn lẻ**: bản đồ toàn cục, ràng buộc nghiệp vụ, và bẫy đã dẫm.

## Ba mức tin cậy — đọc nhãn trước khi tin nội dung

Mỗi file có `trang-thai:` trong frontmatter. Khi hai file mâu thuẫn, **mức cao thắng**.

| Nhãn | Nghĩa | Tin được để |
|---|---|---|
| `sinh-tu-dong` | Máy sinh thẳng từ database production hoặc từ import graph. Không ai sửa tay. | **Ra quyết định** |
| `da-kiem-<ngày>` | Viết tay, đã đối chiếu với lớp sinh tự động vào ngày đó. | Ra quyết định, trừ khi có migration mới sau ngày đó |
| _(không nhãn)_ | Viết tay, **chưa từng đối chiếu**. | Chỉ để định hướng — phải kiểm lại trước khi dùng |

Dòng `> ⚠️ CHƯA KIỂM (ngày): …` nằm giữa bài là chỗ tác giả **cố ý** để lộ khoảng mù. Đừng bỏ qua nó.

**Luật xử mâu thuẫn:** database thắng code, code thắng vault. Vault sai thì sửa vault, đừng sửa thực tế cho khớp tài liệu.

## Đọc theo tình huống

| Bạn đang làm gì | Đọc đúng những file này, theo thứ tự |
|---|---|
| **Mới vào phiên, chưa biết gì** | [`agent/SYSTEM_MAP.md`](../agent/SYSTEM_MAP.md) §0 cách đọc → §1 sơ đồ tổng → §5 phát hiện xuyên miền → rồi mới [[00-INDEX]] |
| Sắp sửa module X | `40-module/X.md` → `30-du-lieu/luoc-do-X.md` → `30-du-lieu/than-ham/X.md` → [[bay-du-lieu]] |
| **Đang thi hành chương trình tối ưu** | `agent/GOALS.yaml` (bước hiện tại) → `agent/PHUONG-AN.md` → [[quyet-dinh-C0-C9]] → `agent/inventory/00-lech-thiet-ke.md` → gõ `/buoc next` |
| Sắp chạm DB prod / chạy test | [[trien-khai-va-verify]] §S3 + §Quy trình đổi DB → `agent/DB-CHANGELOG.md` |
| **Sắp đụng tiền** | [[luong-tien]] → `30-du-lieu/than-ham/tai-chinh.md` → `agent/system-map/01-tien.md` |
| **Sắp đụng quyền / RLS** | [[rls-va-quyen]] (chân lý) → [[xac-thuc-phan-quyen]]. Nhớ: server action dùng service-role nên **RLS không áp dụng cho đường đó** |
| **Cần biết một hàm DB làm gì** | `30-du-lieu/than-ham/<nhóm>.md` — thân thật trên DB. **ĐỪNG đọc `supabase/migrations/`**: migration là lịch sử, có hàm bản trong repo cũ hơn bản đang chạy |
| Sắp xoá hàm hoặc bảng | [[ham-mo-coi]] trước, rồi mới tìm nơi gọi |
| Cần biết đổi cột này ảnh hưởng gì | [[bang-doc-ghi]] + [[ban-do-route]] — **và** `30-du-lieu/than-ham/` vì đường ghi qua RPC không hiện trong bang-doc-ghi |
| Sắp viết spec | [[bay-du-lieu]] + [[bay-ui-react]] + [[adr-index]] |
| Sắp deploy | [[trien-khai-va-verify]] |
| Thắc mắc "sao hồi đó chọn thế" | [[adr-index]] → `agent/DECISIONS.md` |
| Nghi tài liệu đã cũ | `npm run vault:db-truth` rồi so lại. Rẻ, chỉ đọc DB |

## Cấu trúc

```
00-INDEX.md          bản đồ toàn vault
10-nen-tang/         kiến trúc, auth, cache/realtime, bảo mật, responsive, quy ước, tích hợp
20-ban-do-code/      SINH TỰ ĐỘNG — route→action→bảng, action→bảng, bảng→nơi đọc/ghi
30-du-lieu/          SINH TỰ ĐỘNG — lược đồ 98 bảng theo module + RPC/enum
40-module/           12 module nghiệp vụ: làm gì, ràng buộc, file chính, cạm bẫy riêng
50-luong/            luồng xuyên module (vòng đời hợp đồng, dòng tiền, gallery)
60-bay/              bẫy đã dẫm — dữ liệu, UI/React, triển khai
70-quyet-dinh/       chỉ mục ADR
80-van-hanh/         deploy, verify, số liệu vận hành thật
```

## Quy tắc bảo trì

1. **Note sinh tự động không sửa tay.** `20-ban-do-code/` và `30-du-lieu/` có `sinh-tu:` trong frontmatter. Sửa tay sẽ bị ghi đè. Muốn cập nhật:
   ```bash
   node scripts/vault-gen-schema.mjs     # lược đồ bảng/cột/FK/index từ DB
   node scripts/vault-gen-db-truth.mjs   # thân hàm + nội dung RLS + hàm mồ côi
   node scripts/vault-gen-codemap.mjs    # đi theo import graph
   ```
   Chạy lại sau mỗi migration hoặc mỗi đợt thêm module.

2. **Ghi bẫy mới ngay khi gặp**, vào `60-bay/`. Bài học xuyên dự án thì nâng lên memory của Claude.

3. **Quyết định kiến trúc vẫn ghi ở [`agent/DECISIONS.md`](../agent/DECISIONS.md)** (append-only). [[adr-index]] chỉ là mục lục trỏ sang.

4. **Đụng độ với tài liệu cũ trong `docs/`**: vault thắng. Tài liệu cũ đã gắn cảnh báo lỗi thời, giữ lại để tra lịch sử.

## Cái vault này KHÔNG chứa

- Hướng dẫn hành vi agent → [`CLAUDE.md`](../CLAUDE.md), [`agent/AGENT_RULES.md`](../agent/AGENT_RULES.md)
- Trạng thái task đang chạy → [`agent/TASKS.yaml`](../agent/TASKS.yaml), [`agent/CURRENT_STATE.md`](../agent/CURRENT_STATE.md)
- Spec của task cụ thể → `agent/HANDOFFS/`
- Mood Pro (panel Photoshop + bridge ComfyUI) — **dự án khác, không liên quan**
