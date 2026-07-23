import { NextRequest, NextResponse } from "next/server";

/**
 * Drive Download Proxy
 * GET /api/drive-download/[fileId]
 *
 * Redirect 302 → lh3.googleusercontent.com to avoid streaming
 * files through Vercel serverless (Fast Origin Transfer bandwidth).
 * All gallery images are already shared publicly on Drive, so the
 * redirect destination is accessible by the browser directly.
 *
 * Fallback JSON {url} returned for clients that need a stable
 * same-origin URL to fetch the blob themselves.
 *
 * ?size=N → trỏ sang bản =sN thay vì bản gốc. Dùng cho fallback THUMBNAIL:
 * không có tham số này thì lưới sẽ nạp nguyên file gốc (15 MB) chỉ để vẽ một ô
 * 600px, đốt data di động của khách. Mặc định vẫn =s0 để đường TẢI ẢNH không đổi.
 */

const MAX_THUMB_SIZE = 4096;

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ fileId: string }> },
) {
  const { fileId } = await params;

  if (!fileId || fileId.length < 10) {
    return NextResponse.json({ error: "File ID không hợp lệ" }, { status: 400 });
  }

  const sizeParam = Number(request.nextUrl.searchParams.get("size"));
  const size = Number.isInteger(sizeParam) && sizeParam > 0
    ? Math.min(sizeParam, MAX_THUMB_SIZE)
    : 0;
  const lh3Url = `https://lh3.googleusercontent.com/d/${fileId}=s${size}`;

  // If caller explicitly requests JSON (for client-zip use-case), return URL.
  const want = request.nextUrl.searchParams.get("format");
  if (want === "json") {
    return NextResponse.json({ url: lh3Url });
  }

  // Default: 302 redirect — browser fetches directly from Google CDN.
  // Zero Vercel bandwidth consumed.
  return NextResponse.redirect(lh3Url, 302);
}
