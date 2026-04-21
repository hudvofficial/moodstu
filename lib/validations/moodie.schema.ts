import { z } from "zod";

export const moodieMessageSchema = z.object({
  conversation_id: z.string().uuid().nullable().optional(),
  content: z
    .string()
    .trim()
    .min(1, "Nội dung không được để trống")
    .max(4000, "Tin nhắn tối đa 4000 ký tự"),
});

export const moodieRenameConversationSchema = z.object({
  conversation_id: z.string().uuid("Cuộc trò chuyện không hợp lệ"),
  title: z
    .string()
    .trim()
    .min(1, "Tiêu đề không được để trống")
    .max(120, "Tiêu đề tối đa 120 ký tự"),
  expected_updated_at: z.string().datetime("Thiếu dấu khóa cập nhật"),
});

export const moodieDeleteConversationSchema = z.object({
  conversation_id: z.string().uuid("Cuộc trò chuyện không hợp lệ"),
  expected_updated_at: z.string().datetime().optional(),
});

export const moodieConversationQuerySchema = z.object({
  conversation_id: z.string().uuid("Cuộc trò chuyện không hợp lệ"),
});

export type MoodieMessageInput = z.infer<typeof moodieMessageSchema>;
export type MoodieRenameConversationInput = z.infer<typeof moodieRenameConversationSchema>;
export type MoodieDeleteConversationInput = z.infer<typeof moodieDeleteConversationSchema>;
