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
import {
  signGalleryAccessProof,
  verifyGalleryAccessProof,
} from "@/lib/gallery-access";

const IMAGE_COLS =
  "id, image_url, thumbnail_url, sort_order, is_selected, client_note, drive_file_id, file_name, file_group, selected_at, created_at";
const RAW_EXTENSIONS = /\.(arw|cr2|cr3|nef|raf|dng|rw2|orf|pef)$/i;

type PublicGalleryRow = {
  id: string;
  title: string | null;
  status: string | null;
  selection_deadline: string | null;
  access_url: string | null;
  password: string | null;
  password_hash?: string | null;
  access_version?: number | null;
};

function galleryHasPassword(gallery: PublicGalleryRow) {
  return Boolean(gallery.password_hash || gallery.password);
}

function isSelectionClosed(deadline: string | null | undefined) {
  if (!deadline) return false;
  return deadline < new Date().toISOString().slice(0, 10);
}

function buildGalleryAccessToken(gallery: PublicGalleryRow) {
  if (!gallery.access_url) {
    throw new Error("Gallery chua co link chia se.");
  }

  return signGalleryAccessProof({
    galleryId: gallery.id,
    accessUrl: gallery.access_url,
    accessVersion: gallery.access_version,
  });
}

async function fetchSharedGalleryByAccessUrl(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any,
  accessUrl: string,
) {
  const { data, error } = await supabase
    .from("galleries")
    .select("id, title, status, selection_deadline, access_url, password, password_hash, access_version")
    .eq("access_url", accessUrl)
    .eq("status", "shared")
    .maybeSingle();

  if (error) {
    throw new Error(`Loi tai gallery: ${error.message}`);
  }

  return (data || null) as PublicGalleryRow | null;
}

async function fetchSharedGalleryById(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any,
  galleryId: string,
) {
  const { data, error } = await supabase
    .from("galleries")
    .select("id, title, status, selection_deadline, access_url, password, password_hash, access_version")
    .eq("id", galleryId)
    .eq("status", "shared")
    .maybeSingle();

  if (error) {
    throw new Error(`Loi tai gallery: ${error.message}`);
  }

  return (data || null) as PublicGalleryRow | null;
}

function assertGalleryProof(gallery: PublicGalleryRow, accessToken: string) {
  if (!gallery.access_url) return false;
  return verifyGalleryAccessProof(accessToken, {
    galleryId: gallery.id,
    accessUrl: gallery.access_url,
    accessVersion: gallery.access_version,
  });
}

async function requirePublicGalleryImageAccess(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any,
  accessUrl: string,
  accessToken: string,
  imageId: string,
) {
  if (!accessUrl?.trim()) {
    throw new Error("Thieu link gallery.");
  }

  const gallery = await fetchSharedGalleryByAccessUrl(supabase, accessUrl.trim());
  if (!gallery) {
    throw new Error("Gallery khong ton tai hoac chua duoc chia se.");
  }

  if (!assertGalleryProof(gallery, accessToken)) {
    throw new Error("Phien truy cap gallery khong hop le hoac da het han.");
  }

  if (isSelectionClosed(gallery.selection_deadline)) {
    throw new Error("Album da het han chon anh.");
  }

  const { data: image, error: imageError } = await supabase
    .from("gallery_images")
    .select("id, gallery_id")
    .eq("id", imageId)
    .maybeSingle();

  if (imageError) {
    throw new Error(`Loi kiem tra anh: ${imageError.message}`);
  }

  if (!image || image.gallery_id !== gallery.id) {
    throw new Error("Anh khong thuoc gallery nay.");
  }

  return { gallery, image };
}

async function updateGalleryImageSelection(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any,
  imageId: string,
  selected: boolean,
) {
  const { error } = await supabase
    .from("gallery_images")
    .update({
      is_selected: selected,
      selected_at: selected ? new Date().toISOString() : null,
    })
    .eq("id", imageId);

  if (error) {
    throw new Error(`Loi cap nhat: ${error.message}`);
  }
}

async function updateGalleryImageNote(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
      .select("id, access_url, contract_id, password, password_hash")
      .single();

    if (error || !data) {
      throw new Error(`Loi chia se gallery: ${error?.message || "Unknown"}`);
    }

    revalidatePath(`/contracts/${data.contract_id}`);
    return {
      accessUrl: data.access_url,
      galleryId: data.id,
      hasPassword: !!(data.password_hash || data.password),
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

    const { data, error } = await supabase.rpc("set_gallery_password", {
      p_gallery_id: galleryId,
      p_password: password?.trim() || null,
    });

    if (error) {
      throw new Error(`Loi cap nhat mat khau: ${error.message}`);
    }

    return {
      hasPassword: Boolean((data as { has_password?: boolean } | null)?.has_password),
    };
  });
}

export async function getPublicGallery(accessUrl: string) {
  try {
    const supabase = await createAdminClient();
    const data = await fetchSharedGalleryByAccessUrl(supabase, accessUrl);

    if (!data) {
      return {
        success: false as const,
        error: "Album chua san sang hoac khong ton tai.",
      };
    }

    if (galleryHasPassword(data)) {
      return {
        success: true as const,
        data: {
          id: data.id,
          title: data.title,
          status: data.status,
          selection_deadline: data.selection_deadline,
          access_url: data.access_url,
          needsPassword: true as const,
        },
      };
    }

    const images = filterRawFiles(await fetchAllGalleryImages(supabase, data.id));

    return {
      success: true as const,
      data: {
        id: data.id,
        title: data.title,
        status: data.status,
        selection_deadline: data.selection_deadline,
        access_url: data.access_url,
        accessToken: buildGalleryAccessToken(data),
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
    const data = await fetchSharedGalleryById(supabase, galleryId);

    if (!data) {
      return { success: false as const, error: "Gallery khong ton tai." };
    }

    if (data.password && !data.password_hash) {
      return {
        success: false as const,
        error: "Album can dat lai mat khau truoc khi chia se.",
      };
    }

    if (data.password_hash) {
      const { data: verified, error: verifyError } = await supabase.rpc(
        "verify_gallery_password",
        { p_gallery_id: galleryId, p_password: password },
      );

      if (verifyError) {
        return {
          success: false as const,
          error: `Loi kiem tra mat khau: ${verifyError.message}`,
        };
      }

      if (!verified) {
        return { success: false as const, error: "Mat khau khong dung." };
      }
    } else if (galleryHasPassword(data)) {
      return { success: false as const, error: "Mat khau khong dung." };
    }

    const images = filterRawFiles(await fetchAllGalleryImages(supabase, data.id));
    return {
      success: true as const,
      data: {
        id: data.id,
        title: data.title,
        status: data.status,
        selection_deadline: data.selection_deadline,
        access_url: data.access_url,
        accessToken: buildGalleryAccessToken(data),
        gallery_images: images,
        needsPassword: false,
      } as Gallery,
    };
  } catch (err) {
    console.error("[verifyGalleryPassword] Error:", err);
    return { success: false as const, error: "Loi server." };
  }
}

export async function getPublicGalleryWithAccess(
  galleryId: string,
  accessToken: string,
) {
  try {
    if (!galleryId || !isValidUUID(galleryId)) {
      return { success: false as const, error: "ID khong hop le." };
    }

    const supabase = await createAdminClient();
    const gallery = await fetchSharedGalleryById(supabase, galleryId);

    if (!gallery) {
      return { success: false as const, error: "Gallery khong ton tai." };
    }

    if (!assertGalleryProof(gallery, accessToken)) {
      return {
        success: false as const,
        error: "Phien truy cap gallery da het han.",
      };
    }

    const images = filterRawFiles(await fetchAllGalleryImages(supabase, gallery.id));
    return {
      success: true as const,
      data: {
        id: gallery.id,
        title: gallery.title,
        status: gallery.status,
        selection_deadline: gallery.selection_deadline,
        access_url: gallery.access_url,
        accessToken: buildGalleryAccessToken(gallery),
        gallery_images: images,
        needsPassword: false,
      } as Gallery,
    };
  } catch (err) {
    console.error("[getPublicGalleryWithAccess] Error:", err);
    return { success: false as const, error: "Loi server." };
  }
}

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
      await requirePublicGalleryImageAccess(
        supabase,
        accessUrl || "",
        accessToken || "",
        imageId,
      );
      await updateGalleryImageSelection(supabase, imageId, selected);
      return { success: true as const, data: null };
    }

    const result = await withAuth(async (supabase, userId) => {
      await requireContractAccess(supabase, userId);
      await updateGalleryImageSelection(supabase, imageId, selected);
      return null;
    });

    if (!result.success) {
      return { success: false as const, error: result.error };
    }

    return { success: true as const, data: null };
  } catch (err) {
    console.error("[toggleImageSelection] Error:", err);
    return { success: false as const, error: "Loi server." };
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
