import { NextRequest, NextResponse } from "next/server";

/**
 * Drive Download Proxy
 * GET /api/drive-download/[fileId]
 *
 * Proxy file gốc từ Google Drive → stream cho client
 * Khách tải ảnh gốc mà không cần biết Google Drive
 */

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ fileId: string }> },
) {
  const { fileId } = await params;

  if (!fileId || fileId.length < 10) {
    return NextResponse.json(
      { error: "File ID không hợp lệ" },
      { status: 400 },
    );
  }

  const API_KEY = process.env.GOOGLE_DRIVE_API_KEY;
  if (!API_KEY) {
    return NextResponse.json(
      { error: "Drive API chưa cấu hình" },
      { status: 500 },
    );
  }

  try {
    // 1. Lấy metadata (tên file, mime type)
    const metaRes = await fetch(
      `https://www.googleapis.com/drive/v3/files/${fileId}?fields=name,mimeType,size&key=${API_KEY}`,
    );

    if (!metaRes.ok) {
      const err = await metaRes.json().catch(() => ({}));
      if (metaRes.status === 404) {
        return NextResponse.json({ error: "File không tồn tại" }, { status: 404 });
      }
      return NextResponse.json(
        { error: err?.error?.message || "Không thể truy cập file" },
        { status: metaRes.status },
      );
    }

    const meta = await metaRes.json();

    // 2. Download file gốc từ Drive
    const downloadRes = await fetch(
      `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media&key=${API_KEY}`,
    );

    if (!downloadRes.ok || !downloadRes.body) {
      return NextResponse.json(
        { error: "Không thể tải file từ Drive" },
        { status: 502 },
      );
    }

    // 3. Stream response cho client
    const headers = new Headers();
    headers.set("Content-Type", meta.mimeType || "application/octet-stream");
    headers.set(
      "Content-Disposition",
      `attachment; filename="${encodeURIComponent(meta.name || `photo_${fileId}`)}"`,
    );
    if (meta.size) {
      headers.set("Content-Length", meta.size);
    }
    // Cache 1 giờ (ảnh ít thay đổi)
    headers.set("Cache-Control", "public, max-age=3600");

    return new NextResponse(downloadRes.body, {
      status: 200,
      headers,
    });
  } catch (err) {
    console.error("[drive-download] Error:", err);
    return NextResponse.json(
      { error: "Lỗi server khi tải file" },
      { status: 500 },
    );
  }
}
