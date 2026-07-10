import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database.types";
import type {
  MoodieGalleryPart,
  MoodieMessagePart,
  MoodieMetricGridPart,
  MoodieTablePart,
} from "@/types/moodie";

type MoodieSupabase = SupabaseClient<Database>;

type ContractCandidate = {
  id: string;
  contract_code: string | null;
  work_date: string | null;
  customers: { full_name: string | null } | Array<{ full_name: string | null }> | null;
};

function customerName(contract: ContractCandidate) {
  const customer = Array.isArray(contract.customers) ? contract.customers[0] : contract.customers;
  return customer?.full_name || null;
}

function normalize(value: string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
}

export function sanitizeMoodieGalleryThumbnail(value: string | null | undefined) {
  if (!value) return null;
  if (value.startsWith("/api/")) return value;
  if (value.startsWith("https://drive.google.com/thumbnail")) return value;
  if (value.startsWith("https://lh3.googleusercontent.com/")) return value;
  return null;
}

export async function resolveMoodieContract(
  supabase: MoodieSupabase,
  input: { contract_id?: string; contract_code?: string; customer_query?: string },
) {
  if (input.contract_id) {
    const { data, error } = await supabase
      .from("contracts")
      .select("id, contract_code, work_date, customers(full_name)")
      .eq("id", input.contract_id)
      .is("deleted_at", null)
      .maybeSingle();
    if (error) throw new Error(`Không thể tải hợp đồng: ${error.message}`);
    return data as ContractCandidate | null;
  }

  let query = supabase
    .from("contracts")
    .select("id, contract_code, work_date, customers(full_name)")
    .is("deleted_at", null)
    .order("contract_date", { ascending: false })
    .limit(30);

  if (input.contract_code) query = query.ilike("contract_code", `%${input.contract_code.trim()}%`);
  const { data, error } = await query;
  if (error) throw new Error(`Không thể tìm hợp đồng: ${error.message}`);
  const candidates = (data || []) as ContractCandidate[];
  if (!input.customer_query) return candidates[0] || null;
  const needle = normalize(input.customer_query);
  return candidates.find((contract) => normalize(customerName(contract) || "").includes(needle)) || null;
}

export async function loadMoodieDeliveryAssets(supabase: MoodieSupabase, contractId: string) {
  const [galleryResult, eventResult] = await Promise.all([
    supabase
      .from("galleries")
      .select("id, title, status, folder_type, selection_deadline, created_at")
      .eq("contract_id", contractId)
      .order("created_at", { ascending: true }),
    supabase
      .from("contract_events")
      .select("deadline, event_date")
      .eq("contract_id", contractId)
      .eq("event_type", "hau_ky")
      .order("event_date", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);
  if (galleryResult.error) throw new Error(`Không thể tải album: ${galleryResult.error.message}`);

  const galleries = galleryResult.data || [];
  const galleryIds = galleries.map((gallery) => gallery.id);
  const counts = new Map<string, { total: number; selected: number }>();
  if (galleryIds.length > 0) {
    const { data, error } = await supabase
      .from("gallery_images")
      .select("gallery_id, is_selected")
      .in("gallery_id", galleryIds);
    if (error) throw new Error(`Không thể đếm ảnh: ${error.message}`);
    for (const image of data || []) {
      const count = counts.get(image.gallery_id) || { total: 0, selected: 0 };
      count.total += 1;
      if (image.is_selected) count.selected += 1;
      counts.set(image.gallery_id, count);
    }
  }

  const original = galleries.find((gallery) => gallery.folder_type === "goc");
  const edited = galleries.find((gallery) => gallery.folder_type === "da_sua");
  const selectedCount = original ? counts.get(original.id)?.selected || 0 : 0;
  const editedCount = edited ? counts.get(edited.id)?.total || 0 : 0;
  const progress = selectedCount > 0 ? Math.min(100, Math.round((editedCount / selectedCount) * 100)) : 0;

  return {
    galleries: galleries.map((gallery) => ({ ...gallery, ...(counts.get(gallery.id) || { total: 0, selected: 0 }) })),
    deliveryDate: eventResult.data?.deadline || eventResult.data?.event_date || null,
    selectedCount,
    editedCount,
    progress,
  };
}

export function buildDeliveryAssetParts(params: {
  contractCode: string;
  assets: Awaited<ReturnType<typeof loadMoodieDeliveryAssets>>;
}): MoodieMessagePart[] {
  const metrics: MoodieMetricGridPart = {
    type: "metric_grid",
    title: `Tiến độ ${params.contractCode}`,
    items: [
      { label: "Album", value: String(params.assets.galleries.length) },
      { label: "Ảnh đã chọn", value: String(params.assets.selectedCount) },
      { label: "Ảnh đã sửa", value: String(params.assets.editedCount) },
      { label: "Tiến độ", value: `${params.assets.progress}%`, tone: params.assets.progress >= 100 ? "positive" : "default" },
    ],
  };
  const table: MoodieTablePart = {
    type: "table",
    title: "Danh sách album",
    columns: [
      { key: "title", label: "Album" },
      { key: "folder_type", label: "Loại" },
      { key: "total", label: "Ảnh", align: "right" },
      { key: "selected", label: "Đã chọn", align: "right" },
      { key: "status", label: "Trạng thái", format: "status" },
    ],
    rows: params.assets.galleries.slice(0, 20).map((gallery) => ({
      title: gallery.title || "Album chưa đặt tên",
      folder_type: gallery.folder_type || "khác",
      total: gallery.total,
      selected: gallery.selected,
      status: gallery.status || "unknown",
    })),
    truncated: params.assets.galleries.length > 20,
  };
  return [metrics, table];
}

export async function loadMoodieGalleryImages(
  supabase: MoodieSupabase,
  params: { contractId: string; galleryId?: string; selectedOnly: boolean; limit: number },
) {
  let galleryQuery = supabase
    .from("galleries")
    .select("id, title, folder_type")
    .eq("contract_id", params.contractId)
    .order("created_at", { ascending: true });
  if (params.galleryId) galleryQuery = galleryQuery.eq("id", params.galleryId);
  const { data: galleries, error: galleryError } = await galleryQuery;
  if (galleryError) throw new Error(`Không thể tải album: ${galleryError.message}`);
  const galleryIds = (galleries || []).map((gallery) => gallery.id);
  if (galleryIds.length === 0) return { galleries: [], images: [], total: 0 };

  let countQuery = supabase
    .from("gallery_images")
    .select("id", { count: "exact", head: true })
    .in("gallery_id", galleryIds);
  let imageQuery = supabase
    .from("gallery_images")
    .select("id, gallery_id, thumbnail_url, file_name, is_selected, is_starred, sort_order")
    .in("gallery_id", galleryIds)
    .order("sort_order", { ascending: true })
    .limit(params.limit);
  if (params.selectedOnly) {
    countQuery = countQuery.eq("is_selected", true);
    imageQuery = imageQuery.eq("is_selected", true);
  }
  const [countResult, imageResult] = await Promise.all([countQuery, imageQuery]);
  if (countResult.error) throw new Error(`Không thể đếm ảnh: ${countResult.error.message}`);
  if (imageResult.error) throw new Error(`Không thể tải ảnh: ${imageResult.error.message}`);

  return {
    galleries: galleries || [],
    total: countResult.count || 0,
    images: (imageResult.data || []).flatMap((image) => {
      const thumbnail = sanitizeMoodieGalleryThumbnail(image.thumbnail_url);
      return thumbnail ? [{ ...image, thumbnail_url: thumbnail }] : [];
    }),
  };
}

export function buildGalleryPart(params: {
  contractId: string;
  contractCode: string;
  selectedOnly: boolean;
  result: Awaited<ReturnType<typeof loadMoodieGalleryImages>>;
}): MoodieGalleryPart {
  return {
    type: "gallery",
    title: params.selectedOnly ? `Ảnh đã chọn · ${params.contractCode}` : `Ảnh hợp đồng · ${params.contractCode}`,
    summary: `${params.result.total} ảnh phù hợp; hiển thị tối đa ${params.result.images.length} thumbnail an toàn.`,
    layout: "grid",
    total_count: params.result.total,
    items: params.result.images.slice(0, 12).map((image) => ({
      id: image.id,
      thumbnail_url: image.thumbnail_url,
      alt: image.file_name || "Ảnh trong gallery",
      file_name: image.file_name || undefined,
      selected: image.is_selected ?? undefined,
      starred: image.is_starred ?? undefined,
    })),
    actions: [{
      id: `open-gallery-${params.contractId}`,
      kind: "navigate",
      label: "Mở gallery",
      href: `/contracts/${params.contractId}?tab=gallery`,
      description: "Xem gallery trong chi tiết hợp đồng",
      risk: "none",
      requires_approval: false,
    }],
  };
}
