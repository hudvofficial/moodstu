# Moodie Response Design System

## Mục tiêu

Moodie phải trình bày câu trả lời như một trợ lý vận hành đáng tin cậy: kết luận rõ, dữ liệu dễ quét, hành động an toàn và không tạo cảm giác một tài liệu Markdown thô. UI không phụ thuộc model format hoàn hảo và không render HTML, SVG hoặc Mermaid tùy ý.

## Nguyên tắc

1. **Conclusion first**: câu trả lời hoặc quyết định quan trọng xuất hiện trước chi tiết.
2. **One visual owner**: cùng một dữ liệu chỉ có một representation chính; typed artifacts ưu tiên hơn Markdown do model sinh.
3. **Progressive disclosure**: debug, nguồn kỹ thuật và dữ liệu dài chỉ mở rộng khi cần.
4. **Document, not bubbles**: assistant dùng cột tài liệu thoáng; chỉ user message dùng bubble gọn.
5. **Safe by construction**: chỉ render block và artifact đã được định kiểu, kiểm tra và giới hạn.
6. **Mobile is a different layout**: bảng đổi thành label/value cards; flow và gallery dùng snap-scroll.
7. **Quiet chrome**: border nhẹ, không card lồng card, shadow chỉ dùng cho floating controls.

## Response hierarchy

Thứ tự bắt buộc của một assistant response:

1. Text conclusion hoặc clarification.
2. KPI/metrics tối đa bốn mục.
3. Structured details: table, chart, timeline, gallery hoặc diagram.
4. Safe action previews.
5. Technical disclosure khi có tool/fallback/error.
6. Copy và timestamp.
7. Data sources.
8. Follow-up prompts.

Không đặt action bar giữa text và artifact. Không lặp KPI/table trong text khi typed part đã tồn tại.

## State matrix

| Tình huống | Representation chính | Quy tắc |
|---|---|---|
| Chào hỏi, xác nhận | 1–3 câu | Không heading, card hoặc catalog |
| Câu hỏi cần làm rõ | Một câu hỏi trực tiếp | Không tự tạo action hoặc dữ liệu |
| Trả lời giải thích | Paragraph, heading, list | Mỗi paragraph một ý; heading `##`/`###` |
| KPI nghiệp vụ | Metric grid | Tối đa 4 KPI, có đơn vị, số tabular |
| Danh sách label/value | Definition list | Dùng khi mỗi item có nhãn và giá trị |
| Dữ liệu nhiều cột | Typed/Markdown table | Desktop sticky table; mobile label/value cards |
| Dữ liệu dài | Internal scroll | Không làm toàn thread rộng hoặc quá cao |
| Chênh lệch/rủi ro | Info/warning callout | Dùng `Lưu ý:` hoặc `Cảnh báo:` |
| Tiến độ | Progress bars | Giá trị, target, phần trăm và hint |
| Xu hướng | Chart artifact | Có title, description, tooltip và insight |
| Lịch/sự kiện | Timeline | Trục rõ; không nested cards nặng |
| Hình ảnh | Gallery | Grid hoặc filmstrip snap-scroll |
| Quy trình | Diagram flow | Luồng ngang ổn định, scroll trên màn hình hẹp |
| Code | Fenced code block | Có language; không HTML/SVG/Mermaid tự sinh |
| Navigation/mutation | Action preview | Mutation luôn thể hiện approval state |
| Tool đang chạy | Thinking state | Dùng status server; fallback text chỉ khi thiếu status |
| Tool/fallback/error | Debug disclosure | Ẩn với response bình thường |
| Nguồn dữ liệu | Labeled source chips | Nằm cuối response, sau action bar |
| Hỏi tiếp | Quiet vertical rows | Tối đa số lượng có ích, không button card nặng |

## Responsive rules

- Thread text giữ readable line length, không kéo full viewport.
- User bubble tối đa khoảng 72% desktop và 88% mobile.
- KPI dùng hai cột trên mobile, tối đa bốn cột khi đủ rộng.
- Table desktop có `max-height` và sticky header.
- Table mobile không dùng horizontal table; mỗi row là một definition card.
- Gallery filmstrip và diagram dùng horizontal snap/scroll, không wrap phá cấu trúc.
- Chart dùng chiều cao thấp hơn trên mobile và tăng vừa phải ở desktop.
- Mọi interactive control có cursor, focus state, disabled state và target tối thiểu phù hợp.

## Presentation parser contract

Parser chỉ hỗ trợ các block an toàn:

- paragraph
- heading cấp 2–3
- ordered/unordered list
- definition list
- table
- info/warning callout
- quote
- separator
- fenced code

Parser phải phục hồi lỗi nhẹ như dangling `**`, nhưng không cố diễn giải arbitrary HTML. Text không nhận diện được luôn quay về paragraph an toàn.

## Typed artifact priority

Typed parts là nguồn hiển thị ưu tiên vì chúng có schema và dữ liệu đã kiểm tra:

1. `metric_grid`
2. `chart`
3. `timeline`
4. `table`
5. `gallery`
6. `diagram`

Khi `metric_grid` hoặc `kpi_cards` tồn tại, metric pairs trong model text bị bỏ qua. Khi typed `table` tồn tại, Markdown table trong model text bị bỏ qua.

## Action safety

- Navigation có thể chạy trực tiếp.
- Mutation phải tạo preview/approval trước khi thực thi.
- Chỉ action đang chạy được hiện spinner.
- Các action khác không được giả vờ đang chạy.
- Approval state phải có label rõ, không chỉ dựa vào màu.
- Description được phép tối đa hai dòng trên màn hình nhỏ.

## Performance

- Long message dùng `content-visibility: auto`.
- Chart được dynamic import và chỉ render khi container có kích thước hợp lệ.
- Không chạy rotating thinking timer khi server đã cung cấp status.
- Không render debug chrome cho response bình thường.
- Structured blocks không được lặp giữa text và metadata.

## Acceptance criteria

Một response system chỉ được coi là hoàn tất khi:

- Markdown table trong case công nợ không còn hiển thị ký tự `|`/`---` thô.
- KPI công nợ hiển thị thành grid có thể đọc nhanh.
- Chênh lệch dữ liệu hiển thị thành callout.
- Typed và Markdown table đều usable trên mobile và desktop.
- Text, artifact và action có thứ tự hierarchy đúng.
- Không có duplicate KPI/table khi metadata chứa typed artifact.
- Chỉ action active có spinner.
- Response bình thường không có debug noise.
- Loading, error, fallback và approval state có ngôn ngữ hình ảnh nhất quán.
- TypeScript, ESLint, unit tests và production build pass.
- Visual QA xác nhận desktop và mobile không overflow, không card nesting nặng và không typography bị co bất thường.

## Component mapping

- Text parser: `lib/moodie/presentation.ts`
- Text renderer: `components/moodie/moodie-response-content.tsx`
- Message hierarchy: `components/moodie/moodie-message-bubble.tsx`
- Typed artifacts: `components/moodie/moodie-message-parts.tsx`
- Legacy widgets: `components/moodie/moodie-widget-renderer.tsx`
- Charts: `components/moodie/moodie-chart-part.tsx`
- Safe actions: `components/moodie/moodie-action-previews.tsx`
- Technical disclosure: `components/moodie/moodie-debug-panel.tsx`
- Loading: `components/moodie/moodie-thinking-state.tsx`
- Thread behavior: `components/moodie/moodie-thread.tsx`
- Model output contract: `lib/moodie/model-prompt.ts`
