"use client";

import { useQuery, useMutation, useQueryClient, type QueryKey } from "@tanstack/react-query";
import {
  getGallerySummariesByContract,
  createGallery,
  deleteGallery,
  syncDriveFolder,
} from "@/app/actions/gallery-admin-actions";
import {
  getRetouchProgress,
  getDeliveryDate,
  updateDriveFolderUrl,
} from "@/app/actions/gallery-drive-actions";
import { toast } from "@/lib/toast-utils";
import type { GallerySummary } from "@/types/gallery";

// ═══════════════════════════════════════════
// Query Keys Factory (Centralized key management)
// ═══════════════════════════════════════════

export const galleryKeys = {
  all: ["galleries"] as const,
  lists: () => [...galleryKeys.all, "list"] as const,
  list: (contractId: string) => [...galleryKeys.lists(), contractId] as const,
  details: () => [...galleryKeys.all, "detail"] as const,
  detail: (galleryId: string) => [...galleryKeys.details(), galleryId] as const,
  progress: (contractId: string) => [...galleryKeys.all, "progress", contractId] as const,
  deliveryDate: (contractId: string) => [...galleryKeys.all, "deliveryDate", contractId] as const,
};

// ═══════════════════════════════════════════
// Query Hooks
// ═══════════════════════════════════════════

/**
 * Fetch galleries for a contract with automatic caching
 *
 * Features:
 * - 5min cache (no refetch on navigation)
 * - Background revalidation on stale data
 * - Optimistic updates from mutations
 */
export function useGalleriesQuery(contractId: string) {
  return useQuery({
    queryKey: galleryKeys.list(contractId),
    queryFn: async () => {
      const result = await getGallerySummariesByContract(contractId);
      if (!result.success) {
        throw new Error(result.error || "Failed to fetch galleries");
      }
      return result.data || [];
    },
    // Override default staleTime for galleries (they change frequently)
    staleTime: 2 * 60 * 1000, // 2 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  });
}

/**
 * Fetch retouch progress for a contract
 */
export function useRetouchProgressQuery(contractId: string) {
  return useQuery({
    queryKey: galleryKeys.progress(contractId),
    queryFn: async () => {
      const result = await getRetouchProgress(contractId);
      if (!result.success) return { selectedCount: 0, editedCount: 0, progress: 0 };
      return result.data || { selectedCount: 0, editedCount: 0, progress: 0 };
    },
    staleTime: 5 * 60 * 1000, // 5 minutes (changes slowly)
  });
}

/**
 * Fetch delivery date for a contract
 */
export function useDeliveryDateQuery(contractId: string) {
  return useQuery({
    queryKey: galleryKeys.deliveryDate(contractId),
    queryFn: async () => {
      const result = await getDeliveryDate(contractId);
      if (!result.success) return null;
      return result.data;
    },
    staleTime: 10 * 60 * 1000, // 10 minutes (rarely changes)
  });
}

// ═══════════════════════════════════════════
// Mutation Hooks with Optimistic Updates
// ═══════════════════════════════════════════

interface CreateGalleryPayload {
  title: string;
  driveUrl: string;
  settings?: {
    custom_slug?: string | null;
    client_name?: string | null;
    tags?: string[] | null;
    allow_comments?: boolean;
    enable_watermark?: boolean;
    show_namecard?: boolean;
    allow_download?: boolean;
    selection_limit?: number | null;
  };
}

/**
 * Create gallery mutation with optimistic update
 *
 * Workflow:
 * 1. Immediately add temp gallery to UI (optimistic)
 * 2. Call server API
 * 3. On success: replace temp with real data
 * 4. On error: rollback to previous state
 */
export function useCreateGalleryMutation(contractId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: CreateGalleryPayload) => {
      const result = await createGallery(
        contractId,
        payload.title,
        payload.driveUrl,
        payload.settings
      );
      if (!result.success) {
        throw new Error(result.error || "Failed to create gallery");
      }
      return result.data;
    },

    // Optimistic update: Add temp gallery immediately
    onMutate: async (newGallery) => {
      const queryKey = galleryKeys.list(contractId);

      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey });

      // Snapshot previous value for rollback
      const previousGalleries = queryClient.getQueryData<GallerySummary[]>(queryKey);

      // Optimistically update UI
      const tempId = `temp-${Date.now()}`;
      const optimisticGallery: GallerySummary = {
        id: tempId,
        contract_id: contractId,
        title: newGallery.title,
        access_url: null,
        folder_type: null,
        drive_folder_url: newGallery.driveUrl,
        status: "draft",
        shared_at: null,
        imageCount: 0,
        selectedCount: 0,
        hasPassword: false,
        custom_slug: newGallery.settings?.custom_slug || null,
        shareLinks: [],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        created_by: "", // Will be filled by server
        cover_image_id: null,
        coverImageUrl: null,
        drive_folder_id: null,
        client_name: newGallery.settings?.client_name || null,
        tags: newGallery.settings?.tags || null,
        allow_comments: newGallery.settings?.allow_comments ?? true,
        enable_watermark: newGallery.settings?.enable_watermark ?? false,
        show_namecard: newGallery.settings?.show_namecard ?? true,
        allow_download: newGallery.settings?.allow_download ?? true,
        selection_limit: newGallery.settings?.selection_limit || null,
        selection_deadline: null, // No deadline on creation
        password_hash: null,
        password: null,
      };

      queryClient.setQueryData<GallerySummary[]>(
        queryKey,
        (old) => [...(old || []), optimisticGallery]
      );

      return { previousGalleries, tempId };
    },

    // On success: replace temp with real data
    onSuccess: (data, _variables, context) => {
      if (!data) return;

      const queryKey = galleryKeys.list(contractId);
      queryClient.setQueryData<GallerySummary[]>(queryKey, (old) =>
        (old || []).map((gallery) =>
          gallery.id === context?.tempId
            ? {
                ...gallery,
                id: data.galleryId!,
                access_url: data.accessUrl!,
                imageCount: data.totalImages || 0,
              }
            : gallery
        )
      );

      toast("Tạo album thành công", "success");
    },

    // On error: rollback to previous state
    onError: (error, _variables, context) => {
      if (context?.previousGalleries) {
        queryClient.setQueryData(
          galleryKeys.list(contractId),
          context.previousGalleries
        );
      }
      toast(error.message || "Lỗi tạo album", "error");
    },

    // Always refetch after mutation settles (ensure consistency)
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: galleryKeys.list(contractId) });
    },
  });
}

/**
 * Delete gallery mutation with optimistic update
 */
export function useDeleteGalleryMutation(contractId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (galleryId: string) => {
      const result = await deleteGallery(galleryId);
      if (!result.success) {
        throw new Error(result.error || "Failed to delete gallery");
      }
      return galleryId;
    },

    onMutate: async (galleryId) => {
      const queryKey = galleryKeys.list(contractId);
      await queryClient.cancelQueries({ queryKey });

      const previousGalleries = queryClient.getQueryData<GallerySummary[]>(queryKey);

      // Optimistically remove gallery
      queryClient.setQueryData<GallerySummary[]>(queryKey, (old) =>
        (old || []).filter((g) => g.id !== galleryId)
      );

      return { previousGalleries, deletedGalleryId: galleryId };
    },

    onSuccess: () => {
      toast("Đã xoá gallery", "success");
    },

    onError: (error, _galleryId, context) => {
      // Rollback: restore ONLY the deleted gallery
      if (context?.previousGalleries) {
        queryClient.setQueryData(
          galleryKeys.list(contractId),
          context.previousGalleries
        );
      }
      toast(error.message || "Lỗi xoá gallery", "error");
    },

    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: galleryKeys.list(contractId) });
    },
  });
}

/**
 * Sync Drive folder mutation with optimistic count update
 */
export function useSyncGalleryMutation(contractId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (galleryId: string) => {
      const result = await syncDriveFolder(galleryId);
      if (!result.success) {
        throw new Error(result.error || "Failed to sync gallery");
      }
      return { galleryId, data: result.data };
    },

    onSuccess: ({ galleryId, data }) => {
      // Update image count for this specific gallery
      const queryKey = galleryKeys.list(contractId);
      queryClient.setQueryData<GallerySummary[]>(queryKey, (old) =>
        (old || []).map((g) =>
          g.id === galleryId
            ? { ...g, imageCount: data?.totalImages || g.imageCount }
            : g
        )
      );

      if (data && data.newImages > 0) {
        toast(`+${data.newImages} ảnh mới`, "success");
      } else {
        toast("Không có ảnh mới", "info");
      }
    },

    onError: (error) => {
      toast(error.message || "Lỗi đồng bộ", "error");
    },

    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: galleryKeys.list(contractId) });
    },
  });
}

/**
 * Update Drive folder URL mutation
 */
export function useUpdateDriveFolderUrlMutation(contractId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ galleryId, url }: { galleryId: string; url: string }) => {
      const result = await updateDriveFolderUrl(galleryId, url);
      if (!result.success) {
        throw new Error(result.error || "Failed to update Drive URL");
      }
      return { galleryId, url };
    },

    onMutate: async ({ galleryId, url }) => {
      const queryKey = galleryKeys.list(contractId);
      await queryClient.cancelQueries({ queryKey });

      const previousGalleries = queryClient.getQueryData<GallerySummary[]>(queryKey);

      // Optimistically update URL
      queryClient.setQueryData<GallerySummary[]>(queryKey, (old) =>
        (old || []).map((g) =>
          g.id === galleryId ? { ...g, drive_folder_url: url } : g
        )
      );

      return { previousGalleries };
    },

    onSuccess: () => {
      toast("Đã cập nhật link Drive", "success");
    },

    onError: (error, _variables, context) => {
      if (context?.previousGalleries) {
        queryClient.setQueryData(
          galleryKeys.list(contractId),
          context.previousGalleries
        );
      }
      toast(error.message || "Lỗi cập nhật link", "error");
    },

    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: galleryKeys.list(contractId) });
    },
  });
}
