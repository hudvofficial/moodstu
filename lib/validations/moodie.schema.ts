import { z } from "zod";

const moodieAttachmentSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1).max(180),
  mime_type: z.string().min(1).max(120),
  size: z.number().int().positive().max(10 * 1024 * 1024),
  storage_path: z.string().min(1).max(500),
});

const moodieComposerContextSchema = z.object({
  id: z.string().min(1).max(120),
  type: z.enum(["capability", "contract", "customer", "calendar", "gallery", "reporting_period"]),
  label: z.string().min(1).max(160),
  value: z.string().max(500).optional(),
});

export const moodieMessageSchema = z.object({
  conversation_id: z.string().uuid().nullable().optional(),
  request_id: z.string().uuid().optional(),
  turn_id: z.string().uuid().optional(),
  regenerate_from_message_id: z.string().uuid().optional(),
  edit_from_message_id: z.string().uuid().optional(),
  content: z
    .string()
    .trim()
    .min(1, "Nội dung không được để trống")
    .max(4000, "Tin nhắn tối đa 4000 ký tự"),
  attachments: z.array(moodieAttachmentSchema).max(6).default([]),
  contexts: z.array(moodieComposerContextSchema).max(8).default([]),
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

export const moodieFeedbackSchema = z.object({
  conversation_id: z.string().uuid(),
  message_id: z.string().uuid(),
  rating: z.union([z.literal(-1), z.literal(1)]),
  note: z.string().trim().max(500).optional(),
});

export const moodieTurnQuerySchema = z.object({
  turn_id: z.string().uuid(),
});

export const moodieConversationQuerySchema = z.object({
  conversation_id: z.string().uuid("Cuộc trò chuyện không hợp lệ"),
});

export type MoodieMessageInput = z.infer<typeof moodieMessageSchema>;
export type MoodieRenameConversationInput = z.infer<typeof moodieRenameConversationSchema>;
export type MoodieDeleteConversationInput = z.infer<typeof moodieDeleteConversationSchema>;
