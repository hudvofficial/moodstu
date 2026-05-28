"use server";

import { requireContractAccess, withAuth } from "@/lib/auth_utils";
import { createAdminClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import {
  type GalleryFilterJob,
  type GalleryFilterJobType,
  type GallerySelectionBatch,
  isValidUUID,
  MAX_NOTE_LENGTH,
} from "@/types/gallery";

import { requirePublicGalleryImageAccess, updateGalleryImageSelection, fetchGalleryImageCount } from "./gallery-core";

export async function toggleImageSelection(
  imageId: string,
  selected: boolean,
  accessUrl?: string,
  accessToken?: string,
) {
  try {
    if (!imageId || !isValidUUID(imageId)) {
      return { success: false as const, error: "ID anh khong hop le." };
    }

    if (accessUrl || accessToken) {
      const supabase = await createAdminClient();
      const { gallery } = await requirePublicGalleryImageAccess(
        supabase,
        accessUrl || "",
        accessToken || "",
        imageId,
      );
      await updateGalleryImageSelection(supabase, imageId, selected);
      const newSelectedCount = await fetchGalleryImageCount(supabase, gallery.id, { selectedOnly: true });
      
      // Bỏ cache tải xuống để nhận cập nhật mới
      const { revalidateTag } = await import("next/cache");
      // @ts-expect-error - Next.js typing mismatch
      revalidateTag(`gallery-images-${gallery.id}`);
      
      return { success: true as const, data: null, newSelectedCount };
    }

    const result = await withAuth(async (supabase, userId) => {
      await requireContractAccess(supabase, userId);
      const { data: image } = await supabase.from("gallery_images").select("gallery_id").eq("id", imageId).maybeSingle();
      await updateGalleryImageSelection(supabase, imageId, selected);
      let newSelectedCount = 0;
      if (image?.gallery_id) {
        newSelectedCount = await fetchGalleryImageCount(supabase, image.gallery_id, { selectedOnly: true });
        
        // Bỏ cache tải xuống
        const { revalidateTag } = await import("next/cache");
        // @ts-expect-error - Next.js typing mismatch
        revalidateTag(`gallery-images-${image.gallery_id}`);
      }
      return { newSelectedCount };
    });

    if (!result.success) {
      return { success: false as const, error: result.error };
    }

    return { success: true as const, data: null, newSelectedCount: result.data?.newSelectedCount || 0 };
  } catch (err) {
    console.error("[toggleImageSelection] Error:", err);
    return { success: false as const, error: "Loi server." };
  }
}

export async function toggleImageStar(imageId: string, starred: boolean) {
  try {
    const supabase = await createAdminClient();

    const { error } = await supabase
      .from("gallery_images")
      .update({
        is_starred: starred,
        starred_at: starred ? new Date().toISOString() : null,
      })
      .eq("id", imageId);

    if (error) {
      console.error("toggleImageStar update error:", error);
      return { success: false, error: "Khong the cap nhat trang thai anh." };
    }

    revalidatePath("/admin/contracts/[id]", "page");
    return { success: true };
  } catch (error) {
    console.error("toggleImageStar exception:", error);
    return { success: false, error: "Da co loi xay ra." };
  }
}

export async function updateClientNote(
  imageId: string,
  note: string,
  accessUrl?: string,
  accessToken?: string,
) {
  try {
    if (!imageId || !isValidUUID(imageId)) {
      return { success: false as const, error: "ID anh khong hop le." };
    }

    if (accessUrl || accessToken) {
      const supabase = await createAdminClient();
      await requirePublicGalleryImageAccess(
        supabase,
        accessUrl || "",
        accessToken || "",
        imageId,
      );
      await updateGalleryImageNote(supabase, imageId, note);
      return { success: true as const, data: null };
    }

    const result = await withAuth(async (supabase, userId) => {
      await requireContractAccess(supabase, userId);
      await updateGalleryImageNote(supabase, imageId, note);
      return null;
    });

    if (!result.success) {
      return { success: false as const, error: result.error };
    }

    return { success: true as const, data: null };
  } catch (err) {
    console.error("[updateClientNote] Error:", err);
    return { success: false as const, error: "Loi server." };
  }
}

export async function updateGalleryImageNote(
   
  supabase: any,
  imageId: string,
  note: string,
) {
  const sanitizedNote = note ? note.trim().slice(0, MAX_NOTE_LENGTH) : null;
  const { error } = await supabase
    .from("gallery_images")
    .update({ client_note: sanitizedNote })
    .eq("id", imageId);

  if (error) {
    throw new Error(`Loi cap nhat: ${error.message}`);
  }
}

export async function getSelectedImages(galleryId: string) {
  return withAuth(async (supabase, userId) => {
    await requireContractAccess(supabase, userId);

    const { data, error } = await supabase
      .from("gallery_images")
      .select("id, file_name, drive_file_id, client_note, selected_at")
      .eq("gallery_id", galleryId)
      .eq("is_selected", true)
      .order("sort_order", { ascending: true });

    if (error) {
      throw new Error(`Loi lay anh da chon: ${error.message}`);
    }

    return data || [];
  });
}

export async function createSelectionBatchFromCurrentSelection(
  galleryId: string,
  createdByClient?: string,
) {
  return withAuth(async (supabase, userId) => {
    await requireContractAccess(supabase, userId);

    if (!galleryId || !isValidUUID(galleryId)) {
      throw new Error("ID gallery khong hop le.");
    }

    const { data: gallery, error: galleryError } = await supabase
      .from("galleries")
      .select("id, contract_id")
      .eq("id", galleryId)
      .maybeSingle();

    if (galleryError || !gallery) {
      throw new Error(`Gallery khong ton tai: ${galleryError?.message || "Unknown"}`);
    }

    const { data: selectedImages, error: imagesError } = await supabase
      .from("gallery_images")
      .select("id, file_name, drive_file_id, sort_order, client_note")
      .eq("gallery_id", galleryId)
      .eq("is_selected", true)
      .order("sort_order", { ascending: true });

    if (imagesError) {
      throw new Error(`Khong the tai anh da chon: ${imagesError.message}`);
    }

    if (!selectedImages || selectedImages.length === 0) {
      throw new Error("Chua co anh nao duoc chon.");
    }

    const { data: batch, error: batchError } = await supabase
      .from("gallery_selection_batches")
      .insert({
        gallery_id: galleryId,
        contract_id: gallery.contract_id,
        status: "studio_locked",
        selected_count: selectedImages.length,
        created_by_client: createdByClient?.trim() || null,
        locked_by: userId,
        locked_at: new Date().toISOString(),
      })
      .select("*")
      .single();

    if (batchError || !batch) {
      throw new Error(`Khong the tao batch anh da chon: ${batchError?.message || "Unknown"}`);
    }

    const items = selectedImages.map((image) => ({
      batch_id: batch.id,
      image_id: image.id,
      file_name: image.file_name,
      drive_file_id: image.drive_file_id,
      sort_order: image.sort_order,
      client_note: image.client_note,
    }));

    const { error: itemsError } = await supabase
      .from("gallery_selection_batch_items")
      .insert(items);

    if (itemsError) {
      await supabase.from("gallery_selection_batches").delete().eq("id", batch.id);
      throw new Error(`Khong the luu danh sach anh da chon: ${itemsError.message}`);
    }

    return batch as GallerySelectionBatch;
  });
}

export async function createGalleryFilterJob(
  galleryId: string,
  jobType: GalleryFilterJobType,
  batchId?: string | null,
) {
  return withAuth(async (supabase, userId) => {
    await requireContractAccess(supabase, userId);

    if (!galleryId || !isValidUUID(galleryId)) {
      throw new Error("ID gallery khong hop le.");
    }

    if (jobType !== "drive_copy_jpg" && jobType !== "local_manifest") {
      throw new Error("Loai job khong hop le.");
    }

    let totalCount = 0;
    if (batchId) {
      if (!isValidUUID(batchId)) {
        throw new Error("ID batch khong hop le.");
      }

      const { count, error: countError } = await supabase
        .from("gallery_selection_batch_items")
        .select("id", { count: "exact", head: true })
        .eq("batch_id", batchId);

      if (countError) {
        throw new Error(`Khong the dem anh trong batch: ${countError.message}`);
      }

      totalCount = count || 0;
    }

    const { data: job, error } = await supabase
      .from("gallery_filter_jobs")
      .insert({
        gallery_id: galleryId,
        batch_id: batchId || null,
        job_type: jobType,
        status: "queued",
        total_count: totalCount,
        created_by: userId,
      })
      .select("*")
      .single();

    if (error || !job) {
      throw new Error(`Khong the tao job loc anh: ${error?.message || "Unknown"}`);
    }

    return job as GalleryFilterJob;
  });
}

export async function reorderImages(orderedIds: string[]) {
  if (!orderedIds.length) {
    return { success: false as const, error: "Danh sach rong." };
  }

  const result = await withAuth(async (supabase, userId) => {
    await requireContractAccess(supabase, userId);

    const updates = orderedIds.map((id, index) =>
      supabase.from("gallery_images").update({ sort_order: index }).eq("id", id),
    );
    const responses = await Promise.all(updates);
    const failed = responses.find((response) => response.error);

    if (failed?.error) {
      throw new Error(`Khong the sap xep anh: ${failed.error.message}`);
    }

    return null;
  });

  if (!result.success) {
    console.error("[reorderImages] Error:", result.error);
    return { success: false as const, error: result.error };
  }

  return { success: true as const, data: null };
}

