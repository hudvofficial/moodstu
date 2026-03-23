"use server";

import { withAuth } from "@/lib/auth_utils";
import { createAdminClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import {
  parseDriveFolderUrl, fetchDriveFiles,
  getDriveThumbnailUrl, getDriveImageUrl, extractFileGroup,
} from "@/lib/google-drive";
import {
  Gallery, generateAccessUrl, isValidUUID, MAX_NOTE_LENGTH,
} from "@/types/gallery";

// ═══════════════════════════════════════════
// Gallery Server Actions — Core CRUD + Public
// Paginated server action → gallery-image-helpers.ts
// ═══════════════════════════════════════════

// Helper: paginated fetch bypasses PostgREST max_rows=1000
const IMAGE_COLS = "id, image_url, thumbnail_url, sort_order, is_selected, client_note, drive_file_id, file_name, file_group, selected_at, created_at";

// RAW file extensions — filter khỏi public gallery (admin vẫn thấy full)
const RAW_EXTENSIONS = /\.(arw|cr2|cr3|nef|raf|dng|rw2|orf|pef)$/i;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function filterRawFiles(images: any[]) {
  return images.filter((img) => !RAW_EXTENSIONS.test(img.file_name || ""));
}

async function fetchAllGalleryImages(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any,
  galleryId: string,
  columns = IMAGE_COLS,
) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const all: any[] = [];
  const PAGE = 1000;
  let from = 0;
  let hasMore = true;
  while (hasMore) {
    const { data: batch } = await supabase
      .from("gallery_images")
      .select(columns)
      .eq("gallery_id", galleryId)
      .order("sort_order", { ascending: true })
      .range(from, from + PAGE - 1);
    if (batch && batch.length > 0) {
      all.push(...batch);
      from += batch.length;
      hasMore = batch.length === PAGE;
    } else {
      hasMore = false;
    }
  }
  return all;
}

// ─── ADMIN ACTIONS ─────────────────────────

export async function createGallery(contractId: string, title: string, driveUrl: string) {
  return withAuth(async (supabase, userId) => {
    const folderId = parseDriveFolderUrl(driveUrl);
    if (!folderId) throw new Error("Link không hợp lệ. Hãy dán link folder Google Drive.");

    const driveFiles = await fetchDriveFiles(folderId);
    if (driveFiles.length === 0) throw new Error("Folder này chưa có ảnh nào.");

    const accessUrl = generateAccessUrl();
    const { data: gallery, error: galleryError } = await supabase
      .from("galleries")
      .insert({
        contract_id: contractId, title, access_url: accessUrl,
        drive_folder_id: folderId, drive_folder_url: driveUrl,
        status: "draft", created_by: userId,
      })
      .select("id").single();

    if (galleryError) throw new Error(`Lỗi tạo gallery: ${galleryError.message}`);

    const imageRows = driveFiles.map((file, index) => ({
      gallery_id: gallery.id, drive_file_id: file.id, file_name: file.name,
      file_group: extractFileGroup(file.name),
      image_url: getDriveImageUrl(file.id),
      thumbnail_url: getDriveThumbnailUrl(file.id, 400),
      sort_order: index,
    }));

    const { error: imagesError } = await supabase.from("gallery_images").insert(imageRows);
    if (imagesError) {
      await supabase.from("galleries").delete().eq("id", gallery.id);
      throw new Error(`Lỗi lưu ảnh: ${imagesError.message}`);
    }

    revalidatePath(`/contracts/${contractId}`);
    return { galleryId: gallery.id, accessUrl, totalImages: driveFiles.length };
  });
}

export async function getGalleriesByContract(contractId: string) {
  return withAuth(async (supabase) => {
    // 1) Fetch galleries (without embedded images — avoids PostgREST 1000 row limit)
    const { data: galleries, error } = await supabase
      .from("galleries")
      .select("*")
      .eq("contract_id", contractId)
      .order("created_at", { ascending: true });

    if (error) throw new Error(`Lỗi lấy galleries: ${error.message}`);
    if (!galleries || galleries.length === 0) return [] as Gallery[];

    // 2) Fetch ALL images for each gallery via pagination (bypasses PostgREST max_rows=1000)
    const galleriesWithImages = await Promise.all(
      galleries.map(async (g) => {
        const images = await fetchAllGalleryImages(supabase, g.id);
        return { ...g, gallery_images: images };
      }),
    );

    return galleriesWithImages as Gallery[];
  });
}

export async function getGalleryByContract(contractId: string) {
  return withAuth(async (supabase) => {
    const { data, error } = await supabase
      .from("galleries")
      .select("*")
      .eq("contract_id", contractId).maybeSingle();

    if (error) throw new Error(`Lỗi lấy gallery: ${error.message}`);
    if (!data) return null;

    const images = await fetchAllGalleryImages(supabase, data.id);
    return { ...data, gallery_images: images } as Gallery;
  });
}

export async function syncDriveFolder(galleryId: string) {
  return withAuth(async (supabase) => {
    const { data: gallery, error: galleryError } = await supabase
      .from("galleries").select("id, drive_folder_id, contract_id")
      .eq("id", galleryId).single();

    if (galleryError || !gallery) throw new Error("Gallery không tồn tại.");
    if (!gallery.drive_folder_id) throw new Error("Gallery chưa có Drive folder ID.");

    const driveFiles = await fetchDriveFiles(gallery.drive_folder_id);
    const existingImages = await fetchAllGalleryImages(supabase, galleryId, "drive_file_id");

    const existingFileIds = new Set(
      existingImages.map((img: { drive_file_id: string } | Record<string, unknown>) => (img as { drive_file_id: string }).drive_file_id),
    );
    const newFiles = driveFiles.filter((file) => !existingFileIds.has(file.id));

    if (newFiles.length > 0) {
      const maxOrder = existingImages.length;
      const newRows = newFiles.map((file, index) => ({
        gallery_id: galleryId, drive_file_id: file.id, file_name: file.name,
        file_group: extractFileGroup(file.name),
        image_url: getDriveImageUrl(file.id),
        thumbnail_url: getDriveThumbnailUrl(file.id, 400),
        sort_order: maxOrder + index,
      }));
      const { error } = await supabase.from("gallery_images").insert(newRows);
      if (error) throw new Error(`Lỗi thêm ảnh mới: ${error.message}`);
    }

    revalidatePath(`/contracts/${gallery.contract_id}`);
    return { totalImages: driveFiles.length, newImages: newFiles.length, existingImages: existingFileIds.size };
  });
}

export async function shareGallery(galleryId: string) {
  return withAuth(async (supabase) => {
    const { data, error } = await supabase.from("galleries")
      .update({ status: "shared", shared_at: new Date().toISOString(), updated_at: new Date().toISOString() })
      .eq("id", galleryId).select("id, access_url, contract_id, password").single();
    if (error) throw new Error(`Lỗi chia sẻ gallery: ${error.message}`);
    revalidatePath(`/contracts/${data.contract_id}`);
    return { accessUrl: data.access_url, galleryId: data.id, hasPassword: !!data.password };
  });
}

export async function deleteGallery(galleryId: string) {
  return withAuth(async (supabase) => {
    const { data: gallery } = await supabase.from("galleries").select("contract_id").eq("id", galleryId).single();
    await supabase.from("gallery_images").delete().eq("gallery_id", galleryId);
    const { error } = await supabase.from("galleries").delete().eq("id", galleryId);
    if (error) throw new Error(`Lỗi xóa gallery: ${error.message}`);
    if (gallery?.contract_id) revalidatePath(`/contracts/${gallery.contract_id}`);
    return null;
  });
}

export async function getSelectedImages(galleryId: string) {
  return withAuth(async (supabase) => {
    const { data, error } = await supabase.from("gallery_images")
      .select("id, file_name, drive_file_id, client_note, selected_at")
      .eq("gallery_id", galleryId).eq("is_selected", true)
      .order("sort_order", { ascending: true });
    if (error) throw new Error(`Lỗi lấy ảnh đã chọn: ${error.message}`);
    return data || [];
  });
}

export async function setGalleryPassword(galleryId: string, password: string | null) {
  return withAuth(async (supabase) => {
    if (!galleryId || !isValidUUID(galleryId)) throw new Error("ID không hợp lệ.");
    const { error } = await supabase.from("galleries")
      .update({ password: password?.trim() || null })
      .eq("id", galleryId);
    if (error) throw new Error(`Lỗi cập nhật mật khẩu: ${error.message}`);
    return { password: password?.trim() || null };
  });
}

// ─── PUBLIC ACTIONS (NO AUTH) ──────────────

export async function getPublicGallery(accessUrl: string) {
  try {
    // Admin client to bypass RLS — anonymous users have no employee role
    const supabase = await createAdminClient();
    const { data, error } = await supabase.from("galleries")
      .select("id, title, status, selection_deadline, password")
      .eq("access_url", accessUrl).eq("status", "shared").maybeSingle();

    if (error) return { success: false as const, error: `Lỗi tải gallery: ${error.message}` };
    if (!data) return { success: false as const, error: "Album chưa sẵn sàng hoặc không tồn tại." };

    // Password-protected gallery → return minimal info
    if (data.password) {
      return {
        success: true as const,
        data: { id: data.id, title: data.title, status: data.status, selection_deadline: data.selection_deadline, needsPassword: true as const },
      };
    }

    const images = filterRawFiles(await fetchAllGalleryImages(supabase, data.id));
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { password: _pwd, ...galleryWithoutPwd } = data;
    return { success: true as const, data: { ...galleryWithoutPwd, gallery_images: images, needsPassword: false as const } as Gallery & { needsPassword: false } };
  } catch (err) {
    console.error("[getPublicGallery] Error:", err);
    return { success: false as const, error: "Lỗi server." };
  }
}

export async function verifyGalleryPassword(galleryId: string, password: string) {
  try {
    if (!galleryId || !isValidUUID(galleryId)) return { success: false as const, error: "ID không hợp lệ." };
    if (!password) return { success: false as const, error: "Vui lòng nhập mật khẩu." };

    const supabase = await createAdminClient();
    const { data, error } = await supabase.from("galleries")
      .select("id, title, status, selection_deadline")
      .eq("id", galleryId).eq("status", "shared").maybeSingle();

    if (error || !data) return { success: false as const, error: "Gallery không tồn tại." };

    // Check password via separate query (password is not in public select)
    const { data: pwdData } = await supabase.from("galleries").select("password").eq("id", galleryId).maybeSingle();
    if (!pwdData || pwdData.password !== password) {
      return { success: false as const, error: "Mật khẩu không đúng." };
    }

    const images = filterRawFiles(await fetchAllGalleryImages(supabase, data.id));
    return { success: true as const, data: { ...data, gallery_images: images } as Gallery };
  } catch (err) {
    console.error("[verifyGalleryPassword] Error:", err);
    return { success: false as const, error: "Lỗi server." };
  }
}

export async function toggleImageSelection(imageId: string, selected: boolean) {
  try {
    if (!imageId || !isValidUUID(imageId)) return { success: false as const, error: "ID ảnh không hợp lệ." };
    const supabase = await createAdminClient();
    const { error } = await supabase.from("gallery_images")
      .update({ is_selected: selected, selected_at: selected ? new Date().toISOString() : null })
      .eq("id", imageId);
    if (error) return { success: false as const, error: `Lỗi cập nhật: ${error.message}` };
    return { success: true as const, data: null };
  } catch (err) {
    console.error("[toggleImageSelection] Error:", err);
    return { success: false as const, error: "Lỗi server." };
  }
}

export async function updateClientNote(imageId: string, note: string) {
  try {
    if (!imageId || !isValidUUID(imageId)) return { success: false as const, error: "ID ảnh không hợp lệ." };
    const sanitizedNote = note ? note.trim().slice(0, MAX_NOTE_LENGTH) : null;
    const supabase = await createAdminClient();
    const { error } = await supabase.from("gallery_images").update({ client_note: sanitizedNote }).eq("id", imageId);
    if (error) return { success: false as const, error: `Lỗi cập nhật: ${error.message}` };
    return { success: true as const, data: null };
  } catch (err) {
    console.error("[updateClientNote] Error:", err);
    return { success: false as const, error: "Lỗi server." };
  }
}

/** Reorder images — bulk update sort_order */
export async function reorderImages(orderedIds: string[]) {
  try {
    if (!orderedIds.length) return { success: false as const, error: "Danh sách rỗng." };
    const supabase = await createAdminClient();
    // Batch update sort_order for each image
    const updates = orderedIds.map((id, index) =>
      supabase.from("gallery_images").update({ sort_order: index }).eq("id", id)
    );
    await Promise.all(updates);
    return { success: true as const, data: null };
  } catch (err) {
    console.error("[reorderImages] Error:", err);
    return { success: false as const, error: "Lỗi server." };
  }
}
