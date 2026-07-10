import "server-only";

import { z } from "zod";
import type { SupabaseClient } from "@supabase/supabase-js";
import { loadMoodieCalendarAgenda } from "@/lib/moodie/domain/calendar-context";
import {
  loadMoodieDeliveryAssets,
  loadMoodieGalleryImages,
  resolveMoodieContract,
} from "@/lib/moodie/domain/gallery-context";
import type { Database } from "@/types/database.types";
import { canAccess, type Role } from "@/types/roles";

export type MoodieMcpContext = {
  supabase: SupabaseClient<Database>;
  userId: string;
  role: Role;
};

const contractInput = z.object({
  contract_id: z.string().uuid().optional(),
  contract_code: z.string().trim().min(1).optional(),
  customer_query: z.string().trim().min(1).optional(),
});

export const moodieGoogleWorkspaceMcpAdapter = {
  "moodie.calendar.agenda": {
    input: z.object({
      start: z.string().datetime(),
      end: z.string().datetime(),
      include_google: z.boolean().default(true),
      include_tasks: z.boolean().default(true),
      limit: z.number().int().min(1).max(40).default(20),
    }),
    async execute(context: MoodieMcpContext, rawInput: unknown) {
      if (!canAccess(context.role, "calendar")) throw new Error("Calendar access denied");
      const input = this.input.parse(rawInput);
      const agenda = await loadMoodieCalendarAgenda({
        start: new Date(input.start),
        end: new Date(input.end),
        includeGoogle: input.include_google,
        includeTasks: input.include_tasks,
        limit: input.limit,
      });
      return {
        totals: agenda.totals,
        events: agenda.events.map((event) => ({
          id: event.id,
          title: event.title,
          start: event.start,
          end: event.end,
          source: event.source,
          status: event.status,
          contract_id: event.contractId,
        })),
        partial_errors: agenda.errors,
      };
    },
  },
  "moodie.contract.delivery_assets": {
    input: contractInput,
    async execute(context: MoodieMcpContext, rawInput: unknown) {
      if (!canAccess(context.role, "contracts")) throw new Error("Contract access denied");
      const contract = await resolveMoodieContract(context.supabase, this.input.parse(rawInput));
      if (!contract) return { found: false };
      const assets = await loadMoodieDeliveryAssets(context.supabase, contract.id);
      return {
        found: true,
        contract: { id: contract.id, contract_code: contract.contract_code },
        album_count: assets.galleries.length,
        selected_count: assets.selectedCount,
        edited_count: assets.editedCount,
        progress_percent: assets.progress,
        delivery_date: assets.deliveryDate,
        galleries: assets.galleries.map((gallery) => ({
          id: gallery.id,
          title: gallery.title,
          status: gallery.status,
          folder_type: gallery.folder_type,
          image_count: gallery.total,
          selected_count: gallery.selected,
        })),
      };
    },
  },
  "moodie.gallery.images": {
    input: contractInput.extend({
      gallery_id: z.string().uuid().optional(),
      selected_only: z.boolean().default(false),
      limit: z.number().int().min(1).max(12).default(12),
    }),
    async execute(context: MoodieMcpContext, rawInput: unknown) {
      if (!canAccess(context.role, "contracts")) throw new Error("Contract access denied");
      const input = this.input.parse(rawInput);
      const contract = await resolveMoodieContract(context.supabase, input);
      if (!contract) return { found: false };
      const gallery = await loadMoodieGalleryImages(context.supabase, {
        contractId: contract.id,
        galleryId: input.gallery_id,
        selectedOnly: input.selected_only,
        limit: input.limit,
      });
      return {
        found: true,
        contract: { id: contract.id, contract_code: contract.contract_code },
        total: gallery.total,
        images: gallery.images.map((image) => ({
          id: image.id,
          gallery_id: image.gallery_id,
          thumbnail_url: image.thumbnail_url,
          file_name: image.file_name,
          selected: image.is_selected,
          starred: image.is_starred,
        })),
      };
    },
  },
} as const;

export type MoodieGoogleWorkspaceMcpToolName = keyof typeof moodieGoogleWorkspaceMcpAdapter;
