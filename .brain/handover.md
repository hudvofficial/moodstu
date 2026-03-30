━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📋 HANDOVER DOCUMENT
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📍 Đang làm: Services Module V2 — Round 2 (UI/UX & Tech Debt Fixes)
🔢 Đến bước: Phase 0 DONE (Planning & Verification complete)

✅ ĐÃ XONG:
   - Migration V2 Phases 1-5 (Core crud, tables, mobile list, grid).
   - Visual Audit & Parity Check với V1.
   - Identified 7 remaining issues (Icon system, Formatting, Unused props, Tokens).
   - **CRITICAL BUG FOUND:** Quote Modal width regression (1375px vs 340px V1).

⏳ CÒN LẠI (Ready to Code):
   - **Phase 0:** Fix Quote Modal width using inline style (Priority 1).
   - **Phase A:** Migrate BundleSection to `lucide-react` (5 icons) and `formatCurrency` (2 prices).
   - **Phase B:** Remove unused `search` props from Filters.
   - **Phase C:** Standardize Mobile List expanded action buttons.

🔧 QUYẾT ĐỊNH QUAN TRỌNG:
   - Dùng `style={{ maxWidth: 340 }}` cho modal để vượt qua lỗi Tailwind JIT arbitrary value trong dynamic strings.
   - Giữ nguyên Grid hover overlay buttons (đặc thù context).
   - Bỏ qua Quote action buttons (In/PDF) để ưu tiên Parity thon gọn của V1.

⚠️ LƯU Ý CHO SESSION SAU:
   - File `components/services/quote/quote-modal.tsx` cần fix L87 ngay đầu session.
   - `ServiceBundleSection.tsx` L90+ có nhiều lỗi material icons và locale-formatting cần dọn dẹp.

📁 FILES QUAN TRỌNG:
   - implementation_plan.md (Scope chính)
   - .brain/session.json (Progress)
   - .brain/brain.json (Gotchas & Patterns)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📍 Đã lưu! Để tiếp tục: Gõ /recap
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
