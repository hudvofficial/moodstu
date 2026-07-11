import { createClient } from "@/lib/supabase/server";
import type { MoodieAttachment } from "@/types/moodie";

const BUCKET = "moodie-attachments";
const MAX_FILE_SIZE = 10 * 1024 * 1024;
const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "application/pdf", "text/plain"]);

function sanitizeFileName(name: string) {
  return name.normalize("NFKD").replace(/[^a-zA-Z0-9._-]+/g, "-").replace(/-+/g, "-").slice(0, 120) || "attachment";
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: "Phiên đăng nhập đã hết hạn" }, { status: 401 });

  const formData = await request.formData();
  const file = formData.get("file");
  if (!(file instanceof File)) return Response.json({ error: "Thiếu tệp đính kèm" }, { status: 400 });
  if (!ALLOWED_TYPES.has(file.type)) return Response.json({ error: "Định dạng tệp chưa được hỗ trợ" }, { status: 415 });
  if (file.size <= 0 || file.size > MAX_FILE_SIZE) return Response.json({ error: "Tệp phải nhỏ hơn 10 MB" }, { status: 413 });

  const id = crypto.randomUUID();
  const storagePath = `${user.id}/${id}-${sanitizeFileName(file.name)}`;
  const { error } = await supabase.storage.from(BUCKET).upload(storagePath, file, { contentType: file.type, upsert: false });
  if (error) return Response.json({ error: `Không thể tải tệp: ${error.message}` }, { status: 500 });

  const attachment: MoodieAttachment = {
    id,
    name: file.name.slice(0, 180),
    mime_type: file.type,
    size: file.size,
    storage_path: storagePath,
  };
  return Response.json({ attachment });
}

export async function DELETE(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: "Phiên đăng nhập đã hết hạn" }, { status: 401 });

  const body = await request.json() as { storage_path?: string };
  if (!body.storage_path?.startsWith(`${user.id}/`)) return Response.json({ error: "Đường dẫn tệp không hợp lệ" }, { status: 400 });
  const { error } = await supabase.storage.from(BUCKET).remove([body.storage_path]);
  if (error) return Response.json({ error: `Không thể xóa tệp: ${error.message}` }, { status: 500 });
  return Response.json({ success: true });
}
