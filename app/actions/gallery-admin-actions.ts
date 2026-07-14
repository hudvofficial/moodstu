"use server";

import { requireContractAccess, withAuth, withAuthRead } from "@/lib/auth_utils";
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
import { backfillGalleryDimensionsInternal } from "@/lib/gallery/image-dimensions";
import { backfillGalleryBlurhashesInternal } from "@/lib/gallery/blurhash";
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
      throw new Error("Link không hợp lệ. Hãy dán link folder Google Drive.");
    }

    const driveFiles = await fetchDriveFiles(folderId);
    if (driveFiles.length === 0) {
      throw new Error("Folder này chưa có ảnh nào.");
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
      throw new Error(`Lỗi tạo gallery: ${galleryError?.message || "Unknown"}`);
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
      throw new Error(`Lỗi lưu ảnh: ${imagesError.message}`);
    }

    // Background: backfill dimensions + blurhash for newly-created gallery images.
    backfillGalleryDimensionsInternal(supabase, gallery.id).catch(err =>
      console.error("Failed to backfill dimensions:", err)
    );
    backfillGalleryBlurhashesInternal(supabase, gallery.id).catch(err =>
      console.error("Failed to backfill blurhash:", err)
    );

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
      throw new Error(`Lỗi tìm gallery: ${galleryError?.message || "Unknown"}`);
    }

    const { error: imageDeleteError } = await supabase
      .from("gallery_images")
      .delete()
      .eq("gallery_id", galleryId);

    if (imageDeleteError) {
      throw new Error(`Lỗi xoá ảnh gallery: ${imageDeleteError.message}`);
    }

    const { error } = await supabase
      .from("galleries")
      .delete()
      .eq("id", galleryId);

    if (error) {
      throw new Error(`Lỗi xoá gallery: ${error.message}`);
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

    const slug = settings.custom_slug
      ? settings.custom_slug.trim().toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9\-_]/g, "")
      : null;

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

    if (Object.keys(updatePayload).length > 0) {
      const { error } = await supabase
        .from("galleries")
        .update(updatePayload)
        .eq("id", galleryId);

      if (error) {
        if (error.code === "23505") {
                    throw new Error("Tên miền album này đã được sử dụng. Vui lòng chọn tên khác.");
        }
                throw new Error(`Lỗi cập nhật cài đặt: ${error.message}`);
      }
    }

    if (settings.password !== undefined) {
      const { error: passwordError } = await supabase.rpc("set_gallery_password", {
        p_gallery_id: galleryId,
        p_password: settings.password?.trim() || null,
      });

      if (passwordError) {
                throw new Error(`Lỗi cập nhật mật khẩu: ${passwordError.message}`);
      }
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
            throw new Error("ID không hợp lệ.");
    }

    const { data, error } = await supabase.rpc("set_gallery_password", {
      p_gallery_id: galleryId,
      p_password: password?.trim() || null,
    });

    if (error) {
            throw new Error(`Lỗi cập nhật mật khẩu: ${error.message}`);
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
            return { success: false as const, error: "ID gallery không hợp lệ." };
    }
    if (imageId && !isValidUUID(imageId)) {
            return { success: false as const, error: "ID ảnh không hợp lệ." };
    }

    if (accessUrl && accessToken) {
      const supabase = await createAdminClient();
      const gallery = await fetchSharedGalleryByAccessUrl(supabase, accessUrl.trim());
      if (!gallery || gallery.id !== galleryId) {
                return { success: false as const, error: "Gallery không tồn tại." };
      }
      
      if (!assertGalleryProof(gallery, accessToken, "select")) {
                return { success: false as const, error: "Phiên truy cập không hợp lệ." };
      }
      
      const { data: updatedGallery, error } = await supabase
        .from("galleries")
        .update({ cover_image_id: imageId })
        .eq("id", galleryId)
        .select("access_url, custom_slug")
        .single();

      if (error) {
                return { success: false as const, error: `Lỗi cập nhật: ${error.message}` };
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
                throw new Error(`Lỗi cập nhật ảnh bìa: ${error.message}`);
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
        return { success: false as const, error: "Lỗi server." };
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
            throw new Error("Gallery không tồn tại.");
    }

    if (!gallery.drive_folder_id) {
            throw new Error("Gallery chưa có Drive folder ID.");
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
                throw new Error(`Lỗi thêm ảnh mới: ${error.message}`);
      }

      // Background: backfill dimensions + blurhash for new images
      if (newRows.length > 0) {
        backfillGalleryDimensionsInternal(supabase, galleryId).catch(err =>
          console.error('Failed to backfill dimensions:', err)
        );
        backfillGalleryBlurhashesInternal(supabase, galleryId).catch(err =>
          console.error('Failed to backfill blurhash:', err)
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
  // Fast read path: withAuthRead skips redundant network getUser().
  return withAuthRead(async (supabase, userId) => {
    await requireContractAccess(supabase, userId);

    // Optimized: single RPC call replaces four queries.
    const startTime = performance.now();
    const { data, error } = await supabase.rpc("get_gallery_summaries_by_contract", {
      p_contract_id: contractId
    });
    const duration = Math.round(performance.now() - startTime);

    console.log(`[Gallery RPC] get_gallery_summaries_by_contract in ${duration}ms (${data?.length || 0} galleries)`);

    if (error) {
            throw new Error(`Lỗi lấy galleries: ${error.message}`);
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
            throw new Error(`Lỗi lấy galleries: ${error.message}`);
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
            throw new Error(`Lỗi lấy gallery: ${error.message}`);
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
            throw new Error("ID gallery không hợp lệ.");
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
            throw new Error(`Gallery không tồn tại: ${error?.message || "Unknown"}`);
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
            throw new Error("ID gallery không hợp lệ.");
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
            throw new Error("ID gallery không hợp lệ.");
    }

    const { data: gallery, error } = await supabase
      .from("galleries")
      .select("id, contract_id")
      .eq("id", galleryId)
      .maybeSingle();

    if (error || !gallery) {
            throw new Error(`Gallery không tồn tại: ${error?.message || "Unknown"}`);
    }

    return ensureAllGalleryShareLinks(supabase, galleryId, userId);
  });
}

