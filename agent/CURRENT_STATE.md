# CURRENT_STATE.md — Trạng thái thật (mood-studio)

> **File sống — Claude cập nhật mỗi phiên.** Đây là "sự thật hiện tại", thay cho các
> PLAN cũ đã lỗi thời (`plans/260603-native-feel-performance/` KHÔNG còn phản ánh
> thực trạng — user xác nhận đã tối ưu nhiều mà không cập nhật file đó).
> Cập nhật gần nhất: **2026-07-14** · nhánh: `main` @ `508e967`.

## Hiệu năng — phần lớn ĐÃ SHIP (qua commit, không nằm trong PLAN cũ)
- SSR-first bootstrap thay client-waterfall (gallery, printing 1-call, dashboard TTL).
- Intent-based prefetch + tắt speculative warmup (`90aea43`).
- RPC v3 contract-detail đã code — **sau flag `NEXT_PUBLIC_RPC_V3`** (`app/actions/contract-queries.ts:527`). ⚠️ Cần xác nhận prod đã bật chưa.
- Region pin **sin1** (`3a1bf52`) — RTT server→DB giảm.
- Optimistic zero-latency phủ sâu contracts/finance; blurhash ngoài critical path.
- Bundle gate `perf:chunks`; React Compiler on; image WebP/AVIF (`next.config.ts`).

## Còn mở (nhìn thấy trong code)
- **`force-dynamic` trên 41 page** — nav vẫn server-render mỗi lần vào (mới giảm đau bằng prefetch). Gỡ tận gốc = PPR/`cacheComponents` (cần DECISION).
- RPC v3 còn sau flag — nếu prod chưa bật = win rẻ đã code sẵn.

## Hướng đi hiện tại của repo
- ~3 tuần gần đây commit đã rời perf sang **feature**: Moodie (voice/agent runtime), contract printable layout, multi-day event schedule. Tức perf đã tới mức "đủ tốt".

## Việc perf khuyến nghị (nếu tiếp) — theo thứ tự
1. Đo 1 lượt: `perf:audit` / `perf:contract-detail` + Vercel Speed Insights → số đẹp thì tuyên bố xong.
2. Check prod `NEXT_PUBLIC_RPC_V3`.
3. Chỉ khi đo thấy nav còn chậm thật → PPR cho trang force-dynamic (mở DECISION).

## In-flight (kiểm tra trước khi tạo task đụng cùng vùng)
- Worktree `.worktrees/contract` @ branch `codex/contract-optimization` — Codex, contract module. Xác nhận còn sống/đã merge trước khi giao task chạm `app/**contract**`, `components/contracts/**`.

## Con số cần cập nhật (chưa có tại thời điểm này)
- p75 LCP/INP production (Speed Insights) — **CHƯA đo** trong phiên hiện tại.
