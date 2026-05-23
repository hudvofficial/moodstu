import { fetchLabsList } from "@/app/actions/lab-queries";
import LabListPage from "@/components/printing/labs/lab-list-page";

export const metadata = {
  title: "Lab in ấn",
};

export const dynamic = "force-dynamic";

export default async function PrintingLabsPage() {
  const labsResult = await fetchLabsList();

  if (!labsResult.success) {
    throw new Error(labsResult.error);
  }

  return (
    <LabListPage initialLabs={labsResult.data} />
  );
}

