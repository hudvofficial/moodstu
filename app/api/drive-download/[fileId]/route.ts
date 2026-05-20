import { NextRequest, NextResponse } from "next/server";

/**
 * Drive Download Proxy
 * GET /api/drive-download/[fileId]
 *
 * Strategy:
 * 1. Lấy metadata (tên file, mime type) qua Drive API
 * 2. Download ảnh qua lh3.googleusercontent.com (direct URL, no auth needed)
 * 3. Fallback: Drive API alt=media nếu lh3 fail
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
    const fileName = meta.name || `photo_${fileId}.jpg`;

    // 2. Download — thử lh3 (direct URL) trước, fallback Drive API
    let downloadRes: Response | null = null;

    // Strategy A: lh3.googleusercontent.com (ổn định nhất cho shared files)
    const lh3Url = `https://lh3.googleusercontent.com/d/${fileId}=s0`; // s0 = original size
    const lh3Res = await fetch(lh3Url, { redirect: "follow" });

    if (lh3Res.ok && lh3Res.body) {
      const ct = lh3Res.headers.get("content-type") || "";
      if (ct.startsWith("image/")) {
        downloadRes = lh3Res;
      }
    }

    // Strategy B: Drive API alt=media (fallback)
    if (!downloadRes) {
      const apiRes = await fetch(
        `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media&key=${API_KEY}`,
      );
      if (apiRes.ok && apiRes.body) {
        const ct = apiRes.headers.get("content-type") || "";
        if (ct.startsWith("image/")) {
          downloadRes = apiRes;
        }
      }
    }

    // Cả 2 đều thất bại
    if (!downloadRes || !downloadRes.body) {
      return NextResponse.json(
        { error: "Không thể tải ảnh. File có thể chưa được chia sẻ công khai trên Google Drive." },
        { status: 403 },
      );
    }

    // 3. Stream response cho client
    const headers = new Headers();
    headers.set("Content-Type", meta.mimeType || "image/jpeg");
    headers.set(
      "Content-Disposition",
      `attachment; filename="${fileName}"; filename*=UTF-8''${encodeURIComponent(fileName)}`,
    );
    if (meta.size) {
      headers.set("Content-Length", meta.size);
    }
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
