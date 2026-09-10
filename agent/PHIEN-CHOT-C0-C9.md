# QUYẾT ĐỊNH VẬN HÀNH C0–C9 — bản 3 (quyết từ dữ liệu, trình duyệt)

**02.09.2026.** Bản 1 hỏi theo lẽ thường ngành, bản 2 hỏi thói quen của chủ — cả hai sai vai. Bản này: **Claude quyết từ dữ liệu + code Mood, chủ duyệt bằng một chữ "OK" hoặc chỉ mục cần đổi.** Mỗi mục: quyết định · căn cứ · điều gì sẽ làm tôi đổi quyết định.

| C | QUYẾT ĐỊNH | Căn cứ (đo production 02/09) | Đổi nếu |
|---|---|---|---|
| **C0** | Ngưỡng HĐ chậm: **vàng >26 ngày · đỏ >43 ngày** kể từ ngày chụp; trạm "chờ khách chọn" vàng >14; in ấn theo dõi riêng, **không tính vào tiền kẹt** | 25 HĐ hoàn thành: chụp→thu đủ p50 12 / p75 26 / max 43; giao→thu = 0 ngày; in đặt→xong p50 36 và xảy ra **sau** thu. 13 HĐ đang chạy vượt max lịch sử | lịch sử 25 HĐ không đại diện (mùa cưới khác) — sẽ đo lại sau 90 ngày |
| **C1** | **Gỡ CRM khỏi vai `sale`** trong ma trận `lib/navigation.ts`. Không viết luật sở hữu lead bây giờ | 3 sale active · 4 lead · **100% do Admin tạo** — lỗ "sale sửa lead người khác" không ai đi qua | sale bắt đầu làm lead → mở lại + luật (b) thấy hết sửa của mình |
| **C2** | Giữ hiện trạng; warnings → "việc còn tồn" làm ở GĐ3, ưu tiên thấp | **0/25** HĐ đang chạy thiếu sự kiện, 0 thiếu checklist — chưa từng xảy ra | xuất hiện HĐ nào thiếu lịch |
| **C3** | **Không chặn chồng lịch.** Xoá 2 bản `checkEmployeeAvailability` chết; nếu sau này cần thì cảnh báo trùng *giờ*, không trùng *ngày* | lịch sử **12 cặp người-ngày có ≥2 việc** — ekip nhiều job/ngày là vận hành bình thường | chủ báo có ca đụng giờ thật |
| **C4** | **Không giới hạn ảnh chọn.** `selection_limit` giữ nguyên là tuỳ chọn thủ công (UI đã có ở drive-link-modal), không tự điền, không chặn, không thu thêm | "chọn" = chọn để hậu kỳ (code `getRetouchProgress`); gói cưới ghi "chỉnh sửa không giới hạn"; 0/90 gallery đặt limit là **hệ quả đúng**, không phải thiếu sót | muốn bán thêm ảnh vượt gói (GĐ4 tăng trưởng) |
| **C5** | Nhắc nợ lab = **mục bắt buộc trong checklist chốt sổ tháng** ("số hệ = số lab báo"). Không nhắc từng đơn | 22/26 phiếu ghi cùng ngày 24/08 cho đơn 23/05→27/07 → trả **gộp theo đợt**; còn nợ 1,9tr đã hiện đúng ở `/printing` | — |
| **C6** | **Tự chuyển `cho_xu_ly → dang_thuc_hien` khi ghi khoản thu đầu tiên** (tầng action, transition đã hợp lệ) | 5 HĐ chờ xử lý: **3 đã cọc 49–65 ngày** không ai chuyển — điểm kiểm soát "người bấm" không được dùng | — |
| **C7** | **Không dùng lương cứng.** Gỡ khối lương + chi phí cố định khỏi Mục tiêu; `attendance`/`evaluations` gỡ khỏi UI; R10 vẫn sửa (rẻ) nhưng hạ ưu tiên | **0/13 nhân sự có `base_salary`**; 8 ctv trả theo việc qua `work_tasks.cost` (đã trong phải-trả); sheet lương T5/T6 = 0đ; `fixed_costs` 0 dòng — tính năng M5 chưa từng dùng thật | chủ muốn lãi/lỗ tháng gồm lương → bật lại, nhập `base_salary` |
| **C8** | Bộ số chính thức (6): **doanh thu theo ngày chụp · tiền đã thu · lãi/lỗ tháng · tiền kẹt HĐ đang chạy · phải trả lab/thợ · số HĐ quá ngưỡng**. Gỡ health-score và break-even khỏi màn cho tới khi đọc đúng nguồn | 6 số này đang tính đúng từ sổ kỳ; health-score đọc bảng rỗng (xanh giả), break-even tự cộng | — |
| **C9** | **Lịch hiện mốc HĐ + công việc** (bỏ bộ lọc client, giữ lịch tay + Google). Sync Google cho sự kiện HĐ **tắt** cho tới khi sửa (GĐ3) | lịch tay 3 dòng · queue Google 0 · sync sự kiện **76 failed / 0 thành công** · client đang lọc bỏ 217 sự kiện + 166 việc → lịch trống | — |

## Hệ quả lên chương trình

- Bước #22 role-gate: `/crm` gate theo C1 (sale ra khỏi CRM) — đơn giản hơn dự kiến.
- Bước #24 policy: scope đọc HĐ theo **vai** (admin/manager toàn cục, còn lại theo `created_by`/`assigned_to`) — không cần chờ thêm.
- Bước #29 V9: ngưỡng 26/43/14 — có số ngay.
- Bước #30 Lịch: thêm việc **sửa hoặc tắt Google sync** (76 failed).
- Bước #32b: nhánh C7 = **gỡ**, không phải nhập lương.
- Bước #20 hàng đợi: rule "chờ ai" dùng đúng nghĩa "chọn = hậu kỳ".

**Cách duyệt:** trả lời "OK" → tất cả có hiệu lực, biên bản vào `vault/90-van-hanh-thuc-te/quyet-dinh-C0-C9.md`, sang bước #4. Muốn đổi mục nào thì nêu mục + lý do, tôi sửa đúng mục đó.
