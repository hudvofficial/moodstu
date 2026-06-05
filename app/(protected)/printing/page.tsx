import PrintingListPage from "@/components/printing/printing-list-page";
import { getPrintingBootstrap } from "@/app/actions/printing-queries";

export const metadata = {
  title: "In ấn",
};

export const dynamic = "force-dynamic";

export default async function PrintingPage() {
  // SSR: 1 auth-session bootstrap → truyền initial data → SWR render ngay, không skeleton.
  // Trước: 0 initial data → SWR mount 3 server actions riêng (3× auth) → 600-1000ms trên mobile.
  const result = await getPrintingBootstrap();
  const data = result.success ? result.data : null;

  return (
    <PrintingListPage
      initialOrdersPage={data?.orders}
      initialStats={data?.stats}
      initialLabOptions={data?.labOptions}
    />
  );
}
