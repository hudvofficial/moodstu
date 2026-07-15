"use server";

import { cache } from "react";
import { requireContractAccess, withAuth } from "@/lib/auth_utils";
import { createAdminClient } from "@/lib/supabase/server";
import {
  type Gallery,
  type GalleryPublicPreview,
  type GalleryShareDetails,
  isValidUUID,
} from "@/types/gallery";
import {
  getGalleryCapability,
} from "@/lib/gallery-access";

import { PUBLIC_IMAGE_PAGE_SIZE, PublicGalleryRow, createGalleryShareProfiler, galleryHasPassword, getGalleryPublicSlug, buildGalleryAccessToken, normalizeShareLinkRow, fetchActiveShareLinkBySlug, fetchSharedGalleryBaseById, attachShareLinkToGallery, fetchSharedGalleryById, assertGalleryProof, fetchGalleryImageCount, fetchGalleryCoverImage, fetchPublicGalleryImagesPage, fetchGalleryShareLinks } from "./gallery-core";

// ═══════════════════════════════════════════
// React cache() wrappers for SSR deduplication
// Prevents duplicate DB queries during SSR when same data is fetched by
// both generateMetadata() and page component
// ═══════════════════════════════════════════

const fetchSharedGalleryByAccessUrlCached = cache(fetchSharedGalleryByAccessUrl);

export async function getPublicGallery(accessUrl: string) {
  try {
    const supabase = await createAdminClient();
    const data = await fetchSharedGalleryByAccessUrlCached(supabase, accessUrl);

    if (!data) {
      return {
        success: false as const,
        error: "Album chưa sẵn sàng hoặc không tồn tại.",
      };
    }

    const [page, selectedCount] = await Promise.all([
      fetchPublicGalleryImagesPage(supabase, data.id, 0),
      fetchGalleryImageCount(supabase, data.id, { selectedOnly: true }),
    ]);

    return {
      success: true as const,
      data: {
        id: data.id,
        title: data.og_title || data.title,
        status: data.status,
        selection_deadline: data.selection_deadline,
        access_url: getGalleryPublicSlug(data),
        capability: getGalleryCapability(data),
        // Album có mật khẩu: vẫn cấp VIEW-token miễn phí (xem + thả tim tự do — nghiệp vụ chốt 15/07).
        // SELECT-token (chọn ảnh/ghi chú — input hậu kỳ) chỉ cấp sau khi nhập đúng pass (verifyGalleryPassword).
        accessToken: galleryHasPassword(data) ? buildGalleryAccessToken(data, "view") : buildGalleryAccessToken(data),
        gallery_images: page.images,
        imageCount: page.totalCount,
        selectedCount,
        hasMoreImages: page.hasMore,
        currentPage: page.page,
        needsPassword: galleryHasPassword(data),
      } as Gallery & { needsPassword: boolean },
    };
  } catch (err) {
    console.error("[getPublicGallery] Error:", err);
    return { success: false as const, error: "Lỗi server." };
  }
}

export async function getPublicGalleryPreview(accessUrl: string) {
  try {
    const supabase = await createAdminClient();
    const data = await fetchSharedGalleryByAccessUrlCached(supabase, accessUrl);

    if (!data) {
      return {
        success: false as const,
        error: "Album chưa sẵn sàng hoặc không tồn tại.",
      };
    }

    const [imageCount, coverImageUrl] = await Promise.all([
      fetchGalleryImageCount(supabase, data.id, { publicVisibleOnly: true }),
      data.og_image_url
        ? Promise.resolve(data.og_image_url)
        : fetchGalleryCoverImage(supabase, data.id, true, data.cover_image_id),
    ]);

    return {
      success: true as const,
      data: {
        id: data.id,
        title: data.og_title || data.title,
        status: data.status,
        selection_deadline: data.selection_deadline,
        selection_limit: data.selection_limit ?? null,
        access_url: getGalleryPublicSlug(data),
        imageCount,
        coverImageUrl,
        hasPassword: galleryHasPassword(data),
        capability: getGalleryCapability(data),
        shareSlug: data.share_slug || data.access_url,
        ogTitle: data.og_title,
        ogDescription: data.og_description,
      } satisfies GalleryPublicPreview,
    };
  } catch (err) {
    console.error("[getPublicGalleryPreview] Error:", err);
    return { success: false as const, error: "Lỗi server." };
  }
}

export async function getPublicGalleryImagesPaginated(
  galleryId: string,
  accessToken: string,
  page: number,
  pageSize = PUBLIC_IMAGE_PAGE_SIZE,
  accessUrl?: string,
) {
  try {
    if (!galleryId || !isValidUUID(galleryId)) {
      return { success: false as const, error: "ID không hợp lệ." };
    }

    const supabase = await createAdminClient();
    const gallery = await fetchSharedGalleryById(supabase, galleryId, accessUrl);

    if (!gallery) {
      return { success: false as const, error: "Gallery không tồn tại." };
    }

    if (accessToken && !assertGalleryProof(gallery, accessToken)) {
      return {
        success: false as const,
        error: "Phiên truy cập gallery đã hết hạn.",
      };
    }

    const imagePage = await fetchPublicGalleryImagesPage(
      supabase,
      gallery.id,
      page,
      pageSize,
    );

    return {
      success: true as const,
      data: imagePage,
    };
  } catch (err) {
    console.error("[getPublicGalleryImagesPaginated] Error:", err);
    return { success: false as const, error: "Lỗi server." };
  }
}

export async function getPublicGalleryStats(galleryId: string) {
  try {
    const supabase = await createAdminClient();
    const [selectedCount, imageCount] = await Promise.all([
      fetchGalleryImageCount(supabase, galleryId, { selectedOnly: true }),
      fetchGalleryImageCount(supabase, galleryId)
    ]);
    return { selectedCount, imageCount };
  } catch (err) {
    console.error("[getPublicGalleryStats] Error:", err);
    return { selectedCount: 0, imageCount: 0 };
  }
}

export async function verifyGalleryPassword(
  galleryId: string,
  password: string,
  accessUrl?: string,
) {
  try {
    if (!galleryId || !isValidUUID(galleryId)) {
      return { success: false as const, error: "ID không hợp lệ." };
    }

    if (!password) {
            return { success: false as const, error: "Vui lòng nhập mật khẩu." };
    }

    const supabase = await createAdminClient();
    const data = await fetchSharedGalleryById(supabase, galleryId, accessUrl);

    if (!data) {
      return { success: false as const, error: "Gallery không tồn tại." };
    }

    if (data.password && !data.password_hash) {
      return {
        success: false as const,
        error: "Album cần đặt lại mật khẩu trước khi chia sẻ.",
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
          error: `Lỗi kiểm tra mật khẩu: ${verifyError.message}`,
        };
      }

      if (!verified) {
        return { success: false as const, error: "Mật khẩu không đúng." };
      }
    } else if (galleryHasPassword(data)) {
      return { success: false as const, error: "Mật khẩu không đúng." };
    }

    const [page, selectedCount] = await Promise.all([
      fetchPublicGalleryImagesPage(supabase, data.id, 0),
      fetchGalleryImageCount(supabase, data.id, { selectedOnly: true }),
    ]);
    return {
      success: true as const,
      data: {
        id: data.id,
        title: data.og_title || data.title,
        status: data.status,
        selection_deadline: data.selection_deadline,
        access_url: getGalleryPublicSlug(data),
        capability: getGalleryCapability(data),
        accessToken: buildGalleryAccessToken(data),
        gallery_images: page.images,
        imageCount: page.totalCount,
        selectedCount,
        hasMoreImages: page.hasMore,
        currentPage: page.page,
        needsPassword: false,
      } as Gallery,
    };
  } catch (err) {
    console.error("[verifyGalleryPassword] Error:", err);
    return { success: false as const, error: "Lỗi server." };
  }
}

export async function getGalleryPreviewMetadata(slug: string) {
  try {
    const supabase = await createAdminClient();
    
    // Thu tu uu tien: Share Link Slug -> Access URL
    let gallery = null;
    const link = await fetchActiveShareLinkBySlug(supabase, slug);
    if (link) {
      gallery = await fetchSharedGalleryBaseById(supabase, link.gallery_id);
    } else {
      const { data: customData } = await supabase
        .from("galleries")
        .select("*")
        .eq("custom_slug", slug)
        .eq("status", "shared")
        .maybeSingle();

      if (customData) {
        gallery = customData;
      } else {
        const { data } = await supabase
          .from("galleries")
          .select("*")
          .eq("access_url", slug)
          .eq("status", "shared")
          .maybeSingle();
        gallery = data;
      }
    }

    if (!gallery) return null;

    const coverImageUrl = await fetchGalleryCoverImage(supabase, gallery.id, true, gallery.cover_image_id);

    return {
      title: gallery.og_title || gallery.title || "Album Ảnh",
      description: gallery.og_description || "Xem và chọn ảnh yêu thích của bạn từ Mood Studio.",
      coverImageUrl,
      status: gallery.status,
    };
  } catch (error) {
    console.error("[getGalleryPreviewMetadata] Error:", error);
    return null;
  }
}

export async function fetchSharedGalleryByAccessUrl(
   
  supabase: any,
  accessUrl: string,
) {
  const slug = accessUrl.trim();

  // Priority 0: Lookup by custom_slug (user-defined vanity URL)
  const { data: customSlugGallery, error: customSlugError } = await supabase
    .from("galleries")
    .select("*")
    .eq("custom_slug", slug)
    .eq("status", "shared")
    .maybeSingle();

  if (!customSlugError && customSlugGallery) {
    return attachShareLinkToGallery(customSlugGallery as PublicGalleryRow, null);
  }

  // Priority 1: Lookup by share_link slug (e.g. select-ZchAVTPqoVBm)
  const link = await fetchActiveShareLinkBySlug(supabase, slug);
  if (link) {
    const gallery = await fetchSharedGalleryBaseById(supabase, link.gallery_id);
    return gallery ? attachShareLinkToGallery(gallery, link) : null;
  }

  // Priority 2: Lookup by legacy access_url
  const { data, error } = await supabase
    .from("galleries")
    .select("*")
    .eq("access_url", slug)
    .eq("status", "shared")
    .maybeSingle();

  if (error) {
    throw new Error(`Lỗi tải gallery: ${error.message}`);
  }

  return data ? attachShareLinkToGallery(data as PublicGalleryRow, null) : null;
}

export async function getPublicGalleryWithAccess(
  galleryId: string,
  accessToken: string,
  accessUrl?: string,
) {
  try {
    if (!galleryId || !isValidUUID(galleryId)) {
      return { success: false as const, error: "ID không hợp lệ." };
    }

    const supabase = await createAdminClient();
    const gallery = await fetchSharedGalleryById(supabase, galleryId, accessUrl);

    if (!gallery) {
      return { success: false as const, error: "Gallery không tồn tại." };
    }

    if (!assertGalleryProof(gallery, accessToken)) {
      return {
        success: false as const,
        error: "Phiên truy cập gallery đã hết hạn.",
      };
    }

    const page = await fetchPublicGalleryImagesPage(supabase, gallery.id, 0);
    return {
      success: true as const,
      data: {
        id: gallery.id,
        title: gallery.og_title || gallery.title,
        status: gallery.status,
        selection_deadline: gallery.selection_deadline,
        access_url: getGalleryPublicSlug(gallery),
        capability: getGalleryCapability(gallery),
        accessToken: buildGalleryAccessToken(gallery),
        gallery_images: page.images,
        imageCount: page.totalCount,
        hasMoreImages: page.hasMore,
        currentPage: page.page,
        needsPassword: false,
      } as Gallery,
    };
  } catch (err) {
    console.error("[getPublicGalleryWithAccess] Error:", err);
    return { success: false as const, error: "Lỗi server." };
  }
}

export async function getGalleryShareDetails(galleryId: string) {
  return withAuth(async (supabase, userId) => {
    const profiler = createGalleryShareProfiler("getGalleryShareDetails");
    await requireContractAccess(supabase, userId);
    profiler.mark("auth");

    const { data: gallery, error } = await supabase
      .from("galleries")
      .select("id, status, title, password, password_hash, access_url")
      .eq("id", galleryId)
      .single();

    profiler.mark("gallery");

    if (error || !gallery) {
      throw new Error("Không tìm thấy gallery.");
    }

    const links = (await fetchGalleryShareLinks(supabase, galleryId))
      .filter((link) => normalizeShareLinkRow(link));

    profiler.mark("links");
    profiler.done(`galleryId=${galleryId}`);

    return {
      galleryId: gallery.id,
      status: gallery.status,
      title: gallery.title,
      accessUrl: gallery.access_url,
      hasPassword: !!(gallery.password_hash || gallery.password),
      shareLinks: links,
    } satisfies GalleryShareDetails;
  });
}
