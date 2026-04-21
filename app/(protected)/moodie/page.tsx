import { getMoodiePageData } from "@/app/actions/moodie-queries";
import { MoodiePageClient } from "@/components/moodie/moodie-page-client";

export const metadata = { title: "Moodie | Mood Studio" };
export const dynamic = "force-dynamic";

export default async function MoodiePage() {
  const result = await getMoodiePageData();

  if (!result.success) {
    throw new Error(result.error);
  }

  return <MoodiePageClient initialData={result.data} />;
}
