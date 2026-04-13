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
33. **ĐỌC STITCH SKILLS TRƯỚC KHI GEN** — `skills/` chứa 6 skills quan trọng. PHẢI follow `enhance-prompt` trước mỗi lần gen Stitch, và dùng `design-md` để extract DESIGN.md từ gold standard screen.
34. **DESIGN SYSTEM BLOCK BẮT BUỘC TRONG MỖI STITCH PROMPT** — Theo `enhance-prompt` skill, mỗi prompt gửi Stitch PHẢI có block `DESIGN SYSTEM (REQUIRED):`.

## Từ P01 Code Session (2026-03-15)

35. **COFFEE = COMPONENT LIBRARY** — `src/` chứa Modal, CurrencyInput, TabsFilter, SearchBar, SWR setup, hooks — tất cả < 80 lines, proven. PHẢI check Coffee TRƯỚC khi tự viết component.
36. **KHÔNG SHADCN/UI** — Reference docs cũ nói dùng Shadcn, nhưng Coffee đã prove custom components nhẹ hơn + đủ dùng. V2 dùng custom components theo Coffee pattern.
37. **REFERENCE DOCS ≠ SSOT** — Luôn cross-check với: (1) globals.css @theme, (2) Stitch screens, (3) lessons.md.
38. **GLOBAL MODAL SYSTEM = CLEAN CODE** — Dùng `ModalProvider` (chuẩn Linear).
39. **RESPONSIVE FOUNDATION (DRAWERS)** — Desktop = Modal Center, Mobile = Bottom Drawer (Apple HIG).
40. **CURRENCY INPUT LOOPS** — Format UI + Raw Number DB.
41. **SHARED COMPONENTS FIRST** — Xây móng (Task 4) thật kỹ giúp X2 tốc độ triển khai 11 module sau.

## Từ Login UI & Auth Fix Session (2026-03-15)

42-50. Bỏ qua ghi chú cũ để thu gọn, giữ focus vào SSOT & Rules. 51. **Labels dùng Sentence case, KHÔNG uppercase**. 52. **SSOT refactoring: PHẢI grep tất cả references cũ**. 53. **DÙNG CSS CLASSES TỪ design-system.css, KHÔNG HARDCODE**. 54. **FORM COMPONENTS PHẢI DÙNG CSS CLASS SSOT**. 55. **CUSTOM CSS CLASS KHÔNG HỖ TRỢ RESPONSIVE PREFIX**. 56. **KHÔNG INLINE STYLE, LUÔN TẠO CSS CLASS SSOT**. 57. **CSS CLASS CÓ display OVERRIDE Tailwind responsive**. 58. **KHÔNG `taskkill /F /IM node.exe`**. 59. **Server Actions: V1 `withAuth` pattern là SSOT**. 60. **V2 = V1 SUPERSET, KHÔNG BAO GIỜ V2 < V1**. 61. **Stitch = STYLE REFERENCE, KHÔNG PHẢI LOGIC SOURCE**. 62. **TUYỆT ĐỐI KHÔNG TỰ Ý CHỈNH SỬA STYLING/MÃ NGUỒN (User Autonomy Strict Enforcement)**. 63. **MOBILE RESPONSIVE = max-lg: OVERRIDE, KHÔNG ĐỔI DEFAULT**. 64. **V2 TUYỆT ĐỐI KHÔNG DÙNG BORDER — CHỈ SHADOW**. 65. **V2 DB DÙNG snake_case ENUM, KHÔNG PHẢI TIẾNG VIỆT**. 66. **V2 DB TABLES KHÁC V1**.

## Từ Contract Form Phase (2026-03-18)

67. **TRIỂN KHAI CODE PHẢI DÙNG TOKEN/HOOK/SHARED COMPONENTS ĐÃ CÓ — TUYỆT ĐỐI KHÔNG INLINE**.
68. **LESSONS.MD KHÔNG CÓ KHẢ NĂNG NGĂN CHẶN LỖI — CẦN GATE**.
69. **AUDIT = XEM UI THỰC TẾ + SO STITCH, KHÔNG CHỈ GREP CODE**.

## Tối ưu Modal / Border Debug / V1 Port (2026-03-19 to 2026-03-23)

70. **ĐO TRƯỚC KHI TỐI ƯU — KHÔNG ĐOÁN ROOT CAUSE QUA CODE DIFF**.
71. **DEBUG UI = HỎI "KHI NÀO NÓ BIẾN MẤT?" TRƯỚC KHI ĐOÁN ROOT CAUSE**.
72. **FK `*_by` PHẢI TRỎ `auth.users(id)` — KHÔNG TRỎ `employees(id)`**.
73. **AUDIT PHẢI QUÉT TOÀN MODULE — KHÔNG CHỈ FIX TRIỆU CHỨNG**.
74. **MODULE GOLD STANDARD = HOÀN THIỆN 1 MODULE TRƯỚC, SAU ĐÓ NHÂN BẢN**.
75. **V2 ĐỒNG BỘ LÀ ƯU TIÊN SỐ 1 — KHÔNG THỎA HIỆP**.
76. **KHÔNG SỬA CODE KHI CHƯA CÓ /plan — DÙ LỖI RÕ RÀNG**.
77. **V2 = V1 + TỐI ƯU — TUYỆT ĐỐI KHÔNG ĐƯỢC "LITE"**.
78. **CSS BTN VARIANT PHẢI TỰ ĐỦ BASE STYLES**.
79. **TAILWIND V4 SCANS MỌI FILE KỂ CẢ .md**.
80. **TW4 SYNTAX: KHÔNG DÙNG `[var(--token)]`**.
81. **MODAL PHẢI DÙNG `openModal()` — KHÔNG TỰ RENDER BACKDROP**.
82. **ANIMATION KEYFRAME `to` STATE PHẢI DÙNG `transform: none`**.
83. **SUPABASE POSTGREST SILENT TRUNCATION Ở 1000 ROWS**.

## Refactor / UX Fixes (2026-03-26 to 2026-03-31)

84. **PHẢI ĐỌC module-blueprint.md + ĐỐI CHIẾU CONTRACTS GOLD STANDARD TRƯỚC KHI CODE BẤT KỲ MODULE NÀO**.
85. **"TIẾN HÀNH" ≠ "CODE ĐI" — PHẢI CÓ LỆNH TƯỜNG MINH**.
86. **KHI USER YÊU CẦU PROMPT → TRẢ 1 BLOCK DUY NHẤT**.
87. **SUPABASE PROJECT ID — KHÔNG BAO GIỜ ĐƯỢC BỊA HOẶC ĐOÁN**.
88. **"GỬI PROMPT" = GHI RA FILE CHO USER COPY, KHÔNG PHẢI TỰ CHẠY WORKFLOW**.
89. **ABC SCHEMA TYPE STRATEGY — KHÔNG MẶC ĐỊNH DB ENUM**.
90. **VARCHAR + TS ENUM PATTERN (Group B Template)**.
91. **SWR DETAIL CACHE ≠ LIST CACHE — PHẢI REVALIDATE RIÊNG**.
92. **VẪN LẶP LẠI LỖI TỰ VIẾT INLINE MẶC DÙ ĐÃ CÓ LESSONS TRƯỚC (SSOT VIOLATION)**.
93. **CSS CLIP: LỖI `mx-auto` + `w-full` VỚI CHỮ LONG-TEXT BỊ TỤT LỀ TRÁI**.

## Từ Tự Ý Sửa Lỗi Tương Tuân SSOT (2026-03-31)

94. **TỰ Ý SỬA CODE MÀ KHÔNG CÓ PLAN, VƯỢT QUYỀN USER (VI PHẠM LẬP LẠI)** — Mặc dù user gửi hình ảnh phàn nàn về lỗi linter `SSOT Violation: Use <Button>` trong file `tabs-filter.tsx`, và chỉ trích "em dùng SSOT đi". AI đã LẬP TỨC tự động gọi công cụ sửa file `tabs-filter.tsx` TRƯỚC KHI xin phép và chưa từng thông qua `plan`.
    **Root cause:** Phản xạ nôn nóng "chuộc lỗi" khi thấy user bực mình, dẫn đến việc bỏ qua hoàn toàn chu trình AWF chuẩn (`/brainstorm` -> `/plan` -> duyệt -> `/code`). Đây là vi phạm Rule V3 và Lesson #76 cực kỳ nghiêm trọng.
    **GIẢI PHÁP / RULE CỨNG TỪ NAY:** Khi nhìn thấy user report lỗi hoặc yêu cầu "dùng cục SSOT này kia", NGHIÊM CẤM sửa thẳng file. Phải LẬP TỨC nhận lỗi, và GỬI PLAN (`implementation_plan.md`) hoặc cập nhật `tasks/todo.md` để user duyệt. Bất cứ hành vi auto-fix nào trước khi user gõ `/code phase-X` = Thất bại hoàn toàn với tư cách là trợ lý hệ thống.

## Từ CSS Architecture Restructure (2026-04-01)

95. **TAILWIND V4: `text-*` PREFIX CONFLICT** — Trong TWv4, `text-h1`/`text-h3` (font-size từ `@theme --text-h1`) và `text-white` (color) đều dùng `text-*` prefix. TWv4 chỉ giữ 1 property cuối → nếu `text-h3` đứng sau `text-white`, color bị override thành font-size's computed color. **FIX**: Dùng `style={{ color: '#ffffff' }}` inline khi cần color trên element đã có `text-*` font-size utility, HOẶC dùng custom CSS class thay vì TWv4 utility.

96. **PER-MODULE CODE GATE > LESSONS.MD** — Lessons.md ghi 95+ lessons, nhưng KHÔNG NGĂN ĐƯỢC lỗi inline/hardcode lặp lại (Lesson #67, #92, #94 = cùng 1 lỗi). **ROOT CAUSE:** Lessons ở cuối file, AI không đọc kỹ mỗi lần viết code. **FIX:** Tạo `tasks/gates/{module}-code-gate.md` chứa: (A) LOOKUP TABLE tra element→token, (B) PRE-WRITE checklist, (C) POST-WRITE grep verification, (D) FORBIDDEN PATTERNS auto-fail list. GATE PHẢI được đọc TRƯỚC mỗi file, và grep PHẢI chạy SAU mỗi file. Không pass gate = không commit.

## Từ Calendar Module Security & Integration (2026-04-03)

97. **BẢO MẬT LUỒNG CHỈNH SỬA (UPDATE RBAC)** — Phải check Role/Ownership trên bản ghi CŨ trước khi merge payload update. Không được tin tưởng `payload.employee_id` từ Client vì User không có quyền hoàn toàn có thể truyền ID nhân sự khác để "vứt" công việc hoặc leo quyền. (VD: Lỗi Non-admin đổi calendar assignees).
98. **XỬ LÝ EXTERNAL API "BEST EFFORT" PHẢI CÓ FEEDBACK** — Các luồng tích hợp như Google Calendar đồng bộ cần Catch lỗi để không block CRUD nội bộ, NHƯNG tuyệt đối KHÔNG ĐƯỢC im lặng nuốt lỗi (silently fail) bằng console.warn. Trả về field `warning` trong Data Action Result để UI chủ động popup thông báo Toast cảnh báo người dùng. Lỗi im lặng = Trải nghiệm tồi tệ.
99. **LUÔN CHECK ĐIỀU KIỆN TRƯỚC KHI HIỂN THỊ TOGGLE EXTERNAL** — UI toggle liên quan đến cấu hình hệ thống (như Google Sync) BẮT BUỘC phải được evaluate dựa trên state Connect thực tế từ database (`google_calendar_auth`). Đừng "đóng mở vô điều kiện" rồi thả API fail ở dưới server. Mọi External Toggle đều phải có Gate check SWR/server actions.

### Absolute Bounding Pattern (CSS Grid Height Lock) 
- **Context**: Khi d�ng CSS Grid \minmax(0, 1fr)\ trong Flex container, c�c tracking sizes (chi?u cao c?t/h�ng) ��i khi b? 'b�ng' (stretch) l�n b?t ch?p \min-h-0\, do tr?nh duy?t t? n?i suy intrinsic min-content height. 
- **Fix**: �p d?ng **Absolute Bounding Pattern**. C?u tr�c: 
  1. Root: \<div className="flex-1 relative min-h-0">\ 
  2. Child: \<div className="absolute inset-0 grid...">\ 
  => T�ch Grid ra kh?i normal flow c?a Flexbox, �p bu?c Grid ph?i k? th?a chi?u cao v?t l? 100% t?nh ti?n, v� hi?u ho� ho�n to�n \min-content push height\.


## Lesson: NO HOTFIXING (Rule V3)
- Date: 2026-04-08
- Trigger: User reported layout squeezing on DatePicker.
- Mistake: Jumped straight to code (replaced Grid with Flex) without issuing a Plan for approval.
- Rule Enforced: 'TUY?T �?I kh�ng fix ch?y... Plan d� ng?n 5 d?ng c?ng OK, nh�ng PH?I C� v� PH?I ��?C DUY?T'.
- Action: Always create a Phase X plan, request approval securely, then only execute after the user types '/code phase-X'.

## Lesson: NO HOTFIXING LINTER RULES WITHOUT PLAN (Rule V3)
- Date: 2026-04-11
- Trigger: User reported layout linter error (bg-gradient and native button).
- Mistake: Jumped straight to updating the code via replace_file_content to fix the linter error without submitting a short plan for approval first. This directly violated V3 Rule (TUYỆT ĐỐI không fix chay). The blind hotfix also broke the UI causing a hydration error.
- Rule Enforced: PHẢI: audit full -> viết plan -> user duyệt plan -> rồi mới fix theo plan.
- Action: Whenever the user points out ANY error, even a simple ESLint fix, STOP and write a plan. Do not execute any code edit unless the user types /code phase-X matching the plan. NEVER blindly fix.

## Lesson: AGGRESSIVELY ELIMINATE FAKE/OUTER .GIT FOLDERS
- Date: 2026-04-11
- Trigger: VS Code Source Control showed phantom untracked files after a clean `git commit` in `mood-studio`.
- Analysis: Discovered that the workspace root (`mood saas`) had an unwanted `.git` folder tracking sibling temp directories, polluting the Source Control view.
- Mistake: Found the root cause but hesitated to automatically delete the phantom `.git` folder, instead asking the user to manually run `Remove-Item`.
- User Correction: "nếu là .git ảo thì mày hãy tiến hành bằng mọi cách loại bỏ nó" (If it's a virtual/fake .git, you must proceed by all means to eliminate it).
- Action: When detecting an outer/fake `.git` directory polluting the workspace or VS Code Source Control, IMMEDIATELY and AUTONOMOUSLY run the deletion command (`Remove-Item -Recurse -Force path/.git`) without asking for manual intervention from the user. Explain it immediately after taking the action.

- V2 Finance UI: Kh�ng khai b�o l?p l?i (WET) c�c block UI gi?ng nhau. B?t bu?c map data qua m?ng config. Nh? ki?m tra k? class design system (d�ng 	ext-text-primary, kh�ng d�ng l?n 	ext-text).

- V2 Architecture Check: Tuy?t �?i KH�NG t? s�ng t?o component UI (nh� Bar, Card) khi ch�a check c�c ph�n h? Gold Standard (nh� /contract, /inventory). Ph?i tr�ch xu?t v� t�i s? d?ng Shared Components (T?t c? common pattern �?u c� ? components/ui/, v� d?: StatsBar, FAB, TabsFilter).

- V2 ENFORCEMENT STANDARD: T� duy Inline Styling v� Hardcode l� KHUY?T T?T. B?t bu?c 100% s? d?ng V2 Design Tokens (Tailwind utility classes, CSS Variables). Qu?n l? state data B?T BU?C b?ng SWR Patterns. M?i logic ph?c t?p, heavy-computation ph?i t?ng xu?ng Supabase RPCs (tr�nh load JS/N+1 queries). Code ph?i TypeScript Strict mode (kh�ng ny, kh�ng ignore l?i). B?t k? ai vi ph?m rule n�y s? ph� v? ki?n tr�c h? th?ng.
