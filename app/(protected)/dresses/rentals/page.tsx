import { Suspense } from "react";
import type { Metadata } from "next";
import RentalHistoryClient from "@/components/dresses/rental-history-client";

export const metadata: Metadata = {
  title: "Lịch sử cho thuê — Mood Studio",
};

export default function RentalsPage() {
  return (
    <Suspense>
      <RentalHistoryClient />
    </Suspense>
  );
}
