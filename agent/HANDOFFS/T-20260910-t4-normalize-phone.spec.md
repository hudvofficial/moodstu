# T-20260910-t4-normalize-phone — T4: một `normalize_phone` cho mọi đường ghi SĐT khách + báo cáo khách trùng

**Owner:** claude (spec → chủ duyệt → claude áp DB + sửa app → commit ngay) · **Trạng thái:** ✅ ĐÃ ÁP PROD 10/09 (chủ "duyệt" 10/09) · commit `4b97747` · chủ "đẩy" 10/09 → `origin/main` · `/buoc done` 10/09 · **Chương trình:** GĐ2 tuần 7, bước #27 (`agent/GOALS.yaml`), gate #10 ✅ · **DB:** 3 hàm mới (`normalize_phone`, `trg_normalize_phone`, `customer_phone_report`) · 2 trigger · 2 index biểu thức · `convert_lead_to_customer` đổi 2 dòng · **0 dữ liệu** (không backfill) · **ADR:** không cần — không đổi data-flow/schema kiểu cột; thêm ràng buộc chuẩn hoá tại cửa ghi, khớp luật app đã có từ 05/2026 · **Revert:** `agent/HANDOFFS/T-20260910-t4-normalize-phone.revert.sql` (gỡ 7 đối tượng + thân hàm sống của RPC).

## 0. Vì sao

Sổ đối chiếu dòng 89: *"Convert lead → khách khớp khách cũ theo SĐT: RPC so `BTRIM`, `createCustomer` lưu bản `normalizePhone` ⇒ `+84…` ≠ `0…` → lead ghi +84 **tạo khách trùng**"*. PHUONG-AN T4: *"một hàm `normalizePhone` cho mọi đường ghi (kể cả RPC convert) + báo cáo khách trùng (backfill là quyết định riêng)"*. SĐT là khoá định danh khách (dedupe khi tạo khách, nối lead → khách, gợi ý khách ở kho/bán lẻ); mỗi đường ghi hiện dùng một luật khác nhau, nên cùng một người có thể thành 2 khách và lịch sử HĐ tách đôi.

## 1. Sự thật đã đo (10/09, chỉ đọc + diễn tập local)

**Đường ghi `customers.phone` / `crm_leads.phone` — 5 đường, 4 luật:**

| Đường | Luật hiện tại |
|---|---|
| `createCustomer` (`customer-actions.ts:53,135`) | bỏ khoảng trắng `-().`, `+84` → `0`, dedupe theo bản chuẩn |
| `updateCustomer` (`customer-actions.ts:230`) | **chỉ `trim()`** — sửa SĐT thành `+84…` là lọt |
| `createLead` / `updateLead` (`lead-actions.ts:192,200,263`) | **chỉ `trim()`**, dedupe theo chuỗi thô |
| `convert_lead_to_customer` (RPC, SECURITY DEFINER) | so `phone = BTRIM(lead.phone)`, ghi `BTRIM` |
| `save_contract_atomic` (RPC) dòng 42 | `phone = COALESCE(NULLIF(p_customer->>'phone',''), phone)` — thô từ form HĐ |

Ngoài khách: `vendor-actions.ts:32` (bỏ mọi ký tự không phải số, không đổi +84) và `stock-out-modal.tsx:55` (bỏ ký tự, `84`→`0`) — 2 bản sao nữa, module khác. `lib/utils.ts:99 formatPhone` chỉ để hiển thị. Moodie không ghi lead/khách.

**Dữ liệu prod:** `customers` 66 dòng, 66 có phone, **60** đúng dạng `0` + 9 số; **6 sai độ dài** (4 dòng 11 số: `07666777881`, `09909000999`, `06677888777`, `07654156777`; 2 dòng 9 số: `076888111`, `097681767`) — lỗi nhập, không phải lỗi định dạng; **0** dòng có `+84`/khoảng trắng/dấu. `crm_leads` 4 dòng, đều chuẩn. Khách trùng theo chuẩn: **0 nhóm**; lead sống trùng khách: 0 (1 lead đã chốt trùng đúng khách của nó). Trigger 2 bảng chỉ `updated_at` + `emit_realtime_signal`; index `phone` có 6 cái (btree + trgm), **chưa** có index theo bản chuẩn; `vendors` đã có `vendors_active_normalized_phone_uidx` (unique theo chữ số) — mẫu tốt. `auth.users.phone` UNIQUE là của Supabase, không đụng.

**Diễn tập cục bộ** (`mood_restore`): áp migration → `normalize_phone`: `+84 968 123 456`→`0968123456` · `090.123.4567`→`0901234567` · `(0901) 234-567`→`0901234567` · `84901234567`→`0901234567` · `0084901234567`→`0901234567` · `'  '`/`abc`→NULL · `097681767`/`07666777881` giữ nguyên (không đoán độ dài). Trigger: lead ghi `+84 968 123 456` lưu `0968123456`; khách INSERT `090.123.4567` → `0901234567`, UPDATE `(0912) 345-678` → `0912345678`, UPDATE cột khác không đụng phone. RPC convert: lead `+84 912 345 678` → nối vào khách `0912345678` có sẵn (`customer_id` trùng, số khách 65 → 65, lead `da_chot`). Báo cáo: đúng 6 dòng `sdt_khong_hop_le` (chính 6 khách trên), 0 `khach_trung`, 0 `lead_trung_khach`, 0 `chua_chuan`. `revert.sql` → 0 trigger/index/hàm mới, thân RPC về `WHERE phone = BTRIM(...)` ✓ → áp lại ✓. Backup 10/09 02:09 OK.

## 2. Phạm vi

### DB — `supabase/migrations/20260910130000_t4_normalize_phone_customers_leads.sql` (176 dòng, sinh từ thân hàm sống)

| Phần | Đối tượng | Nội dung |
|---|---|---|
| A | `normalize_phone(text)` IMMUTABLE STRICT | giữ chữ số; `84`+9 số hoặc `0084`+9 số → `0…`; rỗng → NULL; **không sửa độ dài** |
| B | `trg_normalize_phone()` + trigger `normalize_phone_before_write` BEFORE INSERT OR UPDATE OF `phone` trên `customers`, `crm_leads`; index `idx_customers_active_normalized_phone`, `idx_crm_leads_active_normalized_phone` (`WHERE deleted_at IS NULL`) | mọi đường ghi (app, RPC, service role, Moodie sau này) đều đi qua một luật — kể cả `save_contract_atomic` và `updateCustomer` |
| C | `convert_lead_to_customer` | đổi đúng 2 dòng có đánh dấu `-- #27`: `WHERE normalize_phone(phone) = normalize_phone(v_lead.phone)` và INSERT ghi `normalize_phone(v_lead.phone)`; chữ ký, ACL `{postgres, service_role}`, phần còn lại giữ nguyên |
| D | `customer_phone_report()` STABLE, chỉ `service_role` EXECUTE | 4 loại: `khach_trung` · `lead_trung_khach` · `sdt_khong_hop_le` · `chua_chuan` (ứng viên backfill) |

Không backfill: dòng cũ giữ nguyên cho tới lần ghi kế tiếp; báo cáo `chua_chuan` cho thấy còn bao nhiêu (hôm nay 0 vì dữ liệu đã sạch định dạng).

### App — 4 file sửa, 3 file mới (làm sau khi DB áp; DB tương thích ngược)
- `lib/phone.ts` (**mới**): `normalizePhone(input)` gương đúng luật SQL + `isValidVnPhone` (`^0\d{9}$`, chỉ để báo cáo/hiển thị, không chặn ghi).
- `app/actions/customer-actions.ts`: xoá bản local, import `lib/phone`; `updateCustomer` chuẩn hoá phone trước khi ghi (đóng lỗ dòng 230).
- `app/actions/lead-actions.ts`: `createLead`/`updateLead` chuẩn hoá trước khi dedupe + ghi (dedupe `.eq("phone", chuẩn)`).
- `app/actions/lead-lifecycle.ts`: khớp khách cũ theo bản chuẩn (`.eq("phone", normalizePhone(oldData.phone))`).
- `tests/unit/phone.test.ts` (**mới**): 8 ca gương §1.
- `scripts/verify-customers-phone.mjs` (**mới**, chỉ đọc, pooler như `db-q`) + `package.json` `verify:customers`: in `customer_phone_report()`; exit 1 khi có `khach_trung`.

Áp: `ALLOW_PROD_WRITE=1 node scripts/migrate-direct.mjs 20260910130000_t4_normalize_phone_customers_leads.sql` → §4 → app → `vault:db-truth` + `vault-gen-schema` → **commit ngay**. Push chờ chủ "đẩy".

## 3. Ngoài phạm vi
- **Backfill** 6 SĐT sai độ dài / dòng chưa chuẩn (hôm nay 0): quyết định riêng của chủ, báo cáo liệt kê sẵn. Không sửa dữ liệu ở đây.
- `alt_phone`, `bride_phone`, `groom_phone`, `receipts.customer_phone`, `dress_rentals.phone`, `employees.phone`: không phải khoá định danh khách → không trigger (ghi sổ 🟡 cho module tương ứng).
- `vendor-actions.ts` / `stock-out-modal.tsx`: module kho/NCC, giữ bản riêng (vendors đã có unique theo chữ số); gom về `lib/phone.ts` khi chạm module đó (#32b).
- Chặn SĐT sai độ dài ở form (`ZodCustomerCreate`): thay đổi UX, chưa có trong sổ.

## 4. Verify — số chờ điền

| Kiểm | Cách | Chờ |
|---|---|---|
| Local | §1 | ✓ |
| Áp prod | `migrate-direct` | "completed"; `pg_trigger` 2 · index 2 · hàm 3; `convert_lead_to_customer` chứa `normalize_phone(phone) =` ×1, ACL giữ `{postgres, service_role}`; `customer_phone_report` ACL `{postgres, service_role}` |
| Không đổi dữ liệu | count + phân bố `phone` 2 bảng trước/sau | khớp 100% (66 · 4) |
| Hàng rào thật | service role INSERT 1 lead `E2E T27` phone `+84 9xx…` → đọc lại → xoá | lưu `09xx…`; xoá sạch, sweep 0 |
| Báo cáo | `npm run verify:customers` | 6 `sdt_khong_hop_le` · 0 `khach_trung` · 0 `lead_trung_khach` · 0 `chua_chuan` |
| App | `jest tests/unit/phone.test.ts` 8/8 · `tsc` 0 · `eslint` 4 file · `npm run verify:crm`/`verify:contracts` nếu có | pass |
| Vault | `vault:db-truth` (+3 hàm, RPC đổi) · `vault-gen-schema` (trigger/index mới) · `khach-hang-crm` viết tay: luật SĐT | cập nhật |
| Rác | `sweep-e2e-residue.sql` | 0 |

## 5. Rủi ro & đường lùi
- Trigger đổi giá trị người dùng gõ (`+84…` → `0…`) ngay khi lưu → màn hình hiện bản chuẩn; đây là chủ đích (một dạng duy nhất).
- SĐT nước ngoài (không phải VN) sẽ bị bỏ dấu `+` nhưng giữ đủ chữ số — Mood chưa có khách nước ngoài (0/66); nếu có sau này, luật cần mở rộng, không mất dữ liệu số.
- `normalize_phone` IMMUTABLE nằm trong index: đổi luật sau này phải `REINDEX` 2 index — ghi chú ngay trong migration.
- Đường lùi: `revert.sql` gỡ 7 đối tượng + trả thân RPC sống, đã thử local; app cũ vẫn chạy với DB mới và ngược lại.

## 6. Kết quả — 10/09/2026

| Kiểm | Kết quả |
|---|---|
| Local | ✓ (§1) |
| Áp prod | `migrate-direct` "completed successfully". `pg_trigger` **2** · index **2** · hàm **3**; `convert_lead_to_customer` chứa `normalize_phone(phone) =`, không còn `WHERE phone = BTRIM`, ACL giữ `{postgres, service_role}`; `customer_phone_report` ACL `{postgres, service_role}`; `normalize_phone`/`trg_normalize_phone` EXECUTE anon/authenticated/service_role (trigger phải chạy được dưới mọi vai ghi) |
| Không đổi dữ liệu | `customers` 66 dòng · 66 có phone · 60 chuẩn · md5 chuỗi phone `aff21835` **trước = sau**; `crm_leads` 4 · md5 `3255eecf` trước = sau |
| Hàng rào thật | service role INSERT lead `E2E T27` `'+84 968 000 111'` → lưu **`0968000111`**; UPDATE `'(0912) 000-222'` → **`0912000222`**; xoá → `crm_leads` 4 → 4 |
| Báo cáo | `npm run verify:customers`: **0** `khach_trung` · 0 `lead_trung_khach` · **6** `sdt_khong_hop_le` (KH-023, 051, 053, 064, 065, 084) · 0 `chua_chuan` → exit 0 |
| App | `jest tests/unit/phone.test.ts` **9/9** · `eslint` 5 file 0 · `tsc` 0 |
| Vault | `vault:db-truth` 152 hàm (+3) · `vault-gen-schema`: `luoc-do-khach-hang-crm.md` có trigger + index mới · `40-module/khach-hang-crm.md` viết tay: bẫy `updateCustomer` gạch, thêm mục "Luật SĐT từ 10/09" |
| Rác | sweep 22 bảng/nhóm = **0**; `realtime_signals` 3 (tín hiệu thật) |
| Sổ | DB-CHANGELOG 2 dòng · GOALS #27 `cho-xem-diff` · sổ đối chiếu dòng 89 gạch khi `/buoc done` |
