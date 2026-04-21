"use server";

import { requireContractAccess, withAuth } from "@/lib/auth_utils";
import { createAdminClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import {
  parseDriveFolderUrl,
  fetchDriveFiles,
  getDriveThumbnailUrl,
  getDriveImageUrl,
  extractFileGroup,
} from "@/lib/google-drive";
import {
  type Gallery,
  generateAccessUrl,
  isValidUUID,
  MAX_NOTE_LENGTH,
} from "@/types/gallery";

const IMAGE_COLS =
  "id, image_url, thumbnail_url, sort_order, is_selected, client_note, drive_file_id, file_name, file_group, selected_at, created_at";
const RAW_EXTENSIONS = /\.(arw|cr2|cr3|nef|raf|dng|rw2|orf|pef)$/i;

function filterRawFiles(images: Array<{ file_name?: string | null }>) {
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
  const pageSize = 1000;
  let from = 0;
  let hasMore = true;

  while (hasMore) {
    const { data: batch, error } = await supabase
      .from("gallery_images")
      .select(columns)
      .eq("gallery_id", galleryId)
      .order("sort_order", { ascending: true })
      .range(from, from + pageSize - 1);

    if (error) {
      throw new Error(`Khong the tai anh gallery: ${error.message}`);
    }

    if (batch && batch.length > 0) {
      all.push(...batch);
      from += batch.length;
      hasMore = batch.length === pageSize;
    } else {
      hasMore = false;
    }
  }

  return all;
}

export async function createGallery(
  contractId: string,
  title: string,
  driveUrl: string,
) {
  return withAuth(async (supabase, userId) => {
    await requireContractAccess(supabase, userId);

    const folderId = parseDriveFolderUrl(driveUrl);
    if (!folderId) {
      throw new Error("Link khong hop le. Hay dan link folder Google Drive.");
    }

    const driveFiles = await fetchDriveFiles(folderId);
    if (driveFiles.length === 0) {
      throw new Error("Folder nay chua co anh nao.");
    }

    const accessUrl = generateAccessUrl();
    const { data: gallery, error: galleryError } = await supabase
      .from("galleries")
      .insert({
        contract_id: contractId,
        title,
        access_url: accessUrl,
        drive_folder_id: folderId,
        drive_folder_url: driveUrl,
        status: "draft",
        created_by: userId,
      })
      .select("id")
      .single();

    if (galleryError || !gallery) {
      throw new Error(`Loi tao gallery: ${galleryError?.message || "Unknown"}`);
    }

    const imageRows = driveFiles.map((file, index) => ({
      gallery_id: gallery.id,
      drive_file_id: file.id,
      file_name: file.name,
      file_group: extractFileGroup(file.name),
      image_url: getDriveImageUrl(file.id),
      thumbnail_url: getDriveThumbnailUrl(file.id, 400),
      sort_order: index,
    }));

    const { error: imagesError } = await supabase
      .from("gallery_images")
      .insert(imageRows);

    if (imagesError) {
      await supabase.from("galleries").delete().eq("id", gallery.id);
      throw new Error(`Loi luu anh: ${imagesError.message}`);
    }

    revalidatePath(`/contracts/${contractId}`);
    return { galleryId: gallery.id, accessUrl, totalImages: driveFiles.length };
  });
}

export async function getGalleriesByContract(contractId: string) {
  return withAuth(async (supabase, userId) => {
    await requireContractAccess(supabase, userId);

    const { data: galleries, error } = await supabase
      .from("galleries")
      .select("*")
      .eq("contract_id", contractId)
      .order("created_at", { ascending: true });

    if (error) {
      throw new Error(`Loi lay galleries: ${error.message}`);
    }

    if (!galleries || galleries.length === 0) {
      return [] as Gallery[];
    }

    const galleriesWithImages = await Promise.all(
      galleries.map(async (gallery) => ({
        ...gallery,
        gallery_images: await fetchAllGalleryImages(supabase, gallery.id),
      })),
    );

    return galleriesWithImages as Gallery[];
  });
}

export async function getGalleryByContract(contractId: string) {
  return withAuth(async (supabase, userId) => {
    await requireContractAccess(supabase, userId);

    const { data, error } = await supabase
      .from("galleries")
      .select("*")
      .eq("contract_id", contractId)
      .maybeSingle();

    if (error) {
      throw new Error(`Loi lay gallery: ${error.message}`);
    }

    if (!data) return null;

    const images = await fetchAllGalleryImages(supabase, data.id);
    return { ...data, gallery_images: images } as Gallery;
  });
}

export async function syncDriveFolder(galleryId: string) {
  return withAuth(async (supabase, userId) => {
    await requireContractAccess(supabase, userId);

    const { data: gallery, error: galleryError } = await supabase
      .from("galleries")
      .select("id, drive_folder_id, contract_id")
      .eq("id", galleryId)
      .single();

    if (galleryError || !gallery) {
      throw new Error("Gallery khong ton tai.");
    }

    if (!gallery.drive_folder_id) {
      throw new Error("Gallery chua co Drive folder ID.");
    }

    const driveFiles = await fetchDriveFiles(gallery.drive_folder_id);
    const existingImages = await fetchAllGalleryImages(
      supabase,
      galleryId,
      "drive_file_id",
    );
    const existingFileIds = new Set(
      existingImages.map(
        (img: { drive_file_id: string } | Record<string, unknown>) =>
          (img as { drive_file_id: string }).drive_file_id,
      ),
    );

    const newFiles = driveFiles.filter((file) => !existingFileIds.has(file.id));

    if (newFiles.length > 0) {
      const maxOrder = existingImages.length;
      const newRows = newFiles.map((file, index) => ({
        gallery_id: galleryId,
        drive_file_id: file.id,
        file_name: file.name,
        file_group: extractFileGroup(file.name),
        image_url: getDriveImageUrl(file.id),
        thumbnail_url: getDriveThumbnailUrl(file.id, 400),
        sort_order: maxOrder + index,
      }));

      const { error } = await supabase.from("gallery_images").insert(newRows);
      if (error) {
        throw new Error(`Loi them anh moi: ${error.message}`);
      }
    }

    revalidatePath(`/contracts/${gallery.contract_id}`);
    return {
      totalImages: driveFiles.length,
      newImages: newFiles.length,
      existingImages: existingFileIds.size,
    };
  });
}

export async function shareGallery(galleryId: string) {
  return withAuth(async (supabase, userId) => {
    await requireContractAccess(supabase, userId);

    const { data, error } = await supabase
      .from("galleries")
      .update({
        status: "shared",
        shared_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", galleryId)
      .select("id, access_url, contract_id, password")
      .single();

    if (error || !data) {
      throw new Error(`Loi chia se gallery: ${error?.message || "Unknown"}`);
    }

    revalidatePath(`/contracts/${data.contract_id}`);
    return {
      accessUrl: data.access_url,
      galleryId: data.id,
      hasPassword: !!data.password,
    };
  });
}

export async function deleteGallery(galleryId: string) {
  return withAuth(async (supabase, userId) => {
    await requireContractAccess(supabase, userId);

    const { data: gallery, error: galleryError } = await supabase
      .from("galleries")
      .select("contract_id")
      .eq("id", galleryId)
      .single();

    if (galleryError || !gallery) {
      throw new Error(`Loi tim gallery: ${galleryError?.message || "Unknown"}`);
    }

    const { error: imageDeleteError } = await supabase
      .from("gallery_images")
      .delete()
      .eq("gallery_id", galleryId);

    if (imageDeleteError) {
      throw new Error(`Loi xoa anh gallery: ${imageDeleteError.message}`);
    }

    const { error } = await supabase
      .from("galleries")
      .delete()
      .eq("id", galleryId);

    if (error) {
      throw new Error(`Loi xoa gallery: ${error.message}`);
    }

    revalidatePath(`/contracts/${gallery.contract_id}`);
    return null;
  });
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

export async function setGalleryPassword(
  galleryId: string,
  password: string | null,
) {
  return withAuth(async (supabase, userId) => {
    await requireContractAccess(supabase, userId);

    if (!galleryId || !isValidUUID(galleryId)) {
      throw new Error("ID khong hop le.");
    }

    const { error } = await supabase
      .from("galleries")
      .update({ password: password?.trim() || null })
      .eq("id", galleryId);

    if (error) {
      throw new Error(`Loi cap nhat mat khau: ${error.message}`);
    }

    return { password: password?.trim() || null };
  });
}

export async function getPublicGallery(accessUrl: string) {
  try {
    const supabase = await createAdminClient();
    const { data, error } = await supabase
      .from("galleries")
      .select("id, title, status, selection_deadline, password")
      .eq("access_url", accessUrl)
      .eq("status", "shared")
      .maybeSingle();

    if (error) {
      return { success: false as const, error: `Loi tai gallery: ${error.message}` };
    }

    if (!data) {
      return {
        success: false as const,
        error: "Album chua san sang hoac khong ton tai.",
      };
    }

    if (data.password) {
      return {
        success: true as const,
        data: {
          id: data.id,
          title: data.title,
          status: data.status,
          selection_deadline: data.selection_deadline,
          needsPassword: true as const,
        },
      };
    }

    const images = filterRawFiles(await fetchAllGalleryImages(supabase, data.id));
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { password: _password, ...galleryWithoutPassword } = data;

    return {
      success: true as const,
      data: {
        ...galleryWithoutPassword,
        gallery_images: images,
        needsPassword: false as const,
      } as Gallery & { needsPassword: false },
    };
  } catch (err) {
    console.error("[getPublicGallery] Error:", err);
    return { success: false as const, error: "Loi server." };
  }
}

export async function verifyGalleryPassword(
  galleryId: string,
  password: string,
) {
  try {
    if (!galleryId || !isValidUUID(galleryId)) {
      return { success: false as const, error: "ID khong hop le." };
    }

    if (!password) {
      return { success: false as const, error: "Vui long nhap mat khau." };
    }

    const supabase = await createAdminClient();
    const { data, error } = await supabase
      .from("galleries")
      .select("id, title, status, selection_deadline")
      .eq("id", galleryId)
      .eq("status", "shared")
      .maybeSingle();

    if (error || !data) {
      return { success: false as const, error: "Gallery khong ton tai." };
    }

    const { data: passwordData } = await supabase
      .from("galleries")
      .select("password")
      .eq("id", galleryId)
      .maybeSingle();

    if (!passwordData || passwordData.password !== password) {
      return { success: false as const, error: "Mat khau khong dung." };
    }

    const images = filterRawFiles(await fetchAllGalleryImages(supabase, data.id));
    return {
      success: true as const,
      data: { ...data, gallery_images: images } as Gallery,
    };
  } catch (err) {
    console.error("[verifyGalleryPassword] Error:", err);
    return { success: false as const, error: "Loi server." };
  }
}

export async function toggleImageSelection(imageId: string, selected: boolean) {
  try {
    if (!imageId || !isValidUUID(imageId)) {
      return { success: false as const, error: "ID anh khong hop le." };
    }

    const supabase = await createAdminClient();
    const { error } = await supabase
      .from("gallery_images")
      .update({
        is_selected: selected,
        selected_at: selected ? new Date().toISOString() : null,
      })
      .eq("id", imageId);

    if (error) {
      return { success: false as const, error: `Loi cap nhat: ${error.message}` };
    }

    return { success: true as const, data: null };
  } catch (err) {
    console.error("[toggleImageSelection] Error:", err);
    return { success: false as const, error: "Loi server." };
  }
}

export async function updateClientNote(imageId: string, note: string) {
  try {
    if (!imageId || !isValidUUID(imageId)) {
      return { success: false as const, error: "ID anh khong hop le." };
    }

    const sanitizedNote = note ? note.trim().slice(0, MAX_NOTE_LENGTH) : null;
    const supabase = await createAdminClient();
    const { error } = await supabase
      .from("gallery_images")
      .update({ client_note: sanitizedNote })
      .eq("id", imageId);

    if (error) {
      return { success: false as const, error: `Loi cap nhat: ${error.message}` };
    }

    return { success: true as const, data: null };
  } catch (err) {
    console.error("[updateClientNote] Error:", err);
    return { success: false as const, error: "Loi server." };
  }
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
