import { NextRequest, NextResponse } from "next/server";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { requireContractAccess } from "@/lib/auth_utils";
import { verifyGalleryAccessProof } from "@/lib/gallery-access";
import {
  fetchSharedGalleryByAccessUrl,
} from "@/app/actions/gallery-actions";
import {
  getGalleryAccessVersion,
  getGalleryCapability,
} from "@/lib/gallery-access";

/**
 * Gated Batch Gallery Download Route
 * GET /api/gallery-download-batch/[token]
 *
 * Returns the list of authorized image names + direct lh3 URLs as JSON.
 * The browser fetches each file straight from Google and zips client-side
 * (see SelectionSummary / lib/gallery-download). We NEVER buffer/stream the
 * image bytes through this function — doing so burns Fast Origin/Data
 * Transfer on Vercel (the bug that crashed prod). This route only gates
 * access; the bytes never touch Vercel.
 *
 * Query params:
 * - ids: comma-separated list of image IDs (e.g. ?ids=id1,id2)
 * - galleryId: (Required only for admin token when no ids or to verify ownership)
 */

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> },
) {
  const { token } = await params;
  const searchParams = request.nextUrl.searchParams;
  const idsStr = searchParams.get("ids") || "";
  const queryGalleryId = searchParams.get("galleryId") || "";

  const ids = idsStr ? idsStr.split(",").filter((id) => id.trim()) : [];

  if (token !== "admin" && !token) {
    return NextResponse.json({ error: "Token không hợp lệ" }, { status: 400 });
  }

  const adminSupabase = await createAdminClient();

  try {
    let resolvedGalleryId = "";
    let resolvedGallery: any = null;

    // ─── CASE 1: Admin bypass ──────────────────────────────────────
    if (token === "admin") {
      const userSupabase = await createClient();
      const {
        data: { user },
      } = await userSupabase.auth.getUser();

      if (!user) {
        return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });
      }

      try {
        await requireContractAccess(adminSupabase, user.id);
      } catch (err: any) {
        return NextResponse.json(
          { error: err?.message || "Không có quyền truy cập" },
          { status: 403 },
        );
      }

      if (queryGalleryId) {
        resolvedGalleryId = queryGalleryId;
      } else if (ids.length > 0) {
        // Lấy gallery_id từ image đầu tiên
        const { data: firstImg } = await adminSupabase
          .from("gallery_images")
          .select("gallery_id")
          .eq("id", ids[0])
          .maybeSingle();
        if (firstImg) {
          resolvedGalleryId = firstImg.gallery_id;
        }
      }

      if (!resolvedGalleryId) {
        return NextResponse.json({ error: "Thiếu thông tin galleryId" }, { status: 400 });
      }
    }
    // ─── CASE 2: Guest token ───────────────────────────────────────
    else {
      const [bodyPart, signaturePart] = token.split(".");
      if (!bodyPart || !signaturePart) {
        return NextResponse.json({ error: "Token không hợp lệ" }, { status: 400 });
      }

      let payload: any;
      try {
        payload = JSON.parse(Buffer.from(bodyPart, "base64url").toString("utf8"));
      } catch {
        return NextResponse.json({ error: "Token không hợp lệ" }, { status: 400 });
      }

      const { galleryId, accessUrl, capability } = payload;

      if (!galleryId || !accessUrl) {
        return NextResponse.json({ error: "Token không hợp lệ" }, { status: 400 });
      }

      // Tải gallery
      resolvedGallery = await fetchSharedGalleryByAccessUrl(adminSupabase, accessUrl);
      if (!resolvedGallery || resolvedGallery.id !== galleryId) {
        return NextResponse.json({ error: "Album không tồn tại" }, { status: 404 });
      }

      resolvedGalleryId = galleryId;

      // Verify token signature
      const isTokenValid = verifyGalleryAccessProof(token, {
        galleryId,
        accessUrl,
        accessVersion: getGalleryAccessVersion(resolvedGallery),
        capability,
      });

      if (!isTokenValid) {
        return NextResponse.json(
          { error: "Liên kết truy cập không hợp lệ hoặc đã hết hạn" },
          { status: 403 },
        );
      }

      // ─── CHECK CAPABILITY & PAYMENT GATE ───────────────────────
      const cap = capability || getGalleryCapability(resolvedGallery);

      if (cap === "view") {
        return NextResponse.json(
          { error: "Liên kết chỉ xem, không được phép tải ảnh gốc" },
          { status: 403 },
        );
      }

      // Check unlock
      const isUnlocked = resolvedGallery.allow_download || !!resolvedGallery.download_unlocked_at;

      if (cap === "select" && !isUnlocked) {
        return NextResponse.json(
          { error: "Tính năng tải ảnh gốc chưa được kích hoạt cho album này" },
          { status: 403 },
        );
      }

      if (cap === "download") {
        if (!isUnlocked) {
          // Check contract payment gate
          if (!resolvedGallery.contract_id) {
            return NextResponse.json(
              { error: "Hợp đồng không tồn tại, cần admin mở khóa tải" },
              { status: 403 },
            );
          }

          const { data: contract } = await adminSupabase
            .from("contracts")
            .select("payment_status, remaining_amount")
            .eq("id", resolvedGallery.contract_id)
            .maybeSingle();

          const isPaid =
            contract &&
            (contract.payment_status === "da_thanh_toan" ||
              (typeof contract.remaining_amount === "number" && contract.remaining_amount <= 0));

          if (!isPaid) {
            return NextResponse.json(
              { error: "Vui lòng hoàn thành thanh toán hợp đồng để tải ảnh gốc" },
              { status: 402 },
            );
          }
        }
      }
    }

    // ─── GET IMAGES LIST TO DOWNLOAD ────────────────────────────────
    let query = adminSupabase
      .from("gallery_images")
      .select("id, file_name, drive_file_id")
      .eq("gallery_id", resolvedGalleryId);

    if (ids.length > 0) {
      query = query.in("id", ids);
    }

    const { data: images, error: imagesErr } = await query;
    if (imagesErr || !images || images.length === 0) {
      return NextResponse.json({ error: "Không tìm thấy ảnh nào để tải" }, { status: 404 });
    }

    // Filter out images without drive_file_id
    const downloadableImages = images.filter((img) => img.drive_file_id);
    if (downloadableImages.length === 0) {
      return NextResponse.json({ error: "Không có file Drive nào để tải" }, { status: 404 });
    }

    // Return direct lh3 URLs only — the browser zips client-side. Image bytes
    // are fetched straight from Google's CDN, never streamed through Vercel.
    const zipName = resolvedGallery?.title
      ? `album-${resolvedGallery.title.replace(/\s+/g, "_")}.zip`
      : `album-${resolvedGalleryId}.zip`;

    return NextResponse.json({
      zipName,
      images: downloadableImages.map((img) => ({
        name: img.file_name || `photo_${img.id}.jpg`,
        url: `https://lh3.googleusercontent.com/d/${img.drive_file_id}=s0`,
      })),
    });
  } catch (err) {
    console.error("[gallery-download-batch] Error:", err);
    return NextResponse.json({ error: "Lỗi server khi đóng gói tải zip" }, { status: 500 });
  }
}
