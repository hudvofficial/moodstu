"use server";

import { requireContractAccess, withAuth } from "@/lib/auth_utils";

// ═══════════════════════════════════════════
// Gallery Album Server Actions
// Phase 3: Album grouping system
// ═══════════════════════════════════════════

export interface GalleryAlbum {
  id: string;
  gallery_id: string;
  title: string;
  description: string | null;
  cover_image_id: string | null;
  sort_order: number;
  created_at: string;
  image_count?: number;
}

/** Create a new album in a gallery */
export async function createAlbum(galleryId: string, title: string, description?: string) {
  return withAuth(async (supabase, userId) => {
    await requireContractAccess(supabase, userId);

    // Get max sort_order
    const { data: maxOrder } = await supabase
      .from("gallery_albums")
      .select("sort_order")
      .eq("gallery_id", galleryId)
      .order("sort_order", { ascending: false })
      .limit(1)
      .maybeSingle();

    const { data, error } = await supabase
      .from("gallery_albums")
      .insert({
        gallery_id: galleryId,
        title: title.trim(),
        description: description?.trim() || null,
        sort_order: (maxOrder?.sort_order || 0) + 1,
      })
      .select()
      .single();

    if (error) throw new Error(error.message);
    return data;
  });
}

/** Update an album */
export async function updateAlbum(
  albumId: string,
  updates: { title?: string; description?: string; cover_image_id?: string | null }
) {
  return withAuth(async (supabase, userId) => {
    await requireContractAccess(supabase, userId);

    const updateData: Record<string, unknown> = {};
    if (updates.title !== undefined) updateData.title = updates.title.trim();
    if (updates.description !== undefined) updateData.description = updates.description?.trim() || null;
    if (updates.cover_image_id !== undefined) updateData.cover_image_id = updates.cover_image_id;

    const { error } = await supabase
      .from("gallery_albums")
      .update(updateData)
      .eq("id", albumId);

    if (error) throw new Error(error.message);
    return { success: true };
  });
}

/** Delete an album (images go back to null album) */
export async function deleteAlbum(albumId: string) {
  return withAuth(async (supabase, userId) => {
    await requireContractAccess(supabase, userId);

    // Images with this album_id will be set to null via ON DELETE SET NULL
    const { error } = await supabase
      .from("gallery_albums")
      .delete()
      .eq("id", albumId);

    if (error) throw new Error(error.message);
    return { success: true };
  });
}

/** Get all albums for a gallery with image counts */
export async function getAlbumsByGallery(galleryId: string): Promise<GalleryAlbum[]> {
  const result = await withAuth(async (supabase, userId) => {
    await requireContractAccess(supabase, userId);

    const { data: albums, error } = await supabase
      .from("gallery_albums")
      .select("*")
      .eq("gallery_id", galleryId)
      .order("sort_order", { ascending: true });

    if (error || !albums) return [] as GalleryAlbum[];

    // Get image counts per album
    const { data: counts } = await supabase
      .from("gallery_images")
      .select("album_id")
      .eq("gallery_id", galleryId)
      .not("album_id", "is", null);

    const countMap: Record<string, number> = {};
    if (counts) {
      for (const row of counts) {
        if (row.album_id) {
          countMap[row.album_id] = (countMap[row.album_id] || 0) + 1;
        }
      }
    }

    return albums.map((a) => ({ ...a, image_count: countMap[a.id] || 0 }));
  });

  if (!result.success) {
    console.error("getAlbumsByGallery error:", result.error);
    return [];
  }

  return result.data || [];
}

/** Assign images to an album */
export async function assignImagesToAlbum(imageIds: string[], albumId: string) {
  return withAuth(async (supabase, userId) => {
    await requireContractAccess(supabase, userId);

    const { error } = await supabase
      .from("gallery_images")
      .update({ album_id: albumId })
      .in("id", imageIds);

    if (error) throw new Error(error.message);
    return { success: true, count: imageIds.length };
  });
}

/** Remove images from their album (set album_id to null) */
export async function removeImagesFromAlbum(imageIds: string[]) {
  return withAuth(async (supabase, userId) => {
    await requireContractAccess(supabase, userId);

    const { error } = await supabase
      .from("gallery_images")
      .update({ album_id: null })
      .in("id", imageIds);

    if (error) throw new Error(error.message);
    return { success: true, count: imageIds.length };
  });
}
