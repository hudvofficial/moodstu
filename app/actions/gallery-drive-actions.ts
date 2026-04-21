"use server";

import { requireContractAccess, withAuth } from "@/lib/auth_utils";
import { revalidatePath } from "next/cache";
import {
  parseDriveFolderUrl, fetchDriveFiles, fetchDriveSubfolders,
  detectFolderType, getDriveThumbnailUrl, getDriveImageUrl, extractFileGroup,
} from "@/lib/google-drive";
import { generateAccessUrl } from "@/types/gallery";

// ═══════════════════════════════════════════
// Gallery Drive Actions — Multi-folder, tracking, delivery
// Split từ gallery-actions.ts (lesson #7: max 250 lines/file)
// ═══════════════════════════════════════════

// ─── createMultiFolderGalleries ────────────
// Dán 1 parent folder URL → auto-detect subfolders → tạo tối đa 3 galleries
export async function createMultiFolderGalleries(
  contractId: string,
  parentDriveUrl: string,
) {
  return withAuth(async (supabase, userId) => {
    await requireContractAccess(supabase, userId);

    const parentFolderId = parseDriveFolderUrl(parentDriveUrl);
    if (!parentFolderId) {
      throw new Error("Link không hợp lệ. Hãy dán link folder Google Drive.");
    }

    // Helper: tạo 1 gallery + images (internal, không wrap withAuth)
    async function createGalleryInternal(
      folderId: string,
      folderUrl: string,
      title: string,
      folderType: string,
    ) {
      const driveFiles = await fetchDriveFiles(folderId);
      if (driveFiles.length === 0) return null;

      const accessUrl = generateAccessUrl();
      const { data: gallery, error } = await supabase
        .from("galleries")
        .insert({
          contract_id: contractId,
          title,
          access_url: accessUrl,
          drive_folder_id: folderId,
          drive_folder_url: folderUrl,
          folder_type: folderType,
          status: "draft",
        })
        .select("id")
        .single();

      if (error) throw new Error(`Lỗi tạo gallery: ${error.message}`);

      const imageRows = driveFiles.map((file, index) => ({
        gallery_id: gallery.id,
        drive_file_id: file.id,
        file_name: file.name,
        file_group: extractFileGroup(file.name),
        image_url: getDriveImageUrl(file.id),
        thumbnail_url: getDriveThumbnailUrl(file.id, 400),
        sort_order: index,
      }));

      await supabase.from("gallery_images").insert(imageRows);

      return { galleryId: gallery.id, folderType, totalImages: driveFiles.length };
    }

    // 1. Tìm subfolders
    const subfolders = await fetchDriveSubfolders(parentFolderId);

    if (subfolders.length === 0) {
      const result = await createGalleryInternal(parentFolderId, parentDriveUrl, "Ảnh gốc", "goc");
      revalidatePath(`/contracts/${contractId}`);
      return {
        created: result ? 1 : 0,
        galleries: result ? [result] : [],
      };
    }

    // 2. Auto-detect folder types từ subfolders
    const created: Array<{ galleryId: string; folderType: string; totalImages: number }> = [];

    for (const subfolder of subfolders) {
      const folderType = detectFolderType(subfolder.name);
      if (!folderType) continue;

      const { data: existing } = await supabase
        .from("galleries")
        .select("id")
        .eq("contract_id", contractId)
        .eq("folder_type", folderType)
        .maybeSingle();

      if (existing) continue;

      const folderUrl = `https://drive.google.com/drive/folders/${subfolder.id}`;
      const title =
        folderType === "goc" ? "Ảnh gốc" :
        folderType === "da_sua" ? "Ảnh đã sửa" :
        "Ảnh chọn in";

      try {
        const result = await createGalleryInternal(subfolder.id, folderUrl, title, folderType);
        if (result) created.push(result);
      } catch {
        console.warn(`[createMultiFolderGalleries] Skip folder "${subfolder.name}"`);
      }
    }

    revalidatePath(`/contracts/${contractId}`);
    return { created: created.length, galleries: created };
  });
}

// ─── updateDriveFolderUrl ──────────────────
// Admin: sửa link Drive cho 1 gallery
export async function updateDriveFolderUrl(
  galleryId: string,
  newDriveUrl: string,
) {
  return withAuth(async (supabase, userId) => {
    await requireContractAccess(supabase, userId);

    const folderId = parseDriveFolderUrl(newDriveUrl);
    if (!folderId) {
      throw new Error("Link không hợp lệ.");
    }

    const { data, error } = await supabase
      .from("galleries")
      .update({
        drive_folder_url: newDriveUrl,
        drive_folder_id: folderId,
        updated_at: new Date().toISOString(),
      })
      .eq("id", galleryId)
      .select("id, contract_id")
      .single();

    if (error) throw new Error(`Lỗi cập nhật: ${error.message}`);

    revalidatePath(`/contracts/${data.contract_id}`);
    return { galleryId: data.id };
  });
}

// ─── getRetouchProgress ────────────────────
// So sánh ảnh đã chọn (folder gốc) vs ảnh đã sửa (folder da_sua)
export async function getRetouchProgress(contractId: string) {
  return withAuth(async (supabase, userId) => {
    await requireContractAccess(supabase, userId);

    const { data: galleries } = await supabase
      .from("galleries")
      .select("id, folder_type")
      .eq("contract_id", contractId);

    if (!galleries || galleries.length === 0) {
      return { selectedCount: 0, editedCount: 0, progress: 0 };
    }

    const gocGallery = galleries.find((g: { folder_type: string | null }) => g.folder_type === "goc");
    let selectedCount = 0;

    if (gocGallery) {
      const { count } = await supabase
        .from("gallery_images")
        .select("id", { count: "exact", head: true })
        .eq("gallery_id", gocGallery.id)
        .eq("is_selected", true);
      selectedCount = count || 0;
    }

    const editedGallery = galleries.find((g: { folder_type: string | null }) => g.folder_type === "da_sua");
    let editedCount = 0;

    if (editedGallery) {
      const { count } = await supabase
        .from("gallery_images")
        .select("id", { count: "exact", head: true })
        .eq("gallery_id", editedGallery.id);
      editedCount = count || 0;
    }

    const progress = selectedCount > 0
      ? Math.round((editedCount / selectedCount) * 100)
      : 0;

    return { selectedCount, editedCount, progress };
  });
}

// ─── getDeliveryDate ───────────────────────
// Lấy ngày trả file từ event "hau_ky" trong contract_events
export async function getDeliveryDate(contractId: string) {
  return withAuth(async (supabase, userId) => {
    await requireContractAccess(supabase, userId);

    const { data, error } = await supabase
      .from("contract_events")
      .select("deadline, event_date")
      .eq("contract_id", contractId)
      .eq("event_type", "hau_ky")
      .order("event_date", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      console.error("[getDeliveryDate] Error:", error);
      return null;
    }

    return data?.deadline || data?.event_date || null;
  });
}
