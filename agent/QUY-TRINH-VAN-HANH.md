# QUY TRÌNH VẬN HÀNH THỐNG NHẤT — mood-studio

**Bản thảo 1 · 2026-08-31 · chờ user chốt**

Mục đích: vẽ ranh giới rõ ràng cho từng bước vận hành — bước nào **hệ thống ép**, bước nào **để người quyết**, bước nào **đang trôi**. Sau khi chốt, ranh giới này trở thành hợp đồng giữa người và hệ thống: code phải khớp nó, và mọi thay đổi sau này đối chiếu với nó.

Toàn bộ lỗi nặng tìm được ngày 31/08 đều nằm ở loại **GIẢ ĐỊNH** — chỗ hệ thống mong người làm đúng mà không chặn. Không phải code sai; là ranh giới chưa từng được vẽ.

## Ba loại

| Loại | Nghĩa | Dấu hiệu trong code |
|---|---|---|
| 🔒 **ÉP** | Không đúng thì không đi tiếp được | `throw` trong action · CHECK constraint · `EXCEPTION` trong RPC |
| 👤 **NGƯỜI QUYẾT** | Hệ thống mong, không chặn — có chủ đích | cảnh báo mềm · confirm dialog · để trống |
| ⚠️ **ĐANG TRÔI** | Giả định nhưng không ai biết là giả định | dead code · cột không ràng buộc · quy trình chỉ tồn tại trong đầu người |

Mỗi trạm dưới đây có một ô **⬜ CHỐT** — câu hỏi cụ thể cần bạn quyết, không phải câu hỏi mở.

---

## Trạm 1 — Lead vào hệ thống

**Thực tế đã xác nhận:** khách nhắn Facebook → nhập tay vào CRM.

| | |
|---|---|
| 🔒 **ÉP** | Ma trận `VALID_LEAD_TRANSITIONS` · chặn trùng số điện thoại khi tạo · chỉ tạo được ở trạng thái `moi` · `convert_lead_to_customer` chặn convert hai lần và chặn số điện thoại rỗng |
| 👤 **NGƯỜI QUYẾT** | Khi nào chuyển giai đoạn · giá trị deal · nguồn khách |
| ⚠️ **ĐANG TRÔI** | **`sale` thao tác được lead của người khác** — `assertLeadVisibleToRole` chỉ gọi ở `updateLead`/`getLeadById`, toàn bộ `lead-lifecycle.ts` bỏ qua<br>**`markLeadAsLost` bỏ qua ma trận** — set thẳng `huy`, huỷ được cả lead `da_chot`<br>**Số điện thoại chuẩn hoá hai kiểu** — RPC convert so `BTRIM(phone)`, `createCustomer` lưu bản `normalizePhone` ⇒ lead ghi `+84…` không khớp khách đã lưu `0…` → **tạo khách trùng** |

**Đề xuất:** đưa `assertLeadVisibleToRole` vào toàn bộ vòng đời lead; `markLeadAsLost` đi qua ma trận; chuẩn hoá số điện thoại tại **một** chỗ duy nhất trước mọi phép so.

> ⬜ **CHỐT 1:** `sale` có được xem và sửa lead của người khác không? Ba khả năng: (a) chỉ lead mình tạo, (b) thấy hết nhưng chỉ sửa của mình, (c) thấy và sửa hết. Câu trả lời quyết định cách vá.

---

## Trạm 2 — Tạo hợp đồng

| | |
|---|---|
| 🔒 **ÉP** | `save_contract_atomic` một transaction cho `customers` + `contracts` + `contract_items` + `payment_plans` (+ `payments` nếu có cọc) · retry khi trùng mã · `p_expected_updated_at` chống hai người ghi đè nhau · trigger tính lại `paid`/`remaining`/`payment_status` |
| 👤 **NGƯỜI QUYẾT** | Giá hợp đồng · hạng mục · chia đợt thu |
| ⚠️ **ĐANG TRÔI** | **Ranh giới atomic hẹp hơn tài liệu mô tả.** `contract_events`, `contract_checklists`, `dress_reservations`, `addon_history`, đồng bộ Google chạy **ngoài** transaction, một phần trong `after()`. RPC thành công mà bước sau hỏng ⇒ hợp đồng vẫn tồn tại, **thiếu lịch hoặc thiếu checklist**, và người dùng chỉ thấy một dòng `warnings` rồi mất |

**Đề xuất:** `warnings` phải trở thành **việc cần làm còn tồn** hiển thị trên hợp đồng, không phải thông báo thoáng qua.

> ⬜ **CHỐT 2:** tạo hợp đồng mà không sinh được lịch sự kiện thì hệ thống nên (a) vẫn tạo rồi báo việc còn tồn, hay (b) từ chối tạo cả hợp đồng?

---

## Trạm 3 — Sự kiện, phân công, váy, vật tư

| | |
|---|---|
| 🔒 **ÉP** | Chồng lịch **váy** — `validateDressAvailability` · trạng thái công việc tự dẫn xuất lên trạng thái sự kiện (`checkAndCompleteEvent`) |
| 👤 **NGƯỜI QUYẾT** | Ai làm việc gì · chi phí ekip/thợ ngoài · thứ tự nghiệp vụ (hệ thống không ép chụp trước in) |
| ⚠️ **ĐANG TRÔI** | **Chồng lịch NHÂN SỰ đã chết** — `checkEmployeeAvailability` tồn tại ở hai nơi, **0 nơi gọi**. Một người xếp hai việc cùng giờ, không ai báo<br>**`work_tasks.status` là `text` không ràng buộc** — DB không có `task_status_enum`. Hệ quả đã đo: `salary-actions.ts` lọc `"Hoàn thành"` thay vì `hoan_thanh` ⇒ cảnh báo lập bảng lương **chưa từng chạy lần nào** |

**Đề xuất:** bật lại kiểm chồng lịch nhân sự; thêm CHECK constraint cho `work_tasks.status` và `contract_events.status` để sai chính tả không im lặng nữa.

> ⬜ **CHỐT 3:** chồng lịch nhân sự nên **chặn cứng** (không xếp được) hay **cảnh báo rồi cho qua** (có ca thật sự cần xếp trùng)?

---

## Trạm 4 — Gallery, khách chọn ảnh

| | |
|---|---|
| 🔒 **ÉP** | Ba mức token 12 giờ · chọn ảnh và ghi chú **cần mật khẩu** · 10 lần sai trong 15 phút thì khoá · tải ảnh cần hợp đồng đã thanh toán (nếu chưa → 402) |
| 👤 **NGƯỜI QUYẾT** | Khi nào chia sẻ · hạn chọn · có cho tải hay không |
| ⚠️ **ĐANG TRÔI** | Bốn server action không kiểm token (`getPublicGalleryStats`, `getReactionCounts`, `getClientReactions`, `getCommentCountsPerImage`) · `/api/drive-download/[fileId]` không kiểm gì · **Moodie ghi được vào gallery** sau khi người duyệt — tài liệu vẫn ghi "chỉ admin ghi, không có tác nhân thứ hai" |

**Đề xuất:** khoá bốn action theo token; cập nhật giả định về tác nhân ghi.

> ⬜ **CHỐT 4:** gói dịch vụ có ràng buộc **số ảnh khách được chọn** không? Hiện hệ thống **không ép** — khách chọn bao nhiêu cũng được. Nếu thực tế có giới hạn theo gói thì đây là luật cần đưa vào.

---

## Trạm 5 — In ấn và giao

| | |
|---|---|
| 🔒 **ÉP** | Máy trạng thái đơn in canh **hai lớp**: `VALID_TRANSITIONS` ở code **và** CHECK constraint ở DB · bắt buộc nhập lý do khi lùi bước hoặc báo sự cố · `payable_items` loại đơn đã huỷ khỏi công nợ |
| 👤 **NGƯỜI QUYẾT** | Chọn lab · giá in · khi nào giao |
| ⚠️ **ĐANG TRÔI** | ~~Ghi nhận trả nợ lab~~ — **ĐÍNH CHÍNH 02/09: luồng CÓ được dùng.** 26 phiếu chi 7.936.400đ đã ghi & phân bổ (di trú M2b từ `lab_payments` cũ), còn nợ thật 1.905.000đ; 22/26 phiếu ghi cùng ngày 24/08 ⇒ thói quen trả theo đợt gộp. Số "8,15tr chưa ghi" là ảnh chụp 24/08 trước M2b<br>**Huỷ hợp đồng có đơn in → lỗi 23514, abort cả transaction** (R1). Đang có 5 hợp đồng ở tình trạng này |

**Đề xuất:** sửa R1 trước (một chữ trong `cancel_contract_cascade`); đơn in `hoan_thanh` mà chưa có phân bổ chi thì nổi lên ở `/finance/payables` như việc còn tồn.

> ⬜ **CHỐT 5:** bạn trả tiền lab theo **từng đơn** hay **gộp cuối tháng**? Quyết định này đổi hoàn toàn cách nhắc: theo đơn thì nhắc ngay khi giao, theo tháng thì nhắc trong quy trình chốt sổ.

---

## Trạm 6 — Thu tiền

| | |
|---|---|
| 🔒 **ÉP** | Chặn ghi vào kỳ đã khoá · chặn thu cho hợp đồng `da_huy` · chặn thu quá số còn lại · phát sinh tăng bắt buộc lý do ≥ 5 ký tự và phải đang ở trạng thái đã thu đủ · huỷ phiếu thu tự tính lại toàn bộ công nợ |
| 👤 **NGƯỜI QUYẾT** | Thu bao nhiêu, khi nào · đợt nào |
| ⚠️ **ĐANG TRÔI** | **Hợp đồng KHÔNG tự chuyển `dang_thuc_hien` khi thu tiền** — phải người bấm. Hợp đồng đã nhận cọc vẫn có thể nằm `cho_xu_ly` mãi mãi |

> ⬜ **CHỐT 6:** thu cọc xong thì hợp đồng nên **tự chuyển** sang `dang_thuc_hien`, hay giữ nguyên để người bấm? Tự chuyển thì bớt một thao tác nhưng mất một điểm kiểm soát.

---

## Trạm 7 — Chốt sổ tháng

| | |
|---|---|
| 🔒 **ÉP** | `is_period_locked` chặn **mọi** RPC tiền ghi vào kỳ đã chốt — thu, chi, lương. Đây là cơ cấu duy nhất biến quá khứ thành bất biến |
| 👤 **NGƯỜI QUYẾT** | Khi nào chốt · ai chốt · thứ tự các việc trong tháng |
| ⚠️ **ĐANG TRÔI** | **Bảng lương và chi phí cố định chưa từng được dùng.** Đo trên DB: `monthly_salaries` tháng 8 = **0 dòng**, `fixed_costs` = **0 dòng**. Tính năng M5 ship 27/08 nhưng chưa có dữ liệu<br>Hệ quả: lỗi trừ trùng ở `/finance/goals` (R10) **chưa sai số** — nhưng sẽ sai ngay lần đầu bạn lập bảng lương |

> ⬜ **CHỐT 7:** bảng lương và chi phí cố định có định đưa vào hệ thống không, hay để ngoài? Nếu **có** thì phải sửa R10 trước khi nhập dữ liệu đầu tiên. Nếu **không** thì gỡ hai khối đó khỏi màn Mục tiêu cho khỏi hiểu nhầm.

---

## Trạm 8 — Đọc số và ra quyết định

| | |
|---|---|
| 🔒 **ÉP** | Không gì cả. Đây là trạm chỉ đọc |
| ⚠️ **ĐANG TRÔI** | **`/dashboard` không đọc sổ kỳ.** Thẻ "Doanh thu tháng" hiển thị **18.350.000** — đó là **tiền đã thu**, không phải doanh thu. Doanh thu thật là **46.325.000** theo `finance_month_summary(8,2026)`. Lệch 27.975.000đ ngay trên màn hình mở đầu mỗi ngày<br>`/finance/goals` tự cộng lại và trừ trùng lương + chi phí cố định<br>`/reports` tab "Dòng tiền" dùng công thức thứ hai, nằm cạnh số từ sổ kỳ trong cùng một file Excel |

> ⬜ **CHỐT 8:** trong các số hệ thống phun ra — doanh thu, két, lãi/lỗ, phải thu, phải trả, break-even, mục tiêu — số nào bạn **thật sự dùng để quyết định**? Con số sai mà không ai dùng thì xếp sau con số đúng mà dẫn tới quyết định sai.

---

## Sau khi chốt

Tám ô chốt ở trên biến thành:
1. **Luật hệ thống** — mỗi quyết định "nên ép" thành một ràng buộc ở DB hoặc một `throw` ở action, kèm test.
2. **Quy trình người** — mỗi quyết định "để người" được viết thành bước có người chịu trách nhiệm, đặt trong `vault/90-van-hanh-thuc-te/`.
3. **Danh sách sửa có thứ tự** — thay cho sổ rủi ro 11 mục hiện tại, vốn xếp theo mức độ kỹ thuật chứ chưa theo giá trị vận hành.

Đó mới là quy trình thống nhất. Sổ rủi ro chỉ liệt kê chỗ hỏng; cái này quyết định **hệ thống nên hành xử thế nào**.
