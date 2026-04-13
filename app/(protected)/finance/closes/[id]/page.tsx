import { getCloseDetail } from "@/app/actions/finance-close-actions";
import { CloseDetailClient } from "@/components/finance/closes/close-detail-client";
import type { ActionResult, CloseDetailData } from "@/types/finance-operations";

interface CloseDetailPageProps {
  params: Promise<{ id: string }>;
}

function unwrap<T>(result: ActionResult<T>, fallback: T): T {
  return result.success ? result.data : fallback;
}

export const metadata = { title: "Chi tiết chốt sổ | Mood Studio" };
export const dynamic = "force-dynamic";

export default async function CloseDetailPage({ params }: CloseDetailPageProps) {
  const { id } = await params;
  const detail = await getCloseDetail(id);
  return <CloseDetailClient closeId={id} initialData={unwrap<CloseDetailData | null>(detail, null)} />;
}
