# Phase 02: Google 2-way Color Sync Validation

**Mục tiêu:** Giữ nguyên tính năng 2 chiều Live-time color sync giữa Mood và Google, nhưng vá lỗ hổng Security bằng Zod validation.

**Các bước thực hiện:**
1. Mở `app/actions/calendar-mutations.ts`.
2. Định nghĩa schema Zod cho Google Patch, CHỈ cho phép cập nhật `colorId` (Enum từ "1" đến "11"):
   ```ts
   const patchColorSchema = z.object({
     colorId: z.enum(["1", "2", "3", "4", "5", "6", "7", "8", "9", "10", "11"])
   });
   
   const patchGoogleSchema = z.object({
     googleEventId: z.string().min(1, "Google Event ID không hợp lệ"),
     updates: patchColorSchema
   });
   ```
3. Update argument type của `patchGoogleCalendarEvent`: bỏ `Record<string, any>`, thay bằng `{ colorId: string }`. Apply `withAuth` + Zod để parse an toàn.
4. Mở `app/actions/calendar-queries.ts` (`fetchCalendarEvents`): Populate data contract chuẩn xác cho `originalGoogleEvent`, đảm bảo gán rõ: `originalGoogleEvent: { id: ge.id, htmlLink: ge.htmlLink, colorId: ge.colorId }`.
5. Mở `types/calendar.types.ts`: Cập nhật interface `originalGoogleEvent` thêm field `colorId?: string`.
6. Trong Drawer `components/calendar/drawers/event-form-drawer.tsx`: 
   - State `googleColor` phải khởi tạo bằng `event.originalGoogleEvent.colorId` nêú có, KHÔNG mặc định cứng là `"9"`.
   - Giữ lại nút "Mở trong Google Calendar" (`htmlLink`) để user đi tới event gốc.

**Next Context:** Sau khi hoàn thành, tiến tới Phase 03 để sửa timezone drift.
