import type { SupabaseClient } from "@supabase/supabase-js";
import { DEFAULT_STUDIO_TIMEZONE } from "@/lib/studio-date";
import type { Database } from "@/types/database.types";

type StudioAdminClient = SupabaseClient<Database>;
type StudioInfoRow = Database["public"]["Tables"]["studio_info"]["Row"];

const DEFAULT_STUDIO_INFO: Database["public"]["Tables"]["studio_info"]["Insert"] = {
  name: "Mood Studio",
  hotline: null,
  address: null,
  representative: null,
  logo_url: null,
  bank_info: {},
  social_links: {},
  working_hours: {},
  timezone: DEFAULT_STUDIO_TIMEZONE,
};

export async function getOrCreateStudioInfo(
  supabase: StudioAdminClient,
): Promise<StudioInfoRow> {
  const { data, error } = await supabase
    .from("studio_info")
    .select("*")
    .limit(1)
    .maybeSingle();

  if (error) {
    throw new Error(`Không thể tải thông tin studio: ${error.message}`);
  }

  if (data) {
    return data;
  }

  const { data: created, error: createError } = await supabase
    .from("studio_info")
    .insert(DEFAULT_STUDIO_INFO)
    .select("*")
    .single();

  if (createError || !created) {
    throw new Error(
      `Không thể khởi tạo thông tin studio mặc định: ${
        createError?.message || "Không xác định"
      }`,
    );
  }

  return created;
}
