import ContractsListClient from "@/components/contracts/contracts-list-client";

export const metadata = { title: "Hợp đồng | Mood Studio" };

// TODO: Phase A+ — Migrate to server-side fetch pattern (like employees/page.tsx)
// Currently ContractsListClient uses SWR for data fetching.
// Future: fetch server-side → pass initialData → SWR hydrates from props.
export default function ContractsPage() {
  return <ContractsListClient />;
}
