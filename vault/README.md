---
title: "Vault mood-studio — bộ nhớ thứ 2"
tags: [meta]
cap-nhat: 2026-08-07
---

# Vault mood-studio

Bộ nhớ dài hạn của hệ thống mood-studio. **Đây là nguồn chân lý về kiến trúc & nghiệp vụ.**
Mở bằng Obsidian (chọn thư mục `vault/` làm vault) hoặc đọc thẳng file markdown.

Bắt đầu từ [[00-INDEX]].

## Vault này giải quyết chuyện gì

Agent (Claude/Codex/Roo) mỗi phiên đều bắt đầu từ số 0: không nhớ hệ thống có bao nhiêu bảng, ai ghi vào bảng nào, module nào ràng buộc gì. Hệ quả thực tế đã xảy ra: hỏi lại thứ code đã trả lời sẵn, viết rủi ro không tồn tại vào spec, đề xuất util đã có.

Vault khắc phục bằng cách ghi sẵn **thứ không đọc ra được từ một file đơn lẻ**: bản đồ toàn cục, ràng buộc nghiệp vụ, và bẫy đã dẫm.

## Đọc theo tình huống

| Bạn đang làm gì | Đọc gì |
|---|---|
| Mới vào, cần nắm hệ thống | [[kien-truc-tong-quan]] → [[so-lieu-van-hanh]] → [[00-INDEX]] |
| Sắp sửa module X | `40-module/X.md` → `30-du-lieu/luoc-do-X.md` → [[bay-du-lieu]] |
| Cần biết đổi cột này ảnh hưởng gì | [[bang-doc-ghi]] + [[ban-do-route]] |
| Sắp viết spec | [[bay-du-lieu]] + [[bay-ui-react]] + [[adr-index]] |
| Sắp deploy | [[trien-khai-va-verify]] |
| Thắc mắc "sao hồi đó chọn thế" | [[adr-index]] |

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
   node scripts/vault-gen-schema.mjs     # đọc DB thật qua pooler
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
