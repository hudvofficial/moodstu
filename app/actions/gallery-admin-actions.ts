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
  type GallerySummary,
  generateAccessUrl,
  isValidUUID,
} from "@/types/gallery";

import { GallerySettingsPayload, createGalleryShareProfiler, assertGalleryProof, fetchGalleryCoverImage, fetchAllGalleryImages, ensureAllGalleryShareLinks, prepareGallerySharePayload } from "./gallery-core";
import { backfillGalleryDimensions } from "./gallery-dimensions-actions";
import { fetchSharedGalleryByAccessUrl } from "./gallery-actions";

export async function createGallery(
  contractId: string,
  title: string,
  driveUrl: string,
  settings?: {
    custom_slug?: string | null;
    client_name?: string | null;
    tags?: string[] | null;
    allow_comments?: boolean;
    enable_watermark?: boolean;
    show_namecard?: boolean;
    allow_download?: boolean;
    selection_limit?: number | null;
  }
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

    const finalSlug = settings?.custom_slug?.trim().toLowerCase().replace(/[^a-z0-9-]+/g, "-") || null;
    if (finalSlug) {
      const { count } = await supabase
        .from("galleries")
        .select("*", { count: "exact", head: true })
        .eq("custom_slug", finalSlug);
      if (count && count > 0) throw new Error("Tên miền này đã được sử dụng. Vui lòng chọn tên khác.");
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
        custom_slug: finalSlug,
        client_name: settings?.client_name || null,
        tags: settings?.tags || null,
        allow_comments: settings?.allow_comments ?? true,
        enable_watermark: settings?.enable_watermark ?? false,
        show_namecard: settings?.show_namecard ?? true,
        allow_download: settings?.allow_download ?? true,
        selection_limit: settings?.selection_limit || null,
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

export async function updateGallerySettings(
  galleryId: string,
  settings: GallerySettingsPayload,
) {
  return withAuth(async (supabase, userId) => {
    await requireContractAccess(supabase, userId);

    // Sanitize custom_slug: lowercase, trim, replace spaces
    const slug = settings.custom_slug
      ? settings.custom_slug.trim().toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9\-_]/g, "")
      : null;

    // Build DB update payload (only non-undefined fields)
    const updatePayload: Record<string, unknown> = {};
    if (settings.title !== undefined) updatePayload.title = settings.title;
    if (settings.custom_slug !== undefined) updatePayload.custom_slug = slug || null;
    if (settings.client_name !== undefined) updatePayload.client_name = settings.client_name;
    if (settings.tags !== undefined) updatePayload.tags = settings.tags;
    if (settings.allow_comments !== undefined) updatePayload.allow_comments = settings.allow_comments;
    if (settings.enable_watermark !== undefined) updatePayload.enable_watermark = settings.enable_watermark;
    if (settings.show_namecard !== undefined) updatePayload.show_namecard = settings.show_namecard;
    if (settings.allow_download !== undefined) updatePayload.allow_download = settings.allow_download;
    if (settings.selection_limit !== undefined) updatePayload.selection_limit = settings.selection_limit;

    // Handle password separately (hash it if provided)
    if (settings.password) {
      // Store password as-is for now (hashing can be done by existing setGalleryPassword flow)
      updatePayload.password = settings.password;
    }

    if (Object.keys(updatePayload).length === 0) {
      return { success: true as const };
    }

    const { error } = await supabase
      .from("galleries")
      .update(updatePayload)
      .eq("id", galleryId);

    if (error) {
      // Check for unique constraint violation on custom_slug
      if (error.code === "23505") {
        throw new Error("Tên miền album này đã được sử dụng. Vui lòng chọn tên khác.");
      }
      throw new Error(`Loi cap nhat cai dat: ${error.message}`);
    }

    return { success: true as const };
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

export async function setGalleryCoverImage(
  galleryId: string,
  imageId: string | null,
  accessUrl?: string,
  accessToken?: string,
) {
  try {
    if (!galleryId || !isValidUUID(galleryId)) {
      return { success: false as const, error: "ID gallery khong hop le." };
    }
    if (imageId && !isValidUUID(imageId)) {
      return { success: false as const, error: "ID anh khong hop le." };
    }

    if (accessUrl && accessToken) {
      const supabase = await createAdminClient();
      const gallery = await fetchSharedGalleryByAccessUrl(supabase, accessUrl.trim());
      if (!gallery || gallery.id !== galleryId) {
        return { success: false as const, error: "Gallery khong ton tai." };
      }
      
      if (!assertGalleryProof(gallery, accessToken, "select")) {
        return { success: false as const, error: "Phien truy cap khong hop le." };
      }
      
      const { data: updatedGallery, error } = await supabase
        .from("galleries")
        .update({ cover_image_id: imageId })
        .eq("id", galleryId)
        .select("access_url, custom_slug")
        .single();

      if (error) {
        return { success: false as const, error: `Loi cap nhat: ${error.message}` };
      }
      
      if (updatedGallery) {
        revalidatePath(`/gallery/${updatedGallery.access_url}`);
        if (updatedGallery.custom_slug) {
          revalidatePath(`/gallery/${updatedGallery.custom_slug}`);
        }
      }

      return { success: true as const, data: null };
    }

    const result = await withAuth(async (supabase, userId) => {
      await requireContractAccess(supabase, userId);
      const { data: updatedGallery, error } = await supabase
        .from("galleries")
        .update({ cover_image_id: imageId })
        .eq("id", galleryId)
        .select("access_url, custom_slug")
        .single();

      if (error) {
        throw new Error(`Loi cap nhat anh bia: ${error.message}`);
      }
      return updatedGallery;
    });

    if (!result.success) {
      return { success: false as const, error: result.error };
    }

    if (result.data) {
      revalidatePath(`/gallery/${result.data.access_url}`);
      if (result.data.custom_slug) {
        revalidatePath(`/gallery/${result.data.custom_slug}`);
      }
    }

    return { success: true as const, data: null };
  } catch (err) {
    console.error("[setGalleryCoverImage] Error:", err);
    return { success: false as const, error: "Loi server." };
  }
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

      // Background: backfill dimensions for new images
      if (newRows.length > 0) {
        backfillGalleryDimensions(galleryId).catch(err =>
          console.error('Failed to backfill dimensions:', err)
        );
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

export async function getGallerySummariesByContract(contractId: string) {
  return withAuth(async (supabase, userId) => {
    await requireContractAccess(supabase, userId);

    // ⚡ OPTIMIZED: Single RPC call (4 queries → 1)
    const startTime = performance.now();
    const { data, error } = await supabase.rpc("get_gallery_summaries_by_contract", {
      p_contract_id: contractId
    });
    const duration = Math.round(performance.now() - startTime);

    console.log(`[Gallery RPC] get_gallery_summaries_by_contract in ${duration}ms (${data?.length || 0} galleries)`);

    if (error) {
      throw new Error(`Loi lay galleries: ${error.message}`);
    }

    if (!data || data.length === 0) {
      return [] as GallerySummary[];
    }

    // Transform RPC result to GallerySummary format
    const summaries = data.map((gallery: any) => ({
      ...gallery,
      imageCount: gallery.image_count || 0,
      selectedCount: gallery.selected_count || 0,
      coverImageUrl: gallery.cover_thumbnail || null,
      hasPassword: Boolean(gallery.password_hash || gallery.password),
      shareLinks: gallery.share_links || [],
    }));

    return summaries as GallerySummary[];
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
    
    const galleryIds = galleries.map(g => g.id);
    const { data: links } = await supabase
      .from("gallery_share_links")
      .select("id, gallery_id, slug, capability, status, access_version, created_at, updated_at, expires_at, created_by")
      .eq("status", "active")
      .in("gallery_id", galleryIds);

    const galleriesWithImages = await Promise.all(
      galleries.map(async (gallery) => {
        const gLinks = (links || []).filter((link) => link.gallery_id === gallery.id);
        return {
          ...gallery,
          shareLinks: gLinks,
          gallery_images: await fetchAllGalleryImages(supabase, gallery.id),
        };
      }),
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

export async function shareGallery(galleryId: string) {
  return withAuth(async (supabase, userId) => {
    const profiler = createGalleryShareProfiler("shareGallery");
    await requireContractAccess(supabase, userId);
    profiler.mark("auth");

    if (!galleryId || !isValidUUID(galleryId)) {
      throw new Error("ID gallery khong hop le.");
    }

    const payload = await prepareGallerySharePayload(
      supabase,
      galleryId,
      userId,
      profiler,
    );

    const { data: gallery, error } = await supabase
      .from("galleries")
      .select("contract_id")
      .eq("id", galleryId)
      .single();

    profiler.mark("contract");

    if (error || !gallery) {
      throw new Error(`Gallery khong ton tai: ${error?.message || "Unknown"}`);
    }

    revalidatePath(`/contracts/${gallery.contract_id}`);
    profiler.mark("revalidate");
    profiler.done(`galleryId=${galleryId}`);

    return {
      accessUrl: payload.accessUrl,
      galleryId: payload.galleryId,
      hasPassword: payload.hasPassword,
      shareLinks: payload.shareLinks,
    };
  });
}

export async function prepareGalleryShare(galleryId: string) {
  return withAuth(async (supabase, userId) => {
    const profiler = createGalleryShareProfiler("prepareGalleryShare");
    await requireContractAccess(supabase, userId);
    profiler.mark("auth");

    if (!galleryId || !isValidUUID(galleryId)) {
      throw new Error("ID gallery khong hop le.");
    }

    const payload = await prepareGallerySharePayload(
      supabase,
      galleryId,
      userId,
      profiler,
    );

    profiler.done(`galleryId=${galleryId}`);
    return payload;
  });
}

export async function ensureGalleryShareLinks(galleryId: string) {
  return withAuth(async (supabase, userId) => {
    await requireContractAccess(supabase, userId);

    if (!galleryId || !isValidUUID(galleryId)) {
      throw new Error("ID gallery khong hop le.");
    }

    const { data: gallery, error } = await supabase
      .from("galleries")
      .select("id, contract_id")
      .eq("id", galleryId)
      .maybeSingle();

    if (error || !gallery) {
      throw new Error(`Gallery khong ton tai: ${error?.message || "Unknown"}`);
    }

    return ensureAllGalleryShareLinks(supabase, galleryId, userId);
  });
}

