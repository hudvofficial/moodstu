import { redirect } from "next/navigation";

// ADR-016 M2: công nợ thợ ngoài hợp nhất vào /finance/payables
export default function VendorDebtsPage() {
  redirect("/finance/payables");
}
