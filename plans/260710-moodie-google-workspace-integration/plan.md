# Moodie × Google Workspace Integration Plan

## 1. Mục tiêu

Cho Moodie hiểu và trả lời chính xác dựa trên hai nguồn dữ liệu đang vận hành trong Mood Studio:

1. **Lịch làm việc** tại menu `Lịch`, bao gồm lịch nội bộ và sự kiện Google Calendar.
2. **Ảnh trả khách** từ Google Drive/Gallery trong trang chi tiết hợp đồng.

Moodie phải dùng lại quyền truy cập, OAuth, dữ liệu đồng bộ và UI hiện có; không tạo một đường truy cập Google song song hoặc để model nhìn thấy token, API key hay URL riêng tư.

## 2. Hiện trạng đã xác minh

### Google Calendar

- OAuth hiện yêu cầu cả Calendar và Drive scope tại `app/api/auth/google/route.ts`.
- Calendar nội bộ đọc qua `fetchCalendarEvents()` và RPC `calendar_month_events`.
- Sự kiện Google-only được đọc qua `fetchCalendarGoogleEvents()` và `getGoogleCalendarEvents()`.
- Sự kiện nội bộ đẩy lên Google bằng `google_sync_queue` và worker `app/api/calendar/sync-worker/route.ts`.
- Quyền lịch được kiểm tra tập trung bằng `requireCalendarAccess()` trong `lib/calendar-auth.ts`.
- Tool Moodie hiện tại `get_upcoming_schedules` chỉ đọc `contract_events`; vì vậy chưa phản ánh đầy đủ những gì user nhìn thấy trong menu `Lịch`.

### Google Drive và Gallery

- Hợp đồng liên kết Drive qua bảng `galleries` với `drive_folder_id` và `drive_folder_url`.
- File Drive được đồng bộ thành `gallery_images` với `drive_file_id`, `thumbnail_url`, `image_url` và metadata ảnh.
- `syncDriveFolder()` dùng `fetchDriveFiles()` để nhập file mới từ Drive.
- Chi tiết hợp đồng đã có `DriveGalleryBlock`, gallery summary, tiến độ retouch, ngày trả ảnh và share link.
- Quyền truy cập hợp đồng được kiểm tra bằng `requireContractAccess()`.
- Moodie hiện chưa có tool đọc gallery, trạng thái ảnh hoặc ảnh trả khách.

## 3. Quyết định kiến trúc

### 3.1 Không gọi Google trực tiếp từ model

Model chỉ gọi Moodie tools. Tool chạy server-side và tái sử dụng service/action hiện có.

```text
User → Moodie Engine → Tool Gateway
                         ├─ Calendar domain service
                         │    ├─ Supabase calendar RPC
                         │    └─ Google Calendar service
                         └─ Gallery domain service
                              ├─ Supabase galleries/images
                              └─ Google Drive sync service
```

### 3.2 Chưa cần MCP ở giai đoạn đầu

Calendar và Drive đã có OAuth/service/server action. Dựng MCP ngay sẽ tạo thêm:

- một lớp auth mới;
- nguy cơ token bị dùng ngoài permission boundary;
- logic dedupe/sync trùng với app;
- thêm latency và điểm lỗi.

MCP chỉ nên được thêm sau khi tool contract ổn định, nếu Moodie cần kết nối thêm hệ thống ngoài Mood Studio hoặc cần dùng cùng tool từ nhiều agent/client.

### 3.3 Đọc từ dữ liệu đã chuẩn hóa trước

- Calendar: dùng cùng unified event contract với menu `Lịch`.
- Drive: đọc `galleries` và `gallery_images` trước, không gọi Drive API trực tiếp trong mỗi câu chat.
- Chỉ gọi sync Drive/Google khi user yêu cầu rõ và qua action approval.

## 4. Tool contract đề xuất

### 4.1 `get_calendar_agenda`

Thay thế dần `get_upcoming_schedules` bằng tool phản ánh đúng menu `Lịch`.

**Input**

```ts
{
  range: "today" | "tomorrow" | "week" | "custom";
  start_date?: string;
  end_date?: string;
  employee_id?: string;
  include_google?: boolean;
  include_tasks?: boolean;
  limit?: number;
}
```

**Output**

```ts
{
  range: { start: string; end: string; label: string };
  totals: {
    all: number;
    studio: number;
    google: number;
    tasks: number;
  };
  events: Array<{
    id: string;
    source: "schedule" | "task" | "google";
    title: string;
    start: string;
    end: string | null;
    all_day: boolean;
    employee_name: string | null;
    contract_id: string | null;
    contract_code: string | null;
    customer_name: string | null;
    location: string | null;
    status: string | null;
    google_event_id: string | null;
  }>;
}
```

**Quy tắc**

- Gọi `requireCalendarAccess()` trước khi đọc.
- Admin/manager xem lịch toàn studio; role khác chỉ xem lịch được phép theo logic hiện tại.
- Merge `fetchCalendarEvents()` và `fetchCalendarGoogleEvents()` song song bằng `Promise.all()`.
- Dedupe bằng `googleEventId` và source ID giống menu `Lịch`.
- Không trả OAuth token hoặc raw Google payload.
- `htmlLink` chỉ đưa vào action metadata để nút “Mở trong Google Calendar” sử dụng, không chèn vào prompt model.

### 4.2 `get_contract_delivery_assets`

Cho Moodie trả lời: hợp đồng có bao nhiêu album, bao nhiêu ảnh, đã sửa/chọn/giao chưa, ngày trả ảnh và link gallery có sẵn hay chưa.

**Input**

```ts
{
  contract_id?: string;
  contract_code?: string;
  customer_query?: string;
  include_cover_preview?: boolean;
}
```

**Output**

```ts
{
  contract: {
    id: string;
    code: string | null;
    customer_name: string | null;
    delivery_date: string | null;
  };
  totals: {
    galleries: number;
    images: number;
    selected: number;
  };
  retouch_progress: {
    selected_count: number;
    edited_count: number;
    percent: number;
  };
  galleries: Array<{
    id: string;
    title: string | null;
    folder_type: string | null;
    status: string;
    image_count: number;
    selected_count: number;
    shared_at: string | null;
    has_password: boolean;
    cover_thumbnail: string | null;
    has_drive_folder: boolean;
    has_active_share_link: boolean;
  }>;
}
```

**Quy tắc**

- Resolve hợp đồng bằng tool/search service hiện có.
- Gọi `requireContractAccess()` trước khi đọc gallery.
- Tái sử dụng `getGallerySummariesByContract()`, retouch progress và delivery date query.
- Không trả `drive_folder_url`, password hash, access token hoặc private share capability cho model.
- Cover thumbnail chỉ đi vào widget/artifact metadata; không đưa URL vào model prompt.

### 4.3 `list_contract_gallery_images`

Tool bổ sung khi user hỏi cụ thể “cho xem ảnh”, không gọi trong câu hỏi tổng quan.

**Input**

```ts
{
  gallery_id: string;
  filter?: "all" | "selected" | "starred" | "edited";
  cursor?: string;
  limit?: number;
}
```

**Output giới hạn**

- Tối đa 12–24 ảnh mỗi lần.
- Chỉ trả ID nội bộ, tên file, kích thước, trạng thái chọn và thumbnail proxy/CDN đã được app cho phép.
- Không trả file gốc, OAuth token hay URL download trực tiếp cho model.

### 4.4 Các action có side effect

Không cho model tự chạy. Chỉ tạo preview và yêu cầu xác nhận:

- `sync_google_calendar_now`
- `sync_contract_drive_gallery`
- `create_or_refresh_gallery_share_link`
- `open_calendar_event`
- `open_contract_gallery`

Ba action đầu phải qua `moodie_action_approvals`; hai action mở trang chỉ tạo safe-navigation action.

## 5. Message parts và UI

### 5.0 Khoảng trống visual hiện tại

Moodie hiện chỉ hỗ trợ ba widget:

- `kpi_cards`;
- `progress_bars`;
- `comparison_bars`.

Vì vậy output như ảnh hiện tại vẫn chủ yếu là đoạn văn, bullet và chip. Moodie chưa có typed contract cho biểu đồ xu hướng, timeline lịch, bảng dữ liệu, gallery ảnh, sơ đồ quy trình hoặc quan hệ giữa các thực thể.

### 5.1 Visual output contract

Thay `widgets` đơn lẻ bằng content parts có kiểu rõ ràng:

```ts
type MoodieMessagePart =
  | MoodieTextPart
  | MoodieMetricGridPart
  | MoodieChartPart
  | MoodieTimelinePart
  | MoodieTablePart
  | MoodieGalleryPart
  | MoodieDiagramPart
  | MoodieSourcePart
  | MoodieActionPart
  | MoodieErrorPart;
```

`MoodieMessageMeta.widgets` được giữ tương thích trong giai đoạn chuyển đổi, sau đó derive sang `parts` khi đọc hội thoại cũ.

### 5.2 Chart artifact

Hỗ trợ các loại chart có giá trị nghiệp vụ rõ ràng:

- `bar`: doanh thu theo tháng, công nợ theo bucket, số lịch theo ngày;
- `stacked_bar`: phải thu/phải trả, nguồn lịch Studio/Google;
- `line`: xu hướng doanh thu, số booking, tiến độ theo thời gian;
- `area`: cashflow hoặc forecast;
- `donut`: cơ cấu dịch vụ, trạng thái hợp đồng, trạng thái gallery;
- `sparkline`: xu hướng nhỏ trong KPI card.

```ts
type MoodieChartPart = {
  type: "chart";
  chart: "bar" | "stacked_bar" | "line" | "area" | "donut" | "sparkline";
  title: string;
  description?: string;
  x_key: string;
  series: Array<{
    key: string;
    label: string;
    color_token: "primary" | "positive" | "warning" | "danger" | "info";
    value_format?: "number" | "currency" | "percent" | "duration";
  }>;
  data: Array<Record<string, string | number | null>>;
  insight?: string;
};
```

**Renderer:** Recharts đã có sẵn trong repo. Tái sử dụng `SafeResponsiveContainer`, tooltip và formatters hiện tại. Chart component phải được dynamic import để không đẩy Recharts vào initial Moodie bundle khi câu trả lời không có chart.

**Giới hạn:** tối đa 30 điểm dữ liệu và 4 series; nếu vượt giới hạn phải aggregate hoặc chuyển sang table có pagination.

### 5.3 Timeline artifact

Calendar không nên hiển thị thành bullet dài như hiện tại. Dùng timeline/ngày agenda:

```ts
type MoodieTimelinePart = {
  type: "timeline";
  title: string;
  groups: Array<{
    date: string;
    label: string;
    items: Array<{
      id: string;
      time_label: string;
      title: string;
      subtitle?: string;
      source: "studio" | "google" | "task";
      status?: string;
      tone?: MoodieWidgetTone;
      actions?: MoodieActionPreview[];
    }>;
  }>;
};
```

Trong trường hợp ảnh minh họa, Moodie phải render một timeline compact với một event card thay vì lặp các bullet “Ngày”, “Hợp đồng”, “Trạng thái”.

### 5.4 Table artifact

Dùng cho hợp đồng, công nợ, lịch hoặc danh sách ảnh khi user cần so sánh nhiều hàng.

```ts
type MoodieTablePart = {
  type: "table";
  title: string;
  columns: Array<{
    key: string;
    label: string;
    align?: "left" | "center" | "right";
    format?: "text" | "date" | "currency" | "percent" | "status";
  }>;
  rows: Array<Record<string, string | number | null>>;
  row_actions?: Array<{ label: string; action: string }>;
  truncated?: boolean;
};
```

- Desktop: table compact.
- Mobile: tự chuyển thành stacked rows/cards.
- Tối đa 20 hàng trong chat; dữ liệu dài có action “Mở trang đầy đủ”.

### 5.5 Gallery artifact

Dùng cho ảnh trả khách:

```ts
type MoodieGalleryPart = {
  type: "gallery";
  title: string;
  summary?: string;
  layout: "grid" | "filmstrip";
  items: Array<{
    id: string;
    thumbnail_url: string;
    alt: string;
    file_name?: string;
    selected?: boolean;
    starred?: boolean;
    dimensions?: { width: number; height: number };
  }>;
  total_count: number;
  actions: MoodieActionPreview[];
};
```

- Chỉ render thumbnail đã qua allowlist/proxy hiện có.
- Lazy-load ảnh và dùng `content-visibility` cho gallery dài.
- Không gửi URL ảnh vào text prompt của model.
- Không render quá 6 ảnh mặc định; user bấm “Xem thêm” để mở gallery thật.

### 5.6 Diagram artifact

Hỗ trợ sơ đồ nghiệp vụ và quan hệ, nhưng không nhận HTML, SVG hoặc Mermaid string tùy ý từ model.

```ts
type MoodieDiagramPart = {
  type: "diagram";
  diagram: "flow" | "relationship" | "funnel" | "status_flow";
  title: string;
  nodes: Array<{
    id: string;
    label: string;
    subtitle?: string;
    kind: "start" | "process" | "decision" | "entity" | "status" | "end";
    tone?: MoodieWidgetTone;
  }>;
  edges: Array<{
    from: string;
    to: string;
    label?: string;
  }>;
};
```

**Giai đoạn đầu:** renderer SVG nội bộ cho flow đơn giản, giới hạn 12 node và 16 edge.

**Giai đoạn sau:** chỉ thêm `@xyflow/react` nếu cần pan/zoom và sơ đồ tương tác. Không dùng Mermaid runtime từ model vì khó kiểm soát nội dung, layout, accessibility và chi phí bundle.

Ví dụ:

- quy trình hợp đồng → lịch chụp → hậu kỳ → gallery → giao khách;
- funnel lead → tư vấn → hợp đồng → thanh toán;
- quan hệ hợp đồng, khách hàng, sự kiện và album ảnh;
- luồng phê duyệt action của Moodie.

### 5.7 Visual planner

Model không tự quyết schema visual tùy ý. Server chọn visual từ dữ liệu tool bằng deterministic planner:

```text
1–4 số liệu độc lập       → metric grid
Chuỗi thời gian           → line/area chart
So sánh danh mục          → bar/donut chart
Sự kiện có ngày giờ       → timeline
Nhiều bản ghi chi tiết    → table
Danh sách thumbnail       → gallery
Node và quan hệ           → diagram
Không đủ dữ liệu          → text, không tạo chart giả
```

Thêm `lib/moodie/visual-planner.ts` để:

- xác thực loại dữ liệu;
- chọn artifact phù hợp;
- giới hạn số điểm/series;
- format nhãn tiếng Việt;
- tạo insight dựa trên số liệu thật;
- từ chối chart khi dữ liệu không đủ hoặc không cùng đơn vị.

### 5.8 Visual renderer architecture

```text
MoodieMessageBubble
  └─ MoodieMessageParts
       ├─ TextPart
       ├─ MetricGridPart
       ├─ ChartPart (dynamic)
       ├─ TimelinePart
       ├─ TablePart
       ├─ GalleryPart (lazy images)
       ├─ DiagramPart (dynamic)
       ├─ SourcesPart
       └─ ActionsPart
```

Mỗi renderer phải có:

- loading skeleton riêng;
- empty/error state;
- responsive mobile/desktop;
- keyboard accessibility;
- dark/light token compatibility;
- fallback dạng text/table nếu chart không render được.

### 5.9 Visual safety

- Không render model-generated HTML, JSX, SVG, script hoặc CSS.
- Không cho model chọn class name hoặc màu hex tùy ý; chỉ dùng design tokens.
- Validate toàn bộ part bằng Zod trước khi persist/render.
- Strip URL ngoài allowlist.
- Diagram node/edge phải tham chiếu ID hợp lệ và không tạo cycle vô hạn trong layout.
- Chart data chỉ nhận primitive serializable.
- Artifact lỗi không được làm hỏng toàn bộ message bubble.

### Calendar artifact

- Timeline compact theo ngày.
- Badge nguồn: Studio, Google, Công việc.
- Hiển thị giờ, địa điểm, khách hàng, mã hợp đồng.
- Action an toàn: `Mở lịch`, `Mở hợp đồng`, `Mở Google Calendar`.

### Gallery artifact

- Card hợp đồng với ngày trả ảnh và tiến độ retouch.
- Grid preview tối đa 4–6 thumbnail.
- Album chips: Ảnh gốc, Ảnh đã sửa, Ảnh chọn in.
- Action an toàn: `Mở gallery`, `Mở hợp đồng`.
- Không render HTML tùy ý và không truyền URL Drive riêng tư vào nội dung model.

## 6. Phân chia phase triển khai

### Phase 0 — Contract và security foundation

1. Tạo `lib/moodie/domain/calendar-context.ts`.
2. Tạo `lib/moodie/domain/gallery-context.ts`.
3. Định nghĩa output DTO tối giản, serializable.
4. Thêm redaction helper cho URL/token/password.
5. Thêm ownership tests cho calendar và contract/gallery.

**Gate:** tool service không thể trả token, password hash hoặc raw OAuth payload.

### Phase 1 — Calendar read integration

1. Tái sử dụng unified calendar query thay vì query `contract_events` riêng.
2. Implement `get_calendar_agenda`.
3. Đăng ký tool trong manifest và planner.
4. Giữ alias `get_upcoming_schedules` trong một release để tương thích.
5. Thêm widget timeline và source badges.
6. Test dedupe Google event đã liên kết với schedule nội bộ.

**Gate:** câu “Ngày mai studio có lịch gì?” trả đúng cùng tập dữ liệu với menu `Lịch`.

### Phase 2 — Gallery/Drive read integration

1. Implement contract resolver dùng ID, mã hợp đồng hoặc tên khách.
2. Implement `get_contract_delivery_assets`.
3. Đọc gallery summary, delivery date và retouch progress song song.
4. Thêm gallery artifact không chứa private Drive URL.
5. Implement `list_contract_gallery_images` với pagination và hard limit.

**Gate:** Moodie trả đúng số album, ảnh, ảnh chọn và tiến độ giống chi tiết hợp đồng.

### Phase 2.5 — Visual intelligence foundation

1. Formalize `MoodieMessagePart` union và Zod schemas.
2. Viết adapter chuyển `metadata.widgets` cũ sang parts mới.
3. Implement `MoodieMessageParts` renderer registry.
4. Implement timeline, table và gallery parts trước.
5. Dynamic import chart renderer dùng Recharts.
6. Implement structured SVG diagram renderer.
7. Thêm `visual-planner.ts` để chọn dạng trình bày từ tool output.
8. Persist parts trong message metadata với version `visual_schema_version: 1`.
9. Thêm text fallback cho mọi artifact.

**Gate:** cùng một tool output phải render ổn định, không phụ thuộc model tự viết Markdown hoặc cấu hình chart.

### Phase 2.6 — Domain visualizations

1. Calendar → timeline theo ngày, badge nguồn Google/Studio/Công việc.
2. Finance → KPI, bar, line, area và donut theo loại dữ liệu.
3. Debt → aging bar chart và table khoản cần thu.
4. Contracts → status table và payment progress.
5. Gallery → progress card, album chips và thumbnail grid.
6. Team → workload bars và deadline timeline.
7. Process explanation → structured flow diagram.

**Gate:** mỗi domain có ít nhất một regression case cho text, table và visual artifact phù hợp.

### Phase 3 — Safe navigation và action previews

1. Thêm action `open_calendar`, `open_contract`, `open_gallery`.
2. Thêm preview cho sync Calendar/Drive.
3. Bắt buộc xác nhận trước mọi thao tác sync hoặc tạo share link.
4. Audit log đầy đủ user, tool, target và kết quả.

**Gate:** model không thể tự sync hoặc tạo link chia sẻ khi chưa được user duyệt.

### Phase 4 — Performance và caching

1. Chạy calendar internal + Google fetch song song.
2. Cache Google read ngắn hạn theo user/range, không cache token.
3. Gallery summary đọc từ RPC hiện có.
4. Chỉ tải thumbnail khi artifact được render.
5. Dùng cursor pagination cho gallery images.
6. Ghi trace latency theo từng nguồn.

**Mục tiêu:** calendar tool p95 dưới 2 giây; gallery summary p95 dưới 1 giây khi dữ liệu đã sync.

### Phase 5 — Optional MCP gateway

Chỉ triển khai khi cần dùng cùng integration ngoài Moodie web runtime.

1. Tạo server-only MCP adapter bọc các domain service đã ổn định.
2. MCP tool không được gọi Google service trực tiếp ngoài permission layer.
3. Auth MCP phải ánh xạ về user/session Mood Studio.
4. Resources chỉ expose DTO đã redaction.
5. Không expose filesystem, OAuth credential hoặc generic Drive API.

**Tool MCP dự kiến:**

- `moodie.calendar.agenda`
- `moodie.contract.delivery_assets`
- `moodie.gallery.images`

### Phase 6 — Evaluation và rollout

1. Thêm regression prompts Calendar/Drive.
2. So sánh output Moodie với menu `Lịch` và chi tiết hợp đồng.
3. Test role admin, manager và employee.
4. Test Google disconnected, token expired, Drive private và gallery chưa sync.
5. Canary cho admin trước, sau đó manager, cuối cùng employee.

## 7. Regression prompts bắt buộc

- “Ngày mai studio có lịch gì?”
- “Tuần này lịch nào lấy từ Google Calendar?”
- “Ngày mai tôi có lịch riêng nào?”
- “Hợp đồng HD-2026-0030 có bao nhiêu album ảnh?”
- “Ảnh của khách Lan đã sửa được bao nhiêu phần trăm?”
- “Cho tôi xem ảnh đã chọn của hợp đồng này.”
- “Đồng bộ lại thư mục Drive của hợp đồng này.”
- “Tạo link trả ảnh cho khách.”

## 8. Failure states cần xử lý

- Google chưa kết nối hoặc thiếu Calendar/Drive scope.
- OAuth token hết hạn và refresh thất bại.
- Sự kiện Google trùng schedule đã sync.
- User không có quyền xem lịch của người khác.
- Hợp đồng không tồn tại hoặc user không có quyền truy cập.
- Gallery chưa có Drive folder.
- Drive folder private hoặc API key/OAuth không có quyền.
- Gallery có hàng nghìn ảnh.
- Share link hết hạn hoặc bị thu hồi.
- Dữ liệu Supabase đã sync nhưng Drive vừa thay đổi.

## 9. Migration dự kiến

Phase 1–2 có thể không cần migration nếu tái sử dụng bảng hiện tại.

Chỉ thêm migration khi cần:

- cache/checkpoint đồng bộ tool;
- audit action chuyên biệt;
- generation artifact persistence;
- MCP client identity hoặc grant mapping.

Không lưu OAuth token mới trong bảng Moodie.

## 10. Definition of Done

- Moodie Calendar dùng cùng nguồn dữ liệu và permission với menu `Lịch`.
- Moodie nhìn thấy cả lịch nội bộ và Google-only event, có dedupe chính xác.
- Moodie đọc được gallery/ảnh trả khách từ chi tiết hợp đồng.
- Model không nhận token, password, private Drive URL hoặc file gốc.
- Thumbnail chỉ xuất hiện trong safe artifact renderer.
- Moodie hỗ trợ metric grid, chart, timeline, table, gallery và structured diagram.
- Chart dùng dữ liệu tool đã xác minh; không tạo số liệu hoặc series giả.
- Calendar trả timeline thay vì bullet dài khi có dữ liệu sự kiện.
- Gallery trả thumbnail preview an toàn khi user yêu cầu xem ảnh.
- Diagram dùng node/edge typed schema, không render Mermaid/HTML tùy ý.
- Mọi artifact có responsive layout, accessibility và text fallback.
- Mọi action sync/share có preview, approval và audit log.
- Regression tests, role tests, disconnected tests và production build đều pass.
- Kết quả benchmark đối chiếu khớp UI hiện tại trước rollout.
