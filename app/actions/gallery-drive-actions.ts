"use server";

import { requireContractAccess, withAuth } from "@/lib/auth_utils";
import { revalidatePath } from "next/cache";
import {
  parseDriveFolderUrl, fetchDriveFiles, fetchDriveSubfolders,
  detectFolderType, getDriveThumbnailUrl, getDriveImageUrl, extractFileGroup,
} from "@/lib/google-drive";
import { generateAccessUrl } from "@/types/gallery";
import { backfillGalleryDimensions } from "./gallery-dimensions-actions";

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// Gallery Drive Actions â€” Multi-folder, tracking, delivery
// Split tá»« gallery-actions.ts (lesson #7: max 250 lines/file)
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

// â”€â”€â”€ createMultiFolderGalleries â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// DĂ¡n 1 parent folder URL â†’ auto-detect subfolders â†’ táº¡o tá»‘i Ä‘a 3 galleries
export async function createMultiFolderGalleries(
  contractId: string,
  parentDriveUrl: string,
) {
  return withAuth(async (supabase, userId) => {
    await requireContractAccess(supabase, userId);

    const parentFolderId = parseDriveFolderUrl(parentDriveUrl);
    if (!parentFolderId) {
      throw new Error("Link khĂ´ng há»£p lá»‡. HĂ£y dĂ¡n link folder Google Drive.");
    }

    // Helper: táº¡o 1 gallery + images (internal, khĂ´ng wrap withAuth)
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

      if (error) throw new Error(`Lá»—i táº¡o gallery: ${error.message}`);

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

      // Background: backfill dimensions + blurhash (cháº¡y song song, khĂ´ng block return)
      backfillGalleryDimensions(gallery.id).catch(err =>
        console.error('Failed to backfill dimensions:', err)
      );
      import("./blurhash-actions").then(({ backfillGalleryBlurhashes }) =>
        backfillGalleryBlurhashes(gallery.id).catch(err =>
          console.error('Failed to backfill blurhash:', err)
        )
      );

      return { galleryId: gallery.id, folderType, totalImages: driveFiles.length };
    }

    // 1. TĂ¬m subfolders
    const subfolders = await fetchDriveSubfolders(parentFolderId);

    if (subfolders.length === 0) {
      const result = await createGalleryInternal(parentFolderId, parentDriveUrl, "áº¢nh gá»‘c", "goc");
      revalidatePath(`/contracts/${contractId}`);
      return {
        created: result ? 1 : 0,
        galleries: result ? [result] : [],
      };
    }

    // 2. Auto-detect folder types tá»« subfolders
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
        folderType === "goc" ? "áº¢nh gá»‘c" :
        folderType === "da_sua" ? "áº¢nh Ä‘Ă£ sá»­a" :
        "áº¢nh chá»n in";

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

// â”€â”€â”€ updateDriveFolderUrl â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// Admin: sá»­a link Drive cho 1 gallery
export async function updateDriveFolderUrl(
  galleryId: string,
  newDriveUrl: string,
) {
  return withAuth(async (supabase, userId) => {
    await requireContractAccess(supabase, userId);

    const folderId = parseDriveFolderUrl(newDriveUrl);
    if (!folderId) {
      throw new Error("Link khĂ´ng há»£p lá»‡.");
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

    if (error) throw new Error(`Lá»—i cáº­p nháº­t: ${error.message}`);

    revalidatePath(`/contracts/${data.contract_id}`);
    return { galleryId: data.id };
  });
}

// â”€â”€â”€ getRetouchProgress â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// So sĂ¡nh áº£nh Ä‘Ă£ chá»n (folder gá»‘c) vs áº£nh Ä‘Ă£ sá»­a (folder da_sua)
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

// â”€â”€â”€ getDeliveryDate â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// Láº¥y ngĂ y tráº£ file tá»« event "hau_ky" trong contract_events
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

// â”€â”€â”€ initDriveCopyJob â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
export async function initDriveCopyJob(galleryId: string, contractId: string, destFolderName: string) {
  return withAuth(async (supabase, userId) => {
    await requireContractAccess(supabase, userId);

    const { data: contractData } = await supabase
      .from("contracts")
      .select("contract_code")
      .eq("id", contractId)
      .single();

    const contractCode = contractData?.contract_code || "Unknown";

    const { data: studioInfo } = await supabase
      .from("studio_info")
      .select("id, google_oauth")
      .limit(1)
      .maybeSingle();

    if (!studioInfo?.google_oauth) {
      return { error: "needs_drive_scope" };
    }

    const { getValidGoogleToken, hasGoogleScope } = await import("@/lib/google-auth");
    const { findOrCreateDriveFolder } = await import("@/lib/google-drive-oauth");

    const authData = await getValidGoogleToken(supabase, studioInfo);
    if (!hasGoogleScope(authData.granted_scopes, "https://www.googleapis.com/auth/drive")) {
      return { error: "needs_drive_scope" };
    }

    const { data: gallery } = await supabase
      .from("galleries")
      .select("drive_folder_id")
      .eq("id", galleryId)
      .single();

    if (!gallery?.drive_folder_id) {
      return { error: "Gallery chÆ°a cĂ³ link Drive gá»‘c" };
    }

    const { data: heartReactions, error: reactionsError } = await supabase
      .from("gallery_reactions")
      .select("image_id")
      .eq("gallery_id", galleryId)
      .eq("reaction_type", "heart");

    if (reactionsError) throw new Error("Failed to load hearted images");

    const reactionHeartedIds = (heartReactions || []).map((row) => row.image_id).filter(Boolean);

    const { data: images, error: imagesError } = await supabase
      .from("gallery_images")
      .select("id, drive_file_id, file_name, sort_order, created_at, is_selected")
      .eq("gallery_id", galleryId)
      .or(`is_selected.eq.true,id.in.(${reactionHeartedIds.length > 0 ? reactionHeartedIds.join(",") : "00000000-0000-0000-0000-000000000000"})`)
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: true });

    if (imagesError) throw new Error("Failed to load hearted gallery images");
    if (!images || images.length === 0) return { error: "No hearted images found" };
    // Lá»c ra cĂ¡c file JPG/JPEG (case-insensitive)
    const jpgImages = images.filter((img) => {
      if (!img.file_name) return false;
      const lower = img.file_name.toLowerCase();
      return lower.endsWith(".jpg") || lower.endsWith(".jpeg");
    });

    if (jpgImages.length === 0) {
      return { error: "KhĂ´ng tĂ¬m tháº¥y file Ä‘á»‹nh dáº¡ng JPG/JPEG trong cĂ¡c áº£nh Ä‘Ă£ chá»n" };
    }

    const finalFolderName = destFolderName.trim() || `Selected - ${contractCode}`;
    
    // Táº¡o folder BĂN TRONG folder gá»‘c (folder gá»‘c Ä‘Ă£ Ä‘Æ°á»£c share quyá»n Editor)
    // + tá»± Ä‘á»™ng dĂ¹ng láº¡i folder náº¿u Ä‘Ă£ tá»“n táº¡i (trĂ¡nh trĂ¹ng tĂªn)
    let destFolderId: string;
    try {
      destFolderId = await findOrCreateDriveFolder(authData.access_token, finalFolderName, gallery.drive_folder_id);
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : String(error);
      return { error: `Lá»—i táº¡o thÆ° má»¥c: ${msg}` };
    }

    const { data: job } = await supabase
      .from("gallery_filter_jobs")
      .insert({
        gallery_id: galleryId,
        job_type: "copy_selected_jpg",
        status: "processing",
        total_count: jpgImages.length,
        processed_count: 0,
        success_count: 0,
        failed_count: 0,
        target_url: `https://drive.google.com/drive/folders/${destFolderId}`,
      })
      .select("id")
      .single();

    return { 
      success: true, 
      jobId: job?.id,
      destFolderId,
      destUrl: `https://drive.google.com/drive/folders/${destFolderId}`,
      accessToken: authData.access_token,
      filesToCopy: jpgImages.map(img => ({ id: img.id, drive_file_id: img.drive_file_id, name: img.file_name }))
    };
  });
}

// â”€â”€â”€ processDriveCopyChunk â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// Nháº­n accessToken trá»±c tiáº¿p (khĂ´ng query DB má»—i chunk).
// P7: bá» SELECT+UPDATE gallery_filter_jobs má»—i chunk â€” khĂ´ng cĂ³ UI poll progress (verify grep).
//     Cáº¯t ~100ms/chunk Ă— N chunks = tiáº¿t kiá»‡m 1s+ cho 100+ áº£nh. Client gá»i finalizeDriveCopyJob 1 láº§n cuá»‘i.
// P8: truyá»n onTokenExpired callback vĂ o createDriveShortcut. Khi 401 trĂªn Drive API â†’ refresh
//     token qua getValidGoogleToken (Ä‘á»c studio_info) â†’ retry. Báº£o vá»‡ job dĂ i > token TTL 1h.
export async function processDriveCopyChunk(
  jobId: string | undefined,
  destFolderId: string,
  filesChunk: Array<{ id: string, drive_file_id: string | null, name: string | null }>,
  accessToken: string,
) {
  return withAuth(async (supabase) => {
    const { createDriveShortcut } = await import("@/lib/google-drive-oauth");
    const { getValidGoogleToken } = await import("@/lib/google-auth");

    let successCount = 0;
    let failedCount = 0;

    // P8: refresh callback â€” cháº¡y khi createDriveShortcut báº¯t 401 tá»« Drive API.
    // Re-query studio_info + láº¥y token má»›i (cĂ³ thá»ƒ Ä‘Ă£ refresh trong DB do request song song khĂ¡c).
    const onTokenExpired = async (): Promise<string> => {
      const { data: studioInfo } = await supabase
        .from("studio_info")
        .select("id, google_oauth")
        .limit(1)
        .maybeSingle();
      if (!studioInfo?.google_oauth) {
        throw new Error("Studio máº¥t Google OAuth â€” khĂ´ng refresh Ä‘Æ°á»£c token");
      }
      const fresh = await getValidGoogleToken(supabase, studioInfo);
      return fresh.access_token;
    };

    const results = await Promise.allSettled(
      filesChunk.map(async (img) => {
        if (!img.drive_file_id) throw new Error("No drive_file_id");
        return createDriveShortcut(accessToken, img.drive_file_id, img.name || "Shortcut", destFolderId, onTokenExpired);
      })
    );

    let quotaExceededError: string | null = null;

    for (const res of results) {
      if (res.status === "fulfilled") {
        successCount++;
      } else {
        const errorMsg = res.reason instanceof Error ? res.reason.message : String(res.reason);
        console.error("[processDriveCopyChunk] Failed to copy file:", errorMsg);

        if (errorMsg.includes("QUOTA_EXCEEDED")) {
          quotaExceededError = errorMsg;
        }

        failedCount++;
      }
    }

    // Tráº£ vá» lá»—i fatal ngay láº­p tá»©c náº¿u háº¿t dung lÆ°á»£ng Drive
    if (quotaExceededError) {
      return { success: false, error: quotaExceededError };
    }

    // P7: KHĂ”NG update gallery_filter_jobs á»Ÿ Ä‘Ă¢y ná»¯a â€” client gá»i finalizeDriveCopyJob 1 láº§n cuá»‘i.
    // jobId váº«n nháº­n Ä‘á»ƒ giá»¯ signature á»•n Ä‘á»‹nh + log náº¿u cáº§n debug.
    return { success: true, successCount, failedCount };
  });
}

// â”€â”€â”€ finalizeDriveCopyJob â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// P7: client gá»i 1 láº§n SAU khi táº¥t cáº£ workers `processDriveCopyChunk` xong.
// Thay vĂ¬ SELECT+UPDATE má»—i chunk (N round-trip), chá»‰ 1 UPDATE cuá»‘i â†’ tiáº¿t kiá»‡m ~100ms Ă— (N-1) chunk.
// gallery_filter_jobs váº«n Ä‘Æ°á»£c track Ä‘Ăºng status cuá»‘i (completed/failed/partial).
export async function finalizeDriveCopyJob(
  jobId: string,
  successCount: number,
  failedCount: number,
  totalCount: number,
) {
  return withAuth(async (supabase) => {
    const processed = successCount + failedCount;
    const status = processed >= totalCount
      ? (successCount > 0 ? "completed" : "failed")
      : "failed"; // Client káº¿t thĂºc sá»›m (vd QUOTA_EXCEEDED) â†’ mark failed

    await supabase
      .from("gallery_filter_jobs")
      .update({
        processed_count: processed,
        success_count: successCount,
        failed_count: failedCount,
        status,
        updated_at: new Date().toISOString(),
      })
      .eq("id", jobId);

    return { success: true };
  });
}


// â”€â”€â”€ getGalleryFilterJobProgress â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
export async function getGalleryFilterJobProgress(galleryId: string) {
  return withAuth(async (supabase, userId) => {
    await requireContractAccess(supabase, userId);

    const { data, error } = await supabase
      .from("gallery_filter_jobs")
      .select("id, status, total_count, processed_count, success_count, failed_count, target_url, updated_at")
      .eq("gallery_id", galleryId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) throw new Error("Lá»—i láº¥y tiáº¿n Ä‘á»™ copy: " + error.message);
    return data;
  });
}
