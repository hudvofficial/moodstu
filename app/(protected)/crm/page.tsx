import { redirect } from "next/navigation";

export default function CRMPage() {
  // Default CRM landing is the Leads list
  redirect("/crm/leads");
}
