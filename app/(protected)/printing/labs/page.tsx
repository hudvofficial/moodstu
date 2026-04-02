import { fetchLabsList } from "@/app/actions/lab-queries";
import { getLabDebts } from "@/app/actions/printing-queries";
import LabListPage from "@/components/printing/labs/lab-list-page";

export const metadata = {
  title: "Labs | Mood Studio",
};

export const dynamic = "force-dynamic";

export default async function PrintingLabsPage() {
  const [labsResult, debtsResult] = await Promise.all([
    fetchLabsList(),
    getLabDebts(),
  ]);

  if (!labsResult.success) {
    throw new Error(labsResult.error);
  }

  if (!debtsResult.success) {
    throw new Error(debtsResult.error);
  }

  return (
    <LabListPage
      initialLabs={labsResult.data}
      initialDebts={debtsResult.data}
    />
  );
}
