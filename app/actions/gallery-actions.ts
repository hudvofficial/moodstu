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
  type GalleryFilterJob,
  type GalleryFilterJobType,
  type GalleryPublicPreview,
  type GallerySelectionBatch,
  type GallerySummary,
  type GalleryShareCapability,
  type GalleryShareDetails,
  type GalleryShareLink,
  generateAccessUrl,
  isValidUUID,
  MAX_NOTE_LENGTH,
} from "@/types/gallery";
import {
  signGalleryAccessProof,
  verifyGalleryAccessProof,
  getGalleryCapability,
  getGalleryAccessVersion,
} from "@/lib/gallery-access";

const IMAGE_COLS =
  "id, gallery_id, image_url, thumbnail_url, sort_order, is_selected, is_starred, client_note, drive_file_id, file_name, file_group, selected_at, starred_at, created_at";
const RAW_EXTENSION_VALUES = ["arw", "cr2", "cr3", "nef", "raf", "dng", "rw2", "orf", "pef"];
const PUBLIC_IMAGE_PAGE_SIZE = 100;
const SHARE_LINK_CAPABILITIES: GalleryShareCapability[] = ["select", "view", "download"];
const DEFAULT_GALLERY_SHARE_SLOW_MS = 700;
let prepareGalleryShareRpcAvailable: boolean | null = null;

function getGalleryShareSlowMs() {
  const configured = Number(process.env.GALLERY_SHARE_PROFILE_SLOW_MS);
  return Number.isFinite(configured) && configured > 0
    ? configured
    : DEFAULT_GALLERY_SHARE_SLOW_MS;
}

function shouldLogGalleryShareTiming(durationMs: number) {
  if (process.env.GALLERY_SHARE_PROFILE === "1") return true;
  if (process.env.GALLERY_SHARE_PROFILE === "0") return false;
  return durationMs >= getGalleryShareSlowMs();
}

function createGalleryShareProfiler(label: string) {
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

type PublicGalleryRow = {
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

type GalleryShareLinkRow = GalleryShareLink;

function galleryHasPassword(gallery: PublicGalleryRow) {
  return Boolean(gallery.password_hash || gallery.password);
}

function isSelectionClosed(deadline: string | null | undefined) {
  if (!deadline) return false;
  return deadline < new Date().toISOString().slice(0, 10);
}

function getGalleryPublicSlug(gallery: PublicGalleryRow) {
  return gallery.share_slug || gallery.access_url || null;
}



function buildGalleryAccessToken(
  gallery: PublicGalleryRow,
  capability: GalleryShareCapability = getGalleryCapability(gallery),
) {
  const slug = getGalleryPublicSlug(gallery);

  if (!slug) {
    throw new Error("Gallery chua co link chia se.");
  }

  return signGalleryAccessProof({
    galleryId: gallery.id,
    accessUrl: slug,
    accessVersion: getGalleryAccessVersion(gallery),
    capability,
  });
}

function isMissingTableError(error: { code?: string; message?: string } | null) {
  if (!error) return false;
  const message = error.message?.toLowerCase() || "";
  return (
    error.code === "42P01" ||
    error.code === "PGRST205" ||
    message.includes("gallery_share_links") ||
    message.includes("could not find the table")
  );
}

function normalizeShareLinkRow(row: GalleryShareLinkRow | null | undefined) {
  if (!row) return null;
  if (row.status !== "active") return null;
  if (row.expires_at && row.expires_at <= new Date().toISOString()) return null;
  return row;
}

function sortGalleryShareLinks(links: GalleryShareLink[]) {
  return [...links].sort(
    (a, b) =>
      SHARE_LINK_CAPABILITIES.indexOf(a.capability) -
      SHARE_LINK_CAPABILITIES.indexOf(b.capability),
  );
}

function hasAllActiveShareCapabilities(links: GalleryShareLink[]) {
  const activeCapabilities = new Set(
    links
      .filter((link) => normalizeShareLinkRow(link))
      .map((link) => link.capability),
  );
  return SHARE_LINK_CAPABILITIES.every((capability) =>
    activeCapabilities.has(capability),
  );
}

function isMissingRpcError(error: { code?: string; message?: string } | null) {
  if (!error) return false;
  const message = error.message?.toLowerCase() || "";
  return (
    error.code === "42883" ||
    error.code === "PGRST202" ||
    message.includes("prepare_gallery_share") ||
    message.includes("could not find the function")
  );
}

function normalizePreparedShareDetails(raw: unknown): GalleryShareDetails | null {
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

async function fetchActiveShareLinkBySlug(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
    throw new Error(`Loi tai link gallery: ${error.message}`);
  }

  return normalizeShareLinkRow(data as GalleryShareLinkRow | null);
}

async function fetchSharedGalleryBaseById(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
    throw new Error(`Loi tai gallery: ${error.message}`);
  }

  return (data || null) as PublicGalleryRow | null;
}

function attachShareLinkToGallery(
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

export async function fetchSharedGalleryByAccessUrl(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
    throw new Error(`Loi tai gallery: ${error.message}`);
  }

  return data ? attachShareLinkToGallery(data as PublicGalleryRow, null) : null;
}

async function fetchSharedGalleryById(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
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

function assertGalleryProof(
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

  if (!assertGalleryProof(gallery, accessToken, "select")) {
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

export async function updateGalleryImageNote(
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

function normalizePage(page: number) {
  return Number.isFinite(page) && page > 0 ? Math.floor(page) : 0;
}

function normalizePageSize(pageSize: number) {
  if (!Number.isFinite(pageSize)) return PUBLIC_IMAGE_PAGE_SIZE;
  return Math.min(Math.max(Math.floor(pageSize), 1), 200);
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function applyPublicImageFilter(query: any) {
  return RAW_EXTENSION_VALUES.reduce(
    (currentQuery, extension) =>
      currentQuery.not("file_name", "ilike", `%.${extension}`),
    query,
  );
}

async function fetchGalleryImageCount(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
    throw new Error(`Khong the dem anh gallery: ${error.message}`);
  }

  return count ?? 0;
}

async function fetchGalleryCoverImage(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
      throw new Error(`Khong the tai cover gallery: ${coverError.message}`);
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
    throw new Error(`Khong the tai cover gallery: ${error.message}`);
  }

  return data?.thumbnail_url || data?.image_url || null;
}

async function fetchGallerySummaryMetrics(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
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

async function fetchPublicGalleryImagesPage(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
    .range(from, to);

  if (error) {
    throw new Error(`Khong the tai anh gallery: ${error.message}`);
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

function generateShareLinkSlug(capability: GalleryShareCapability) {
  return `${capability}-${generateAccessUrl()}`;
}

async function insertShareLinkWithRetry(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
      throw new Error(`Khong the tao link ${capability}: ${error?.message || "Unknown"}`);
    }
  }

  throw new Error(`Khong the tao link ${capability}: trung slug qua nhieu lan.`);
}

async function ensureGalleryShareLink(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
    throw new Error(`Khong the tai link ${capability}: ${error.message}`);
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
      throw new Error(`Khong the kich hoat link ${capability}: ${updateError?.message || "Unknown"}`);
    }

    return reactivated as GalleryShareLink;
  }

  return insertShareLinkWithRetry(supabase, galleryId, capability, userId);
}

async function fetchGalleryShareLinks(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any,
  galleryId: string,
) {
  const { data, error } = await supabase
    .from("gallery_share_links")
    .select("*")
    .eq("gallery_id", galleryId);

  if (error) {
    throw new Error(`Khong the tai link gallery: ${error.message}`);
  }

  return sortGalleryShareLinks((data || []) as GalleryShareLink[]);
}

async function ensureAllGalleryShareLinks(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
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

async function prepareGalleryShareViaRpc(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
    throw new Error(`Khong the chuan bi link chia se: ${error.message}`);
  }

  prepareGalleryShareRpcAvailable = true;
  return normalizePreparedShareDetails(data);
}

async function prepareGalleryShareFallback(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
    throw new Error(`Gallery khong ton tai: ${galleryError?.message || "Unknown"}`);
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
      throw new Error(`Loi chia se gallery: ${updateError?.message || "Unknown"}`);
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

async function prepareGallerySharePayload(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
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

export async function getGallerySummariesByContract(contractId: string) {
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
      return [] as GallerySummary[];
    }
    const galleryIds = galleries.map((g) => g.id);

    // Optimize N+1 Query: Lấy tất cả ảnh của contract này trong 1 query (cực nhỏ vì chỉ lấy 3 field)
    const { data: images } = await supabase
      .from("gallery_images")
      .select("id, gallery_id, is_selected")
      .in("gallery_id", galleryIds);

    const summaries = await Promise.all(
      galleries.map(async (gallery) => {
        // Gom và đếm trên memory Server Node.js (cực nhanh và không tốn roundtrip DB)
        const gImages = (images || []).filter((img) => img.gallery_id === gallery.id);
        const imageCount = gImages.length;
        const selectedCount = gImages.filter((img) => img.is_selected).length;

        // Chỉ query lấy ảnh bìa
        const coverImageUrl = await fetchGalleryCoverImage(supabase, gallery.id);

        return {
          ...gallery,
          imageCount,
          selectedCount,
          coverImageUrl,
          hasPassword: Boolean(gallery.password_hash || gallery.password),
        };
      }),
    );

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

export async function getPublicGalleryPreview(accessUrl: string) {
  try {
    const supabase = await createAdminClient();
    const data = await fetchSharedGalleryByAccessUrl(supabase, accessUrl);

    if (!data) {
      return {
        success: false as const,
        error: "Album chua san sang hoac khong ton tai.",
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
    return { success: false as const, error: "Loi server." };
  }
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
          title: data.og_title || data.title,
          status: data.status,
          selection_deadline: data.selection_deadline,
          access_url: getGalleryPublicSlug(data),
          capability: getGalleryCapability(data),
          needsPassword: true as const,
        },
      };
    }

    const page = await fetchPublicGalleryImagesPage(supabase, data.id, 0);

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
        hasMoreImages: page.hasMore,
        currentPage: page.page,
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
  accessUrl?: string,
) {
  try {
    if (!galleryId || !isValidUUID(galleryId)) {
      return { success: false as const, error: "ID khong hop le." };
    }

    if (!password) {
      return { success: false as const, error: "Vui long nhap mat khau." };
    }

    const supabase = await createAdminClient();
    const data = await fetchSharedGalleryById(supabase, galleryId, accessUrl);

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

    const page = await fetchPublicGalleryImagesPage(supabase, data.id, 0);
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
        hasMoreImages: page.hasMore,
        currentPage: page.page,
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
  accessUrl?: string,
) {
  try {
    if (!galleryId || !isValidUUID(galleryId)) {
      return { success: false as const, error: "ID khong hop le." };
    }

    const supabase = await createAdminClient();
    const gallery = await fetchSharedGalleryById(supabase, galleryId, accessUrl);

    if (!gallery) {
      return { success: false as const, error: "Gallery khong ton tai." };
    }

    if (!assertGalleryProof(gallery, accessToken)) {
      return {
        success: false as const,
        error: "Phien truy cap gallery da het han.",
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
    return { success: false as const, error: "Loi server." };
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
      return { success: false as const, error: "ID khong hop le." };
    }

    const supabase = await createAdminClient();
    const gallery = await fetchSharedGalleryById(supabase, galleryId, accessUrl);

    if (!gallery) {
      return { success: false as const, error: "Gallery khong ton tai." };
    }

    if (!assertGalleryProof(gallery, accessToken)) {
      return {
        success: false as const,
        error: "Phien truy cap gallery da het han.",
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
    return { success: false as const, error: "Loi server." };
  }
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
      throw new Error("Khong tim thay gallery.");
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

export async function getGalleryPreviewMetadata(slug: string) {
  try {
    const supabase = await createAdminClient();
    
    // Thu tu uu tien: Share Link Slug -> Access URL
    let gallery = null;
    const link = await fetchActiveShareLinkBySlug(supabase, slug);
    if (link) {
      gallery = await fetchSharedGalleryBaseById(supabase, link.gallery_id);
    } else {
      const { data } = await supabase
        .from("galleries")
        .select("*")
        .eq("access_url", slug)
        .eq("status", "shared")
        .maybeSingle();
      gallery = data;
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
      
      const { error } = await supabase
        .from("galleries")
        .update({ cover_image_id: imageId })
        .eq("id", galleryId);

      if (error) {
        return { success: false as const, error: `Loi cap nhat: ${error.message}` };
      }
      return { success: true as const, data: null };
    }

    const result = await withAuth(async (supabase, userId) => {
      await requireContractAccess(supabase, userId);
      const { error } = await supabase
        .from("galleries")
        .update({ cover_image_id: imageId })
        .eq("id", galleryId);

      if (error) {
        throw new Error(`Loi cap nhat anh bia: ${error.message}`);
      }
      return null;
    });

    if (!result.success) {
      return { success: false as const, error: result.error };
    }
    return { success: true as const, data: null };
  } catch (err) {
    console.error("[setGalleryCoverImage] Error:", err);
    return { success: false as const, error: "Loi server." };
  }
}

// ─── Gallery Settings (Custom Slug & Toggles) ──────────────────

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
