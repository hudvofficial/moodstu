import { redirect } from "next/navigation";

// Root page → redirect to dashboard (protected)
export default function Home() {
  redirect("/dashboard");
}
