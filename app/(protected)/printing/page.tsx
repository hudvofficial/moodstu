import PrintingListPage from "@/components/printing/printing-list-page";

export const metadata = {
  title: "In ấn",
};

export const dynamic = "force-dynamic";

export default function PrintingPage() {
  // 0ms navigation: we skip Server-blocking database queries here.
  // The layout already checked permissions via cookie.
  // We just render the client shell and let SWR do the fetching, which allows 
  // immediate page transitions and beautiful skeletons.
  return <PrintingListPage />;
}
