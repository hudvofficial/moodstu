# TASK — Phase 3: Force UI composer open-webui vào Moodie (pixel parity)

Mục tiêu: composer của Moodie phải NHÌN GIỐNG open-webui (ảnh chuẩn: placeholder lớn, hàng dưới trái nút `+` tròn + nút tools tròn, phải mic xám + nút tròn ĐEN), giữ nguyên 100% chức năng moodie hiện có (draft localStorage, attachments API, capabilities/contexts, dictate, voice mode).

## Spec trích từ source open-webui (đã trace, class nguyên văn)

**Container** (`MessageInput.svelte:1361-1365`):
`flex flex-col relative w-full shadow-lg rounded-3xl border border-gray-100/30 hover:border-gray-200 focus-within:border-gray-100 transition px-1 bg-white/5 backdrop-blur-sm`
→ Moodie map: giữ `bg-white` (theme sáng), `rounded-3xl shadow-lg border border-gray-100 hover:border-gray-200 focus-within:border-gray-200 transition px-1`. BỎ px-3 pt-3 hiện tại của container (padding chuyển vào textarea + toolbar như open-webui).

**Textarea**: padding `px-3 pt-3 pb-1`, `text-base` (to hơn hiện tại), placeholder = `"Tôi có thể giúp gì cho bạn hôm nay?"` (đổi từ "Gửi yêu cầu cho Moodie"), giữ auto-resize max-h-48. Khi disabled giữ placeholder "Cuộc trò chuyện đang được xử lý...". Tiếng Việt trong code = \uXXXX escapes.

**Hàng toolbar dưới** (`:1686-1687`): `flex justify-between mt-0.5 mb-2.5 mx-0.5`, nhóm trái `ml-1 self-end flex items-center flex-1 min-w-0`, nhóm phải `self-end flex items-center gap-0.5 mr-1`.

**Nút trái** (cả 2 dùng đúng class `:1743`):
`bg-transparent hover:bg-gray-100 text-gray-700 rounded-full size-8 flex justify-center items-center shrink-0`
1. Nút `+` (lucide `Plus` size h-5 w-5): mở file picker (chức năng Paperclip cũ — upload là hành vi chính của menu + bên open-webui). Khi `uploading` → `Loader2` spin. aria "Đính kèm tệp".
2. Nút tools (lucide `Sparkles` h-[18px] w-[18px]): toggle panel shortcuts/capabilities (chức năng nút Plus cũ). Active state: `bg-gray-100 text-gray-900`. aria "Kỹ năng và lệnh nhanh".
3. BỎ dòng hint "Enter để gửi · Shift+Enter xuống dòng" (open-webui không có).

**Nút phải:**
1. Mic dictate (`:2058-2103`): `text-gray-600 hover:text-gray-700 transition rounded-full p-1.5 self-center mr-0.5`, lucide `Mic` h-5 w-5. Giữ logic recording hiện có.
2. Nút tròn ĐEN (`:2107-2168` + `:2177-2201`), `transition rounded-full p-1.5 self-center`:
   - Ô nhập RỖNG && không attachments && !loading → voice mode: `bg-black text-white hover:bg-gray-900`, lucide `AudioLines` h-5 w-5, mở overlay (logic hiện có).
   - Có text → send: `bg-black text-white hover:bg-gray-900`, `ArrowUp` h-5 w-5. KHÔNG còn màu primary/nâu.
   - `loading` → nút Stop: giữ vị trí đó, `bg-black text-white`, `Square` h-3.5 w-3.5 fill-current.
   - Disabled (edge): `bg-gray-200 text-white`.

**Thanh ghi âm (dictate)** — port đúng palette open-webui VoiceRecording (`:453-631`): nền `bg-indigo-300/10` (transcribing: `bg-gray-100/50`), nút X trái `bg-indigo-400/20 text-indigo-600 p-1.5 rounded-full`, cột sóng `bg-indigo-500` w-[2px], thời gian `text-indigo-400 text-sm font-medium`, nút ✓ `p-1.5 bg-indigo-500 text-white rounded-full`. Sửa trong `moodie-voice-recorder.tsx` (hiện dùng primary — đổi sang indigo như bản gốc).

**Chips attachments/contexts**: giữ nguyên hành vi, đặt `mx-2 mt-2.5 pb-1.5 flex items-center flex-wrap gap-2` (`:1395-1397`).

**Footer** "Moodie có thể mắc lỗi..." giữ nguyên (tương đương input_footer của open-webui).

## ⚠️ CẬP NHẬT PALETTE (user chốt 2026-07-11): LAYOUT theo open-webui, MÀU theo mood-studio

Mọi màu gray/black/indigo trong spec trên phải map sang design token của mood:

| Spec open-webui | Token mood phải dùng |
|---|---|
| Nút trái `text-gray-700 hover:bg-gray-100` | `text-text-muted hover:bg-bg-subtle` (active: `bg-bg-subtle text-primary`) |
| Mic `text-gray-600 hover:text-gray-700` | `text-text-muted hover:text-text-primary` |
| Nút tròn ĐEN `bg-black text-white hover:bg-gray-900` | `bg-primary text-white hover:bg-primary/90` (nâu thương hiệu mood) |
| Send disabled `bg-gray-200 text-white` | `bg-bg-subtle text-text-muted` |
| Recorder indigo (`bg-indigo-300/10`, `bg-indigo-500`, `text-indigo-400/600`) | Tint primary: nền `bg-primary/8` (transcribing `bg-bg-subtle`), X `bg-primary/15 text-primary`, cột sóng `bg-primary`, thời gian `text-primary`, ✓ `bg-primary text-white` |
| Border container `border-gray-100 hover:border-gray-200` | `border-border/70 hover:border-border focus-within:border-primary/25` (convention module) |

Kích thước / bố cục / hình dạng / hành vi GIỮ NGUYÊN theo spec open-webui phía trên.

## Ràng buộc
- CHỈ sửa: `components/moodie/moodie-composer.tsx`, `components/moodie/moodie-voice-recorder.tsx`. KHÔNG đụng overlay, page-client, workspace.
- Không đổi props/logic — chỉ restyle + hoán đổi vai trò 2 nút trái như spec. Mọi handler giữ nguyên.
- No apply_patch — MCP read_text_file + write_file. \uXXXX escapes, comment ASCII. Không dependency mới (lucide có sẵn Plus, Sparkles, Mic, AudioLines, ArrowUp, Square, Loader2, X, Check).
- Mọi nút PHẢI có màu chữ/icon tường minh (text-gray-600/700) — đang có hiện tượng icon tàng hình trên nền trắng.

## Definition of done
1. `npx eslint` 2 file sửa `--max-warnings=0` sạch.
2. `npm run build` xanh (PATH prepend C:\Users\Admin\.nodejs, npm).
3. Quét mojibake: 0.
4. Báo cáo diff summary + quyết định nhỏ.
