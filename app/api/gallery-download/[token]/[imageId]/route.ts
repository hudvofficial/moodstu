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
 * Gated Gallery Download Route
 * GET /api/gallery-download/[token]/[imageId]
 *
 * Checks:
 * 1. Admin session bypass, or
 * 2. Valid token signature/expiration, and
 * 3. Payment/unlock gate matching:
 *    - view capability: Blocked
 *    - select capability: Requires explicit allow_download = true or manual unlock
 *    - download capability: Allowed if allow_download/manual unlock OR contract is fully paid (da_thanh_toan / remaining_amount <= 0)
 */

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ token: string; imageId: string }> },
) {
  const { token, imageId } = await params;

  if (!token || !imageId) {
    return NextResponse.json({ error: "Tham số không hợp lệ" }, { status: 400 });
  }

  const API_KEY = process.env.GOOGLE_DRIVE_API_KEY;
  if (!API_KEY) {
    return NextResponse.json({ error: "Drive API chưa cấu hình" }, { status: 500 });
  }

  const adminSupabase = await createAdminClient();

  try {
    let driveFileId = "";
    let downloadFileName = "";

    // ─── CASE 1: Admin bypass ──────────────────────────────────────
    if (token === "admin") {
      const userSupabase = await createClient();
      const {
        data: { user },
      } = await userSupabase.auth.getUser();

      if (!user) {
        return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });
      }

      // Check admin rights for contracts
      try {
        await requireContractAccess(adminSupabase, user.id);
      } catch (err: any) {
        return NextResponse.json(
          { error: err?.message || "Không có quyền truy cập" },
          { status: 403 },
        );
      }

      // Lấy image info
      const { data: img, error: imgErr } = await adminSupabase
        .from("gallery_images")
        .select("drive_file_id, file_name")
        .eq("id", imageId)
        .maybeSingle();

      if (imgErr || !img || !img.drive_file_id) {
        return NextResponse.json({ error: "Không tìm thấy file trên Drive" }, { status: 404 });
      }

      driveFileId = img.drive_file_id;
      downloadFileName = img.file_name || `photo_${imageId}.jpg`;
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
      const gallery = await fetchSharedGalleryByAccessUrl(adminSupabase, accessUrl);
      if (!gallery || gallery.id !== galleryId) {
        return NextResponse.json({ error: "Album không tồn tại" }, { status: 404 });
      }

      // Verify token signature
      const isTokenValid = verifyGalleryAccessProof(token, {
        galleryId,
        accessUrl,
        accessVersion: getGalleryAccessVersion(gallery),
        capability,
      });

      if (!isTokenValid) {
        return NextResponse.json(
          { error: "Liên kết truy cập không hợp lệ hoặc đã hết hạn" },
          { status: 403 },
        );
      }

      // Lấy image info và verify thuộc gallery
      const { data: img, error: imgErr } = await adminSupabase
        .from("gallery_images")
        .select("drive_file_id, file_name, gallery_id")
        .eq("id", imageId)
        .eq("gallery_id", galleryId)
        .maybeSingle();

      if (imgErr || !img || !img.drive_file_id) {
        return NextResponse.json({ error: "Ảnh không tồn tại trong album" }, { status: 404 });
      }

      driveFileId = img.drive_file_id;
      downloadFileName = img.file_name || `photo_${imageId}.jpg`;

      // ─── CHECK CAPABILITY & PAYMENT GATE ───────────────────────
      const cap = capability || getGalleryCapability(gallery);

      if (cap === "view") {
        return NextResponse.json(
          { error: "Liên kết chỉ xem, không được phép tải ảnh gốc" },
          { status: 403 },
        );
      }

      // Check unlock
      const isUnlocked = gallery.allow_download || !!gallery.download_unlocked_at;

      if (cap === "select" && !isUnlocked) {
        return NextResponse.json(
          { error: "Tính năng tải ảnh gốc chưa được kích hoạt cho album này" },
          { status: 403 },
        );
      }

      if (cap === "download") {
        if (!isUnlocked) {
          // Check contract payment gate
          if (!gallery.contract_id) {
            return NextResponse.json(
              { error: "Hợp đồng không tồn tại, cần admin mở khóa tải" },
              { status: 403 },
            );
          }

          const { data: contract, error: contractErr } = await adminSupabase
            .from("contracts")
            .select("payment_status, remaining_amount")
            .eq("id", gallery.contract_id)
            .maybeSingle();

          if (contractErr || !contract) {
            return NextResponse.json({ error: "Không tìm thấy hợp đồng" }, { status: 404 });
          }

          const isPaid =
            contract.payment_status === "da_thanh_toan" ||
            (typeof contract.remaining_amount === "number" && contract.remaining_amount <= 0);

          if (!isPaid) {
            return NextResponse.json(
              { error: "Vui lòng hoàn thành thanh toán hợp đồng để tải ảnh gốc" },
              { status: 402 }, // 402 Payment Required
            );
          }
        }
      }
    }

    // ─── RETURN DIRECT DOWNLOAD URL ─────────────────────────────
    // Bypass Vercel stream to save Fast Origin Transfer bandwidth.
    const url = `https://lh3.googleusercontent.com/d/${driveFileId}=s0`;

    return NextResponse.json({
      url,
      fileName: downloadFileName,
    });
  } catch (err) {
    console.error("[gallery-download] Error:", err);
    return NextResponse.json({ error: "Lỗi server khi tải file" }, { status: 500 });
  }
}
