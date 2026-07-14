# PROJECT_BRIEF.md — mood-studio

> Bản mô tả ổn định. Đổi hiếm. Ai cũng đọc để có bối cảnh chung.

## Là gì
Phần mềm quản trị **studio chụp ảnh/cưới** (SaaS nội bộ): hợp đồng, tài chính,
CRM/leads, kho váy & vật tư, đơn in ấn (printing/labs), lịch, gallery giao ảnh,
nhân sự/lương, dashboard, và trợ lý AI **Moodie**.

## Người dùng & mục tiêu
- Người dùng: chủ studio + nhân viên (nhiều vai trò/role). App chạy như PWA, dùng nhiều trên tablet/phone tại hiện trường.
- Mục tiêu sản phẩm: thao tác **mượt như native**, số liệu tài chính **luôn chính xác**, phân quyền chặt.

## Stack (nguồn: package.json)
- **Next.js 16** App Router + **React 19** + **React Compiler** (`reactCompiler: true`)
- **TypeScript** strict · **Tailwind v4**
- Data: **Supabase** (`@supabase/ssr`) — chủ yếu qua **Server Actions**; **SWR** (module A) + **React Query** (Contracts)
- Realtime: postgres_changes (bảng có RLS+grant) + **signal-table pattern** (bảng server-only)
- PWA: `@ducanh2912/next-pwa` · Sentry · Vercel Speed Insights
- AI: `@google/genai` (Moodie)
- Deploy: **Vercel**, functions pin **sin1** (Supabase ở Singapore)

## Ràng buộc nền (chi tiết ở CLAUDE.md → "Ràng buộc dự án" và `ARCHITECTURE.md`)
- Deploy = `git push origin main` (KHÔNG `vercel --prod`).
- Finance: **GIỮ `revalidatePath`**, không patch optimistic số tiền.
- Responsive 3-tier: phone `<768` · tablet `768–1023 (md:)` · desktop `≥1024 (lg:)`.
- Node: dùng `npx`/PATH đúng toolchain trước khi chạy build.

## Tài liệu liên quan
- Luật vận hành đa-agent: `agent/AGENT_RULES.md`
- Trạng thái hiện tại: `agent/CURRENT_STATE.md`
- Quyết định kiến trúc: `agent/DECISIONS.md`
