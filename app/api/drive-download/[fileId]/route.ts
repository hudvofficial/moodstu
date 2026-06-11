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
 */

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ fileId: string }> },
) {
  const { fileId } = await params;

  if (!fileId || fileId.length < 10) {
    return NextResponse.json({ error: "File ID không hợp lệ" }, { status: 400 });
  }

  const lh3Url = `https://lh3.googleusercontent.com/d/${fileId}=s0`;

  // If caller explicitly requests JSON (for client-zip use-case), return URL.
  const want = request.nextUrl.searchParams.get("format");
  if (want === "json") {
    return NextResponse.json({ url: lh3Url });
  }

  // Default: 302 redirect — browser fetches directly from Google CDN.
  // Zero Vercel bandwidth consumed.
  return NextResponse.redirect(lh3Url, 302);
}
