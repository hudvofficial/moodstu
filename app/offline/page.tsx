"use client";

import Image from "next/image";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function OfflinePage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-bg-base px-6 py-12 text-center">
      <section className="w-full max-w-sm rounded-3xl border border-border bg-bg-card p-6 shadow-lg">
        <Image
          src="/icon.png"
          alt="Mood Studio"
          width={80}
          height={80}
          priority
          className="mx-auto rounded-2xl"
        />

        <h1 className="mt-6 text-xl font-bold text-text-primary">
          Không có kết nối mạng
        </h1>
        <p className="mt-2 text-sm leading-6 text-text-secondary">
          Mood Studio đang ở chế độ offline. Kiểm tra lại mạng rồi thử tải lại trang.
        </p>

        <Button
          onClick={() => window.location.reload()}
          type="button"
          className="mt-6 w-full justify-center"
        >
          Thử lại
        </Button>

        <Link
          href="/login"
          className="mt-4 inline-flex text-sm font-semibold text-primary"
        >
          Về màn hình đăng nhập
        </Link>
      </section>
    </main>
  );
}
