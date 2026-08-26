import { redirect } from "next/navigation";

// ADR-016 M2: công nợ lab hợp nhất vào /finance/payables
export default function LabDebtsPage() {
  redirect("/finance/payables");
}
