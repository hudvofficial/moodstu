import {
  type GalleryShareCapability,
  type GalleryShareDetails,
  type GalleryShareLink,
  generateAccessUrl,
} from "@/types/gallery";
import {
  signGalleryAccessProof,
  verifyGalleryAccessProof,
  getGalleryCapability,
  getGalleryAccessVersion,
} from "@/lib/gallery-access";
import { fetchSharedGalleryByAccessUrl } from "./gallery-actions";

export const IMAGE_COLS =
  "id, gallery_id, image_url, thumbnail_url, sort_order, is_selected, is_starred, client_note, drive_file_id, file_name, file_group, selected_at, starred_at, created_at";

export const RAW_EXTENSION_VALUES = ["arw", "cr2", "cr3", "nef", "raf", "dng", "rw2", "orf", "pef"];

export const PUBLIC_IMAGE_PAGE_SIZE = 30;

export const SHARE_LINK_CAPABILITIES: GalleryShareCapability[] = ["select", "view", "download"];

export const DEFAULT_GALLERY_SHARE_SLOW_MS = 700;

export let prepareGalleryShareRpcAvailable: boolean | null = null;

export interface GallerySettingsPayload {
  title?: string | null;
  custom_slug?: string | null;
  client_name?: string | null;
  tags?: string[] | null;
  allow_comments?: boolean | null;
  enable_watermark?: boolean | null;
  show_namecard?: boolean | null;
  allow_download?: boolean | null;
  selection_limit?: number | null;
  password?: string | null;
}

export type PublicGalleryRow = {
  id: string;
  contract_id?: string | null;
  title: string | null;
  status: string | null;
  selection_deadline: string | null;
  access_url: string | null;
  password: string | null;
  password_hash?: string | null;
  access_version?: number | null;
  cover_image_id?: string | null;
  og_title?: string | null;
  og_description?: string | null;
  og_image_url?: string | null;
  share_version?: number | null;
  selection_limit?: number | null;
  allow_comments?: boolean | null;
  allow_download?: boolean | null;
  download_unlocked_at?: string | null;
  download_unlocked_by?: string | null;
  capability?: GalleryShareCapability;
  share_link_id?: string | null;
  share_slug?: string | null;
  share_link_access_version?: number | null;
};

export type GalleryShareLinkRow = GalleryShareLink;

export function getGalleryShareSlowMs() {
  const configured = Number(process.env.GALLERY_SHARE_PROFILE_SLOW_MS);
  return Number.isFinite(configured) && configured > 0
    ? configured
    : DEFAULT_GALLERY_SHARE_SLOW_MS;
}

export function shouldLogGalleryShareTiming(durationMs: number) {
  if (process.env.GALLERY_SHARE_PROFILE === "1") return true;
  if (process.env.GALLERY_SHARE_PROFILE === "0") return false;
  return durationMs >= getGalleryShareSlowMs();
}

export function createGalleryShareProfiler(label: string) {
  const start = performance.now();
  let previous = start;
  const marks: string[] = [];

  return {
    mark(stage: string) {
      const now = performance.now();
      marks.push(`${stage}=${Math.round(now - previous)}ms`);
      previous = now;
    },
    done(detail?: string) {
      const durationMs = Math.round(performance.now() - start);
      if (!shouldLogGalleryShareTiming(durationMs)) return;
      console.warn(
        `[gallery-share-profile] ${label} total=${durationMs}ms ${marks.join(" ")}${detail ? ` ${detail}` : ""}`,
      );
    },
  };
}

export function galleryHasPassword(gallery: PublicGalleryRow) {
  return Boolean(gallery.password_hash || gallery.password);
}

export function isSelectionClosed(deadline: string | null | undefined) {
  if (!deadline) return false;
  return deadline < new Date().toISOString().slice(0, 10);
}

export function getGalleryPublicSlug(gallery: PublicGalleryRow) {
  return gallery.share_slug || gallery.access_url || null;
}

export function buildGalleryAccessToken(
  gallery: PublicGalleryRow,
  capability: GalleryShareCapability = getGalleryCapability(gallery),
) {
  const slug = getGalleryPublicSlug(gallery);

  if (!slug) {
        throw new Error("Gallery chưa có link chia sẻ.");
  }

  return signGalleryAccessProof({
    galleryId: gallery.id,
    accessUrl: slug,
    accessVersion: getGalleryAccessVersion(gallery),
    capability,
  });
}

export function isMissingTableError(error: { code?: string; message?: string } | null) {
  if (!error) return false;
  const message = error.message?.toLowerCase() || "";
  return (
    error.code === "42P01" ||
    error.code === "PGRST205" ||
    message.includes("gallery_share_links") ||
    message.includes("could not find the table")
  );
}

export function normalizeShareLinkRow(row: GalleryShareLinkRow | null | undefined) {
  if (!row) return null;
  if (row.status !== "active") return null;
  if (row.expires_at && row.expires_at <= new Date().toISOString()) return null;
  return row;
}

export function sortGalleryShareLinks(links: GalleryShareLink[]) {
  return [...links].sort(
    (a, b) =>
      SHARE_LINK_CAPABILITIES.indexOf(a.capability) -
      SHARE_LINK_CAPABILITIES.indexOf(b.capability),
  );
}

export function hasAllActiveShareCapabilities(links: GalleryShareLink[]) {
  const activeCapabilities = new Set(
    links
      .filter((link) => normalizeShareLinkRow(link))
      .map((link) => link.capability),
  );
  return SHARE_LINK_CAPABILITIES.every((capability) =>
    activeCapabilities.has(capability),
  );
}

export function isMissingRpcError(error: { code?: string; message?: string } | null) {
  if (!error) return false;
  const message = error.message?.toLowerCase() || "";
  return (
    error.code === "42883" ||
    error.code === "PGRST202" ||
    message.includes("prepare_gallery_share") ||
    message.includes("could not find the function")
  );
}

export function normalizePreparedShareDetails(raw: unknown): GalleryShareDetails | null {
  if (!raw || typeof raw !== "object") return null;
  const row = raw as {
    galleryId?: unknown;
    gallery_id?: unknown;
    status?: unknown;
    title?: unknown;
    accessUrl?: unknown;
    access_url?: unknown;
    hasPassword?: unknown;
    has_password?: unknown;
    shareLinks?: unknown;
    share_links?: unknown;
  };

  const galleryId = String(row.galleryId || row.gallery_id || "");
  if (!galleryId) return null;

  const shareLinksRaw = Array.isArray(row.shareLinks)
    ? row.shareLinks
    : Array.isArray(row.share_links)
      ? row.share_links
      : [];

  return {
    galleryId,
    status: typeof row.status === "string" ? row.status : "shared",
    title: typeof row.title === "string" ? row.title : null,
    accessUrl:
      typeof row.accessUrl === "string"
        ? row.accessUrl
        : typeof row.access_url === "string"
          ? row.access_url
          : null,
    hasPassword: Boolean(row.hasPassword || row.has_password),
    shareLinks: sortGalleryShareLinks(shareLinksRaw as GalleryShareLink[]),
  };
}

export async function fetchActiveShareLinkBySlug(
   
  supabase: any,
  slug: string,
) {
  const { data, error } = await supabase
    .from("gallery_share_links")
    .select("*")
    .eq("slug", slug)
    .eq("status", "active")
    .maybeSingle();

  if (error) {
    if (isMissingTableError(error)) return null;
    throw new Error(`Lỗi tải link gallery: ${error.message}`);
  }

  return normalizeShareLinkRow(data as GalleryShareLinkRow | null);
}

export async function fetchSharedGalleryBaseById(
   
  supabase: any,
  galleryId: string,
) {
  const { data, error } = await supabase
    .from("galleries")
    .select("*")
    .eq("id", galleryId)
    .eq("status", "shared")
    .maybeSingle();

  if (error) {
    throw new Error(`Lỗi tải gallery: ${error.message}`);
  }

  return (data || null) as PublicGalleryRow | null;
}

export function attachShareLinkToGallery(
  gallery: PublicGalleryRow,
  link: GalleryShareLinkRow | null,
) {
  if (!link) {
    return {
      ...gallery,
      capability: "select" as GalleryShareCapability,
      share_link_id: null,
      share_slug: null,
      share_link_access_version: null,
    };
  }

  return {
    ...gallery,
    capability: link.capability,
    share_link_id: link.id,
    share_slug: link.slug,
    share_link_access_version: link.access_version,
  };
}

export async function fetchSharedGalleryById(
   
  supabase: any,
  galleryId: string,
  accessUrl?: string,
) {
  if (accessUrl?.trim()) {
    const gallery = await fetchSharedGalleryByAccessUrl(supabase, accessUrl.trim());
    if (!gallery || gallery.id !== galleryId) return null;
    return gallery;
  }

  const gallery = await fetchSharedGalleryBaseById(supabase, galleryId);
  return gallery ? attachShareLinkToGallery(gallery, null) : null;
}

export function assertGalleryProof(
  gallery: PublicGalleryRow,
  accessToken: string,
  requiredCapability?: GalleryShareCapability,
) {
  const slug = getGalleryPublicSlug(gallery);
  if (!slug) return false;

  return verifyGalleryAccessProof(accessToken, {
    galleryId: gallery.id,
    accessUrl: slug,
    accessVersion: getGalleryAccessVersion(gallery),
    capability: requiredCapability || getGalleryCapability(gallery),
  });
}

export async function requirePublicGalleryAccess(
  supabase: any,
  accessUrl: string,
  accessToken: string,
  galleryId: string,
  requiredCapability: GalleryShareCapability = "select",
) {
  if (!accessUrl?.trim()) {
    throw new Error("Thieu link gallery.");
  }
  const gallery = await fetchSharedGalleryByAccessUrl(supabase, accessUrl.trim());
  if (!gallery) {
    throw new Error("Gallery không tồn tại hoặc chưa được chia sẻ.");
  }
  if (!assertGalleryProof(gallery, accessToken, requiredCapability)) {
    throw new Error("Phiên truy cập gallery không hợp lệ hoặc đã hết hạn.");
  }
  if (gallery.id !== galleryId) {
    throw new Error("Gallery không khớp link chia sẻ.");
  }
  return { gallery };
}

export async function requirePublicGalleryImageAccess(

  supabase: any,
  accessUrl: string,
  accessToken: string,
  imageId: string,
  requiredCapability: GalleryShareCapability = "select",
  options: { enforceDeadline?: boolean } = {},
) {
  if (!accessUrl?.trim()) {
    throw new Error("Thieu link gallery.");
  }

  const gallery = await fetchSharedGalleryByAccessUrl(supabase, accessUrl.trim());
  if (!gallery) {
        throw new Error("Gallery không tồn tại hoặc chưa được chia sẻ.");
  }

  if (!assertGalleryProof(gallery, accessToken, requiredCapability)) {
        throw new Error("Phiên truy cập gallery không hợp lệ hoặc đã hết hạn.");
  }

  // Deadline chỉ khóa INPUT HẬU KỲ (chọn/bỏ chọn, ghi/xóa note) — caller ghi truyền
  // enforceDeadline: true. Đọc note + thả tim là xã giao, không bị deadline (audit 20/07:
  // check nằm trần ở đây từng chặn cả getComments/toggleReaction, chết câm sau deadline).
  if (options.enforceDeadline && isSelectionClosed(gallery.selection_deadline)) {
        throw new Error("Album đã hết hạn chọn ảnh.");
  }

  const { data: image, error: imageError } = await supabase
    .from("gallery_images")
    .select("id, gallery_id")
    .eq("id", imageId)
    .maybeSingle();

  if (imageError) {
    throw new Error(`Lỗi kiểm tra ảnh: ${imageError.message}`);
  }

  if (!image || image.gallery_id !== gallery.id) {
        throw new Error("Ảnh không thuộc gallery này.");
  }

  return { gallery, image };
}

export async function updateGalleryImageSelection(
   
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
    throw new Error(`Lỗi cập nhật: ${error.message}`);
  }
}

export function normalizePage(page: number) {
  return Number.isFinite(page) && page > 0 ? Math.floor(page) : 0;
}

export function normalizePageSize(pageSize: number) {
  if (!Number.isFinite(pageSize)) return PUBLIC_IMAGE_PAGE_SIZE;
  return Math.min(Math.max(Math.floor(pageSize), 1), 200);
}

export function applyPublicImageFilter(query: any) {
  return RAW_EXTENSION_VALUES.reduce(
    (currentQuery, extension) =>
      currentQuery.not("file_name", "ilike", `%.${extension}`),
    query,
  );
}

export async function fetchGalleryImageCount(
   
  supabase: any,
  galleryId: string,
  options?: { selectedOnly?: boolean; publicVisibleOnly?: boolean },
) {
  let query = supabase
    .from("gallery_images")
    .select("id", { count: "exact", head: true })
    .eq("gallery_id", galleryId);

  if (options?.selectedOnly) {
    query = query.eq("is_selected", true);
  }

  if (options?.publicVisibleOnly) {
    query = applyPublicImageFilter(query);
  }

  const { count, error } = await query;
  if (error) {
        throw new Error(`Không thể đếm ảnh gallery: ${error.message}`);
  }

  return count ?? 0;
}

export async function fetchGalleryCoverImage(
   
  supabase: any,
  galleryId: string,
  publicVisibleOnly = false,
  coverImageId?: string | null,
) {
  if (coverImageId) {
    const { data: cover, error: coverError } = await supabase
      .from("gallery_images")
      .select("thumbnail_url, image_url")
      .eq("gallery_id", galleryId)
      .eq("id", coverImageId)
      .maybeSingle();

    if (coverError) {
            throw new Error(`Không thể tải cover gallery: ${coverError.message}`);
    }

    if (cover) {
      return cover.thumbnail_url || cover.image_url || null;
    }
  }

  let query = supabase
    .from("gallery_images")
    .select("thumbnail_url, image_url")
    .eq("gallery_id", galleryId);

  if (publicVisibleOnly) {
    query = applyPublicImageFilter(query);
  }

  const { data, error } = await query
    .order("sort_order", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (error) {
        throw new Error(`Không thể tải cover gallery: ${error.message}`);
  }

  return data?.thumbnail_url || data?.image_url || null;
}

export async function fetchGallerySummaryMetrics(
   
  supabase: any,
  galleryId: string,
) {
  const [imageCount, selectedCount, coverImageUrl] = await Promise.all([
    fetchGalleryImageCount(supabase, galleryId),
    fetchGalleryImageCount(supabase, galleryId, { selectedOnly: true }),
    fetchGalleryCoverImage(supabase, galleryId),
  ]);

  return { imageCount, selectedCount, coverImageUrl };
}

export async function fetchPublicGalleryImagesPage(
   
  supabase: any,
  galleryId: string,
  page: number,
  pageSize = PUBLIC_IMAGE_PAGE_SIZE,
) {
  const safePage = normalizePage(page);
  const safePageSize = normalizePageSize(pageSize);
  const from = safePage * safePageSize;
  const to = from + safePageSize - 1;

  let query = supabase
    .from("gallery_images")
    .select(IMAGE_COLS, { count: "exact" })
    .eq("gallery_id", galleryId);

  query = applyPublicImageFilter(query);

  const { data, error, count } = await query
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true })
    .range(from, to);

  if (error) {
        throw new Error(`Không thể tải ảnh gallery: ${error.message}`);
  }

  const images = data || [];
  const totalCount = count ?? 0;

  return {
    images,
    totalCount,
    hasMore: from + images.length < totalCount,
    page: safePage,
  };
}

export async function fetchAllGalleryImages(
   
  supabase: any,
  galleryId: string,
  columns = IMAGE_COLS,
) {
   
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
      .order("created_at", { ascending: true })
      .range(from, from + pageSize - 1);

    if (error) {
          throw new Error(`Không thể tải ảnh gallery: ${error.message}`);
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

export function generateShareLinkSlug(capability: GalleryShareCapability) {
  return `${capability}-${generateAccessUrl()}`;
}

export async function insertShareLinkWithRetry(
   
  supabase: any,
  galleryId: string,
  capability: GalleryShareCapability,
  userId: string,
) {
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const { data, error } = await supabase
      .from("gallery_share_links")
      .insert({
        gallery_id: galleryId,
        slug: generateShareLinkSlug(capability),
        capability,
        status: "active",
        created_by: userId,
      })
      .select("*")
      .single();

    if (!error && data) return data as GalleryShareLink;

    if (error?.code === "23505") {
      const { data: existing, error: existingError } = await supabase
        .from("gallery_share_links")
        .select("*")
        .eq("gallery_id", galleryId)
        .eq("capability", capability)
        .maybeSingle();

      if (!existingError && existing) return existing as GalleryShareLink;
      continue;
    }

    if (error?.code !== "23505") {
            throw new Error(`Không thể tạo link ${capability}: ${error?.message || "Unknown"}`);
    }
  }

    throw new Error(`Không thể tạo link ${capability}: trùng slug quá nhiều lần.`);
}

export async function ensureGalleryShareLink(
   
  supabase: any,
  galleryId: string,
  capability: GalleryShareCapability,
  userId: string,
) {
  const { data: existing, error } = await supabase
    .from("gallery_share_links")
    .select("*")
    .eq("gallery_id", galleryId)
    .eq("capability", capability)
    .maybeSingle();

  if (error) {
        throw new Error(`Không thể tải link ${capability}: ${error.message}`);
  }

  if (existing) {
    if (existing.status === "active") return existing as GalleryShareLink;

    const { data: reactivated, error: updateError } = await supabase
      .from("gallery_share_links")
      .update({
        slug: generateShareLinkSlug(capability),
        status: "active",
        access_version: (existing.access_version || 1) + 1,
        updated_at: new Date().toISOString(),
      })
      .eq("id", existing.id)
      .select("*")
      .single();

    if (updateError || !reactivated) {
            throw new Error(`Không thể kích hoạt link ${capability}: ${updateError?.message || "Unknown"}`);
    }

    return reactivated as GalleryShareLink;
  }

  return insertShareLinkWithRetry(supabase, galleryId, capability, userId);
}

export async function fetchGalleryShareLinks(
   
  supabase: any,
  galleryId: string,
) {
  const { data, error } = await supabase
    .from("gallery_share_links")
    .select("*")
    .eq("gallery_id", galleryId);

  if (error) {
        throw new Error(`Không thể tải link gallery: ${error.message}`);
  }

  return sortGalleryShareLinks((data || []) as GalleryShareLink[]);
}

export async function ensureAllGalleryShareLinks(
   
  supabase: any,
  galleryId: string,
  userId: string,
) {
  const existingLinks = await fetchGalleryShareLinks(supabase, galleryId);
  if (hasAllActiveShareCapabilities(existingLinks)) {
    return sortGalleryShareLinks(
      existingLinks.filter((link) => normalizeShareLinkRow(link)),
    );
  }

  const ensuredLinks = await Promise.all(
    SHARE_LINK_CAPABILITIES.map((capability) =>
      ensureGalleryShareLink(supabase, galleryId, capability, userId),
    ),
  );

  return sortGalleryShareLinks(ensuredLinks);
}

export async function prepareGalleryShareViaRpc(
   
  supabase: any,
  galleryId: string,
  userId: string,
) {
  if (prepareGalleryShareRpcAvailable === false) return null;

  const { data, error } = await supabase.rpc("prepare_gallery_share", {
    p_gallery_id: galleryId,
    p_user_id: userId,
  });

  if (error) {
    if (isMissingRpcError(error)) {
      prepareGalleryShareRpcAvailable = false;
      return null;
    }
        throw new Error(`Không thể chuẩn bị link chia sẻ: ${error.message}`);
  }

  prepareGalleryShareRpcAvailable = true;
  return normalizePreparedShareDetails(data);
}

export async function prepareGalleryShareFallback(
   
  supabase: any,
  galleryId: string,
  userId: string,
  profiler?: ReturnType<typeof createGalleryShareProfiler>,
) {
  const { data: gallery, error: galleryError } = await supabase
    .from("galleries")
    .select("id, status, title, access_url, contract_id, password, password_hash, shared_at")
    .eq("id", galleryId)
    .single();

  profiler?.mark("gallery");

  if (galleryError || !gallery) {
        throw new Error(`Gallery không tồn tại: ${galleryError?.message || "Unknown"}`);
  }

  let preparedGallery = gallery;
  if (gallery.status !== "shared") {
    const { data: updated, error: updateError } = await supabase
      .from("galleries")
      .update({
        status: "shared",
        shared_at: gallery.shared_at || new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", galleryId)
      .select("id, status, title, access_url, contract_id, password, password_hash, shared_at")
      .single();

    profiler?.mark("publish");

    if (updateError || !updated) {
            throw new Error(`Lỗi chia sẻ gallery: ${updateError?.message || "Unknown"}`);
    }

    preparedGallery = updated;
  } else {
    profiler?.mark("publish-skip");
  }

  const shareLinks = await ensureAllGalleryShareLinks(supabase, galleryId, userId);
  profiler?.mark("links");

  return {
    galleryId: preparedGallery.id,
    status: preparedGallery.status,
    title: preparedGallery.title,
    accessUrl: preparedGallery.access_url,
    hasPassword: !!(preparedGallery.password_hash || preparedGallery.password),
    shareLinks,
  } satisfies GalleryShareDetails;
}

export async function prepareGallerySharePayload(
   
  supabase: any,
  galleryId: string,
  userId: string,
  profiler?: ReturnType<typeof createGalleryShareProfiler>,
) {
  const rpcPayload = await prepareGalleryShareViaRpc(supabase, galleryId, userId);
  profiler?.mark(rpcPayload ? "rpc" : "rpc-miss");
  if (rpcPayload) return rpcPayload;

  return prepareGalleryShareFallback(supabase, galleryId, userId, profiler);
}

/**
 * Lấy TOÀN BỘ dòng của một query, vượt trần 1000 dòng/request của PostgREST
 * (supabase-js cắt ở 1000 IM LẶNG kể cả khi .limit() lớn hơn — xem
 * vault/60-bay/bay-du-lieu.md mục 1).
 * - buildQuery PHẢI tạo builder MỚI mỗi lần gọi (builder không tái dùng được
 *   sau .range()).
 * - Query PHẢI có .order() ổn định (thêm .order("id") làm tiebreaker) — không
 *   thì phân trang không xác định, có thể sót/trùng dòng giữa các trang.
 */
export async function selectAllRows<T>(
  buildQuery: (from: number, to: number) => PromiseLike<{ data: T[] | null; error: { message: string } | null }>,
  pageSize = 1000,
): Promise<T[]> {
  const rows: T[] = [];
  for (let from = 0; ; from += pageSize) {
    const { data, error } = await buildQuery(from, from + pageSize - 1);
    if (error) throw new Error(error.message);
    const batch = data ?? [];
    rows.push(...batch);
    if (batch.length < pageSize) break;
  }
  return rows;
}
