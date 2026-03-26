import { Suspense } from "react";
import type { Metadata } from "next";
import StandaloneRentalsClient from "@/components/dresses/standalone-rentals-client";

export const metadata: Metadata = {
  title: "Đơn thuê vãng lai — Mood Studio",
};

export default function RentalsPage() {
  return (
    <Suspense>
      <StandaloneRentalsClient />
    </Suspense>
  );
}
