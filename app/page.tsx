import { redirect } from "next/navigation";

// Root page â†’ redirect to dashboard (protected)
export default function Home() {
  redirect("/dashboard");
}

