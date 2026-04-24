import { ReceiptsClient } from "@/components/finance/receipts/receipts-client";

export const metadata = { title: "Phieu thu | Mood Studio" };

export default function ReceiptsPage() {
  const now = new Date();
  const month = now.getMonth() + 1;
  const year = now.getFullYear();

  return <ReceiptsClient initialMonth={month} initialYear={year} />;
}
