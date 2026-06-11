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
import JSZip from "jszip";

/**
 * Gated Batch Gallery Download Route (ZIP)
 * GET /api/gallery-download-batch/[token]
 *
 * Query params:
 * - ids: comma-separated list of image IDs (e.g. ?ids=id1,id2)
 * - galleryId: (Required only for admin token when no ids or to verify ownership)
 */

const MAX_ZIP_FILES = 30; // Giới hạn số lượng file để tránh quá tải RAM/Timeout

async function fetchDriveFileBuffer(fileId: string, apiKey: string): Promise<Buffer | null> {
  try {
    // lh3 URL
    const lh3Url = `https://lh3.googleusercontent.com/d/${fileId}=s0`;
    const lh3Res = await fetch(lh3Url, { redirect: "follow" });
    if (lh3Res.ok) {
      const ab = await lh3Res.arrayBuffer();
      return Buffer.from(ab);
    }

    // Drive alt=media
    const apiRes = await fetch(
      `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media&key=${apiKey}`,
    );
    if (apiRes.ok) {
      const ab = await apiRes.arrayBuffer();
      return Buffer.from(ab);
    }
  } catch (err) {
    console.error(`[fetchDriveFileBuffer] Error for file ${fileId}:`, err);
  }
  return null;
}

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

  const API_KEY = process.env.GOOGLE_DRIVE_API_KEY;
  if (!API_KEY) {
    return NextResponse.json({ error: "Drive API chưa cấu hình" }, { status: 500 });
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

    if (searchParams.get("client_zip") === "true") {
      const zipName = resolvedGallery?.title ? `album-${resolvedGallery.title.replace(/\s+/g, "_")}.zip` : `album-${resolvedGalleryId}.zip`;
      return NextResponse.json({
        zipName,
        images: downloadableImages.map((img) => ({
          name: img.file_name || `photo_${img.id}.jpg`,
          url: `/api/gallery-download/${token}/${img.id}` // Use existing proxy or lh3 URL. Wait, if we use lh3 url, it might be blocked by CORS! Let's use the native download endpoint /api/gallery-download which proxies the image.
        }))
      });
    }

    if (downloadableImages.length > MAX_ZIP_FILES) {
      return NextResponse.json(
        { error: `Chỉ cho phép tải tối đa ${MAX_ZIP_FILES} ảnh cùng lúc để đảm bảo hiệu năng. Vui lòng chọn ít ảnh hơn.` },
        { status: 400 },
      );
    }

    // ─── DOWNLOAD AND COMPRESS ──────────────────────────────────────
    const zip = new JSZip();
    const batchSize = 5;

    for (let i = 0; i < downloadableImages.length; i += batchSize) {
      const currentBatch = downloadableImages.slice(i, i + batchSize);
      const downloadPromises = currentBatch.map(async (img) => {
        const buffer = await fetchDriveFileBuffer(img.drive_file_id!, API_KEY);
        if (buffer) {
          const name = img.file_name || `photo_${img.id}.jpg`;
          zip.file(name, buffer);
        }
      });
      await Promise.all(downloadPromises);
    }

    const zipBuffer = await zip.generateAsync({ type: "blob" });

    const headers = new Headers();
    headers.set("Content-Type", "application/zip");
    const zipName = resolvedGallery?.title ? `album-${resolvedGallery.title.replace(/\s+/g, "_")}.zip` : `album-${resolvedGalleryId}.zip`;
    headers.set(
      "Content-Disposition",
      `attachment; filename="${zipName}"; filename*=UTF-8''${encodeURIComponent(zipName)}`,
    );

    return new NextResponse(zipBuffer, {
      status: 200,
      headers,
    });
  } catch (err) {
    console.error("[gallery-download-batch] Error:", err);
    return NextResponse.json({ error: "Lỗi server khi đóng gói tải zip" }, { status: 500 });
  }
}
