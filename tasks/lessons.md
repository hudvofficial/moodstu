# Lessons Learned

Ghi lại bài học sau mỗi lần mắc lỗi để không lặp lại.

- **QUY TẮC TỐI THƯỢNG VỀ QUYỀN TỰ QUYẾT (User Autonomy)**: Tuyệt đối không được thực hiện bất kỳ thay đổi mã nguồn nào (Code implementation) nếu chưa nhận được câu lệnh xác nhận rõ ràng từ người dùng, ngay cả khi kế hoạch đã được thảo luận. Việc nhầm lẫn giữa thảo luận kế hoạch và đồng ý triển khai là vi phạm nghiêm trọng quy tắc cốt lõi của hệ thống.

## Từ V1 (2026-03-15)

1. **VARCHAR status → dùng ENUM** — v1 dùng free-text, typo liên tục
2. **RLS USING(true) = không có bảo mật** — v2 dùng code auth + service role
3. **Denormalized names = data lệch** — v2 chỉ FK, JOIN khi cần
4. **Quá nhiều tables upfront** — v2 chỉ tạo khi cần (MVP ~10)
5. **SWR + React Query = 2 cache system** — v2 chỉ dùng SWR
6. **globals.css 20K lines** — v2 dùng Tailwind v4 @theme (<100 lines)
7. **God files 500+ lines** — v2 max 250 lines, split sớm
8. **Client-side financial calc = race condition** — v2 dùng atomic RPC
9. **Ghost Payment (status "Đã thu" nhưng receipt_id = null)** — v2 dùng atomic transaction
10. **getUser() trong middleware = 200-400ms delay** — v2 dùng getSession()

## Từ V1 UI Audit (2026-03-15)

11. **Header contrast sai** — Tailwind default neutral ≠ custom palette → v2 dùng CSS variables `--color-*`
12. **3 tab components trùng** — ClientTabs + ClientFilterPills + FilterChips → v2 CHỈ 1: `TabsFilter.tsx`
13. **Icon hỗn tạp** — Material Symbols + emoji + text → v2 CHỈ `lucide-react`
14. **Material Symbols font 500KB+** — v2 lucide-react tree-shake (~1KB/icon)
15. **Modal quá lớn (276 lines)** — v2 Modal < 80 lines + ConfirmDialog riêng
16. **2 SearchInput riêng (mobile + desktop)** — v2: 1 SearchBar responsive
17. **PageLayout 15 props** — v2 AppShell max 5 props + context/slots
18. **Status badge màu không nhất quán** — v2 ENUM → Color Map (design-specs.md)

## Từ Stitch Design Phase (2026-03-15)

19. **KHÔNG ĐỔ THỪA TOOL** — Stitch gen sai màu? Lỗi do PROMPT em viết, không phải Stitch. Agent viết prompt = Agent chịu trách nhiệm output. KHÔNG BAO GIỜ đổ thừa tool.
20. **KHÔNG RUSH GEN** — Phải Brief trước → User duyệt → THEN gen Stitch. Bỏ qua bước = làm lại, tốn thời gian gấp đôi.
21. **3 BREAKPOINTS BẮT BUỘC** — Desktop 1440px + Tablet 768px + Mobile 375px. Thiếu 1 = thiếu tất cả. Không chấp nhận "chỉ có Desktop".
22. **V1 = FLOW LOGIC, KHÔNG PHẢI COLORS** — V1 dùng rainbow (teal, indigo, violet). V2 là earth-tone. Đọc V1 chỉ để hiểu flow/feature, KHÔNG copy color choices.
23. **STRICT COLOR BLOCK** — Mọi Stitch prompt PHẢI có block: hex codes chính xác + danh sách FORBIDDEN colors. Prompt lỏng = output lỏng.
24. **P04 = GOLD STANDARD** — Contract List desktop là benchmark. Mọi phase sau phải sync visual language với P04.
25. **TỪNG PHASE MỘT** — Không gen hàng loạt. Mỗi phase: Read plan → Check V1 flow → Brief → Approve → Gen (D+T+M). Chậm mà chắc.
26. **CROSS-CHECK V1 TRƯỚC KHI BRIEF** — Đọc v1 components để hiểu: có bao nhiêu screens, layout ra sao, feature gì hoạt động tốt → rồi mới viết Brief cải tiến.
27. **CONTEXT LOSS = THẢM HOẠ** — Giữa các session, agent mất context → prompt Stitch loạn → gen sai → user phải xoá sạch. GIẢI PHÁP: tạo `stitch-master-brief.md` làm SSOT. ĐỌC FILE NÀY TRƯỚC MỖI SESSION, KHÔNG DÙNG MEMORY.
28. **CHECK TRACKER TRƯỚC KHI GEN** — Section 4 trong stitch-master-brief.md có tracker từng screen. PHẢI check đã có screen chưa trước khi gen. Gen duplicate = lãng phí + gây rối. Max 3 screens/batch → review → tiếp.
29. **BRAIN.JSON PHẢI KHỚP THỰC TẾ** — Nếu screens bị xoá/ẩn, phải update brain.json ngay. Ghi "completed" khi thực tế đã bị xoá = nói dối = mất trust. Mọi thay đổi Stitch phải reflect trong brain.json + stitch-master-brief.md.
30. **EXTRACT PALETTE TỪ HTML, KHÔNG DÙNG MEMORY** — Design System PHẢI extract trực tiếp từ Tailwind config trong HTML của Stitch (xem `<script id="tailwind-config">`). Em đã bịa sidebar `#1E3D2E` (dark green) trong khi thực tế là `#f5efe6` (warm cream). KHÔNG BAO GIỜ viết palette từ memory. Luôn tải HTML → grep colors → ghi lại.
31. **CHECK TẤT CẢ STITCH PROJECT LOOPS** — Mood Studio có nhiều project trong Stitch (UI Redesign, CRM Module, Contracts Module, V2 Main). Mỗi project có palette KHÁC NHAU. Phải check TẤT CẢ loops trước khi lập SSOT, xác định project nào là gold standard, và dùng palette từ đó.
32. **ĐỌC docs/reference/ TRƯỚC KHI BẮT ĐẦU BẤT CỨ GÌ** — Thư mục `docs/reference/` chứa 7 files gốc mà anh đã chuẩn bị kỹ: `antigravity_onboarding.md` (onboarding cho AI), `moodsaas_UI_PLAN.md` (UI plan + Stitch brief + shared tokens), `moodsaas_wireframe.md` (wireframe), `frontend_implementation.md` (frontend specs + shared UI components), `backend_architecture.md` (schema→module mapping), `backend_api.md` (API surface), `backend_test_plan.md` (QA plan). ĐÂY LÀ SOURCE OF TRUTH GỐC. Em đã BỎ QUA hoàn toàn → viết Design System sai, gen Stitch không đúng spec, thiếu shared UI. PHẢI ĐỌC TRƯỚC MỖI SESSION.
33. **ĐỌC STITCH SKILLS TRƯỚC KHI GEN** — `C:\Users\Admin\Desktop\Ai\mood saas\skills\` chứa 6 skills quan trọng: (1) `stitch-loop` — Baton system: next-prompt.md → gen → integrate → update SITE.md → write next baton. (2) `design-md` — Extract design tokens từ Stitch screen HTML → tạo DESIGN.md semantic. (3) `enhance-prompt` — Transform vague prompt → structured Stitch prompt (vibe + design system block + page structure). (4) `shadcn-ui` — Component integration guide (cva variants, cn() utility). (5) `react-components` — Stitch HTML → modular React components + hooks + mockData. (6) `remotion` — Video generation. PHẢI follow `enhance-prompt` trước mỗi lần gen Stitch, và dùng `design-md` để extract DESIGN.md từ gold standard screen.
34. **DESIGN SYSTEM BLOCK BẮT BUỘC TRONG MỖI STITCH PROMPT** — Theo `enhance-prompt` skill, mỗi prompt gửi Stitch PHẢI có block `DESIGN SYSTEM (REQUIRED):` gồm: Platform, Theme, Background (#hex), Primary Accent (#hex), Text Primary (#hex), Font, Layout. Copy từ DESIGN.md hoặc design-specs.md. KHÔNG BAO GIỜ gen prompt mà thiếu block này.

## Từ P01 Code Session (2026-03-15)

35. **COFFEE = COMPONENT LIBRARY** — `C:\Users\Admin\Desktop\Ai\mcoffe\src\` chứa Modal, CurrencyInput, TabsFilter, SearchBar, SWR setup, hooks — tất cả < 80 lines, proven. PHẢI check Coffee TRƯỚC khi tự viết component.
36. **KHÔNG SHADCN/UI** — Reference docs cũ nói dùng Shadcn, nhưng Coffee đã prove custom components nhẹ hơn + đủ dùng. V2 dùng custom components theo Coffee pattern.
37. **REFERENCE DOCS ≠ SSOT** — `docs/reference/` là từ giai đoạn planning V1. Nhiều thông tin đã outdated (colors, tech stack). Luôn cross-check với: (1) globals.css @theme, (2) Stitch screens, (3) lessons.md. Đã update reference docs ngày 15/3 để sync V2 colors.
## Từ P01 Task 4 Session (2026-03-15)

38. **GLOBAL MODAL SYSTEM = CLEAN CODE** — Việc dùng `ModalProvider` (chuẩn Linear) giúp dọn dẹp 50% code thừa tại các trang module. Luôn dùng `openModal()` thay vì quản lý `useState(isOpen)` rác ở lớp trang.
39. **RESPONSIVE FOUNDATION (DRAWERS)** — Các component overlays (Modal, Dropdown) BẮT BUỘC phải hỗ trợ pattern: Desktop = Modal Center, Mobile = Bottom Drawer (Apple HIG). Code 1 lần, dùng cho 3 tiers (Desktop, Tablet, Mobile).
40. **CURRENCY INPUT LOOPS** — Luôn xử lý `toLocaleString("vi-VN")` cho hiển thị và `replace(/[^0-9]/g, "")` cho lưu trữ. Đây là kiến thức xương máu để data Finance không bao giờ lệch.
41. **SHARED COMPONENTS FIRST** — Xây móng (Task 4) thật kỹ giúp X2 tốc độ triển khai 11 module sau. Nếu móng lỏng (chỉ code cho 1 module), sau này refactor sẽ tốn gấp 3 thời gian.

### 🛠️ Quy trình build Shared Component (Task 4 Standard)
- **Step 1:** Tạo UI Core (Component thô).
- **Step 2:** Tích hợp logic responsive (Desktop Center / Mobile Drawer).
- **Step 3:** Đóng gói vào Global Provider (nếu là overlays).
- **Step 4:** Kiểm tra Props linh hoạt (Variants, Sizes, Error states).
- **Step 5:** Test Build & Type safety.

## Từ Login UI & Auth Fix Session (2026-03-15)

42. **Gia cố Layout Login:** Trên Mobile, các khối flex con cần có `w-full` và `min-w-0` để tránh bị bóp nghẹt chiều dọc khi không gian hẹp. Dùng `whitespace-nowrap` cẩn thận để tránh chồng chữ.
43. **Hệ thống Rate Limiting (Serverless):** Với môi trường Serverless (Next.js Actions), không được dùng `Map` trong bộ nhớ để chặn Brute-force vì dữ liệu bị cô lập và reset thường xuyên. Luôn dùng Database (Table: `login_attempts`) làm SSOT cho bảo mật.
44. **Supabase Identity Seeding:** Khi tạo user identities qua SQL, cột `provider_id` là bắt buộc (thường lấy email làm giá trị). Cột `email` (trong identities) là Generated Column từ `identity_data` -> Tuyệt đối không chèn thủ công.
45. **Rel="noopener noreferrer":** Điểm mù bảo mật thường gặp khi dùng `target="_blank"` cho các link hỗ trợ (Zalo, Facebook). Luôn thêm thuộc tính này để chống tấn công Tabnabbing.
46. **CSS Grid for High-Stake Pages:** Sử dụng CSS Grid cho trang Login thay vì Flexbox giúp Layout cực kỳ ổn định. Luôn đặt `min-width` và `max-width` cho form column (`420px`) để tránh bị méo UI khi resize màn hình.
47. **Smart Username UX:** Tăng cường trải nghiệm bằng cách tự động nối đuôi domain (VD: `@moodwedding.com`). Phải đồng bộ logic này ở cả Frontend (Placeholder hiển thị rõ: "Tên đăng nhập hoặc Email") và Backend (Auth Actions normalization).
48. **Credential Debugging Pattern:** Khi user báo "đúng thông tin nhưng login không được", hãy log `password.length` và `finalEmail` ở server side. Điều này giúp phát hiện 99% lỗi do dính Unikey hoặc gõ nhầm ký tự đặc biệt ở cuối mật khẩu (`!@#`).
49. **Mobile Edge-to-Edge Design:** Trên mobile, bỏ hiệu ứng "card" lọt thỏm giữa nền xám. Dùng nền trắng tràn viền và logic `justify-between` để đẩy Footer sát đáy màn hình, giúp giao diện trông cực kỳ chuyên nghiệp (Premium Apple style).
50. **KHÔNG bao giờ dùng `font-serif` hoặc `italic` trong V2** — Font duy nhất là Inter (sans-serif). font-serif gây lỗi dấu tiếng Việt bị tách rời. Đã fix: header.tsx, unified-modal.tsx, ux-states.tsx.
51. **Labels dùng Sentence case, KHÔNG uppercase** — Quy ước design-specs.md rõ ràng: labels form, buttons, tabs, badges... dùng Sentence case ("Tên khách hàng", KHÔNG "TÊN KHÁCH HÀNG"). TUYỆT ĐỐI không dùng `uppercase tracking-widest` trên labels. Label style chuẩn: `text-xs font-medium text-text-secondary ml-1`.
52. **SSOT refactoring: PHẢI grep tất cả references cũ** — Khi đổi ID (VD: `"customers"` → `"crm"`), PHẢI grep toàn bộ codebase tìm references cũ (ROLE_PERMISSIONS, canAccess, routing...) và đổi theo. Thiếu 1 chỗ = feature biến mất (VD: menu CRM mất vì ROLE_PERMISSIONS vẫn check `"customers"`).
53. **DÙNG CSS CLASSES TỪ design-system.css, KHÔNG HARDCODE** — Typography (`.text-h1`, `.text-h3`...), buttons (`.btn-primary`), cards (`.card-base`), badges (`.badge-success`), labels (`.text-label`) đều có class SSOT trong `app/design-system.css`. KHÔNG BAO GIỜ viết `text-xl font-bold text-dark tracking-tight` — dùng `.text-h3`. Xem cheat sheet: `docs/css-classes.md`. Grep tìm hardcode: `text-(xl|2xl|3xl).*font-bold`.
54. **FORM COMPONENTS PHẢI DÙNG CSS CLASS SSOT** — Mọi form element (Input, Select, CurrencyInput, DatePicker...) PHẢI dùng `.input-base` cho input, `.label-base` cho label, `.error-text` cho error, `.input-error` cho error state, `.select-trigger` cho select trigger. KHÔNG BAO GIỜ hardcode `h-12 px-5 bg-bg-card rounded-2xl font-semibold` — sẽ gây lệch font-size/radius/weight giữa các components. Components code ở thời điểm khác nhau → DỄ trôi nếu không có SSOT. Grep kiểm tra: `h-12 px-5 bg-bg-card.*rounded-2xl`.
55. **CUSTOM CSS CLASS KHÔNG HỖ TRỢ RESPONSIVE PREFIX** — `text-page-title` là class trong `design-system.css` (không phải Tailwind utility). Viết `lg:text-page-title` → Tailwind bỏ qua hoàn toàn → UI invisible. GIẢI PHÁP: Tách layout mobile/desktop thành 2 block riêng (`lg:hidden` + `hidden lg:flex`), dùng class trực tiếp không qua responsive prefix. KHÔNG BAO GIỜ dùng `lg:` / `md:` prefix trước custom CSS class.
56. **KHÔNG INLINE STYLE, LUÔN TẠO CSS CLASS SSOT** — Khi cần style đặc biệt (VD: search input header không có border, không focus ring), TUYỆT ĐỐI không dùng inline `style={{}}` hoặc hardcode dày đặc Tailwind utilities. PHẢI tạo class mới trong `design-system.css` (VD: `.search-input`) với design tokens. Lý do: inline style không reusable, không maintain được, vi phạm SSOT. Class SSOT dùng `var(--color-*)` tokens → thay đổi 1 chỗ, đồng bộ toàn hệ thống.
57. **CSS CLASS CÓ display OVERRIDE Tailwind responsive** — Khi `.icon-btn` đặt `display: flex` trong CSS, viết `className="lg:hidden icon-btn"` → CSS class thắng specificity → nút LUÔN hiện. GIẢI PHÁP: Tách visibility ra wrapper div `<div className="lg:hidden"><button className="icon-btn">`. KHÔNG BAO GIỜ mix responsive Tailwind (`lg:hidden`, `hidden lg:block`) với CSS class có `display` property trên CÙNG 1 element.
58. **KHÔNG `taskkill /F /IM node.exe`** — Lệnh này kill TẤT CẢ process node, bao gồm Supabase MCP server, extension host, v.v. LUÔN dùng `Get-NetTCPConnection -LocalPort 3000` để chỉ kill dev server port 3000 thôi.
59. **Server Actions: V1 `withAuth` pattern là SSOT** — `created_by` FK trỏ sang `employees.id`, KHÔNG phải `auth.users.id`. Mọi server action (read + write) phải dùng `withAuth` → admin client (service_role, bypass RLS). KHÔNG dùng regular client (anon key) cho bất kỳ DB operation nào vì RLS `get_current_employee_role()` có thể trả NULL.
60. **V2 = V1 SUPERSET, KHÔNG BAO GIỜ V2 < V1** — Khi build V2 module, PHẢI port 100% V1 features TRƯỚC khi thêm mới. Quy trình đúng: (1) Port V1 logic nguyên vẹn, (2) Đổi styling → V2 design tokens + Lucide icons, (3) Thêm Stitch visual polish, (4) Thêm feature mới. KHÔNG BAO GIỜ build V2 từ scratch rồi bỏ sót feature V1. Kiểm tra: so sánh V1 component list vs V2 → đếm thiếu bao nhiêu.
61. **Stitch = STYLE REFERENCE, KHÔNG PHẢI LOGIC SOURCE** — Stitch AI gen generic SaaS UI, KHÔNG biết domain (wedding studio). Dùng Stitch cho: color palette, spacing, layout grid, component shape. KHÔNG dùng Stitch cho: business logic, pipeline stages, data relationships, UX flow proven. V1 code là logic source. BRIEF SSOT: `docs/BRIEF-crm-v2-upgrade.md`.
62. **TUYỆT ĐỐI KHÔNG TỰ Ý CHỈNH SỬA STYLING/MÃ NGUỒN (User Autonomy Strict Enforcement)**: Cấm tuyệt đối việc chỉnh sửa file tự động (ví dụ: tự ý xoá border của header) để "tối ưu" hoặc "làm đẹp" khi đang trong quá trình luận bàn hoặc khi User chưa ra lệnh rõ ràng. Hành động proactive này vi phạm Rule lớn nhất của dự án. Mọi tác động đến code đều phải ĐỢI CÂU LỆNH CHO PHÉP (explicit approval).
63. **MOBILE RESPONSIVE = max-lg: OVERRIDE, KHÔNG ĐỔI DEFAULT** — Khi tối ưu mobile, TUYỆT ĐỐI giữ nguyên desktop classes (Phase 02 đã duyệt). Chỉ thêm override bằng `max-lg:` hoặc `max-sm:` để thu nhỏ trên mobile. ❌ SAI: `p-4 lg:p-5` (thay đổi default từ p-5→p-4, desktop cần lg: mới lấy lại). ✅ ĐÚNG: `p-5 max-lg:p-4` (desktop giữ nguyên p-5, chỉ mobile bị override). Lý do: mobile-first Tailwind default ảnh hưởng MỌI breakpoint, gây side-effect lên desktop/tablet.
64. **V2 TUYỆT ĐỐI KHÔNG DÙNG BORDER — CHỈ SHADOW** — Quy tắc cứng: KHÔNG BAO GIỜ dùng `border`, `border-b`, `border-t`, `divide-y`, hay `shadow-[inset_0_0_0_1px_...]` (viền giả). Chỉ dùng shadow mềm tạo depth: `shadow-xs` (subtle), `shadow-sm` (nhẹ), `shadow-soft` (medium), `shadow-md` (nổi). Separator giữa rows dùng `bg-border/30 h-px` thay vì border/divide. Container không cần viền — dùng `bg-elevated shadow-xs` hoặc `bg-bg-card shadow-sm` là đủ phân biệt. Card = `shadow-sm rounded-2xl`, dropdown = `shadow-lg`. Grep check: `border-border|divide-border|inset_0_0_0_1px`.
65. **V2 DB DÙNG snake_case ENUM, KHÔNG PHẢI TIẾNG VIỆT** — V2 Supabase project (`mnoqeluywookswpcykha`) dùng PostgreSQL ENUM types: `contract_status_enum` = `{cho_xu_ly, dang_thuc_hien, hoan_thanh, da_huy}`, `service_type_enum` = `{studio, ngay_cuoi, combo, baby...}`, `item_type_enum` = `{dich_vu, san_pham, trang_phuc, phat_sinh}`, `payment_method_enum` = `{tien_mat, chuyen_khoan}`. TUYỆT ĐỐI không dùng `"Đang thực hiện"`, `"Tiền mặt"` trong code — sẽ bị PostgreSQL reject. Map sang tiếng Việt CHỈ ở display layer (contract-constants.ts).
66. **V2 DB TABLES KHÁC V1** — Mapping: `contract_details` → `contract_items`, `work_progress` → `work_tasks`, `receipts` → `payments`, `customer_name` (denorm) → `customer_id` (FK only, JOIN customers.full_name). V1 code là logic source nhưng PHẢI map sang V2 table/column names.

## Từ Contract Form Phase 03-08 (2026-03-18)

67. **TRIỂN KHAI CODE PHẢI DÙNG TOKEN/HOOK/SHARED COMPONENTS ĐÃ CÓ — TUYỆT ĐỐI KHÔNG INLINE** — Khi đã thống nhất Design System (tokens, hooks, shared components) từ đầu dự án, TUYỆT ĐỐI phải dùng chúng khi code. KHÔNG BAO GIỜ: (1) Viết inline Tailwind classes giống token đã có (VD: viết `rounded-radius-md bg-bg-input px-3 py-2.5 text-body-sm` thay vì dùng `.input-base`). (2) Tạo component mới khi đã có shared component (VD: tự viết Field wrapper thay vì dùng shared FormField). (3) Quên kiểm tra `design-system.css` + `docs/css-classes.md` trước khi viết mới. QUY TRÌNH ĐÚNG: **Trước mỗi file mới**: (A) Đọc `design-system.css` → list all available classes. (B) Đọc `components/ui/` → list all shared components. (C) Code dùng 100% existing system. (D) CHỈ tạo mới nếu thật sự chưa có. Grep check: `rounded-radius-md bg-bg-input px-3` ngoài design-system.css → vi phạm.
68. **LESSONS.MD KHÔNG CÓ KHẢ NĂNG NGĂN CHẶN LỖI — CẦN GATE** — Đã ghi 67 lessons nhưng vẫn mắc lỗi liên tục (VD: lesson #53, #54, #67 đều nói "dùng SSOT" nhưng vẫn viết inline). ROOT CAUSE: lessons.md chỉ là text archive, không phải enforcement mechanism. GIẢI PHÁP: Tạo `tasks/gates/before-edit.md` = checklist cứng 5 items bắt buộc tick trước khi edit code. Thêm V-GATE rules vào GEMINI.md (global rules). Thêm GATE -1 vào workflow /code. Từ nay: ĐỌC GATE trước khi code, KHÔNG CHỈ ĐỌC LESSONS.
69. **AUDIT = XEM UI THỰC TẾ + SO STITCH, KHÔNG CHỈ GREP CODE** — Grep tìm inline classes chỉ là "code smell check", KHÔNG PHẢI UI audit. UI audit BẮT BUỘC: (1) Mở trang trên browser, (2) Screenshot, (3) Đặt cạnh Stitch mockup, (4) So pixel-by-pixel, (5) Ghi nhận sai lệch visual + logic. ENFORCEMENT: V-GATE Rule V1 + V2 trong GEMINI.md. Fix code mà không check visual = fix mù.
