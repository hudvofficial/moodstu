import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import { Toaster } from "sonner";
import "./globals.css";
import { ModalProvider } from "@/lib/context/modal-context";
import { GlobalModal } from "@/components/providers/modal-renderer";
import ThemeProvider from "@/components/theme/ThemeProvider";
import { NuqsAdapter } from "nuqs/adapters/next/app";

const inter = localFont({
  src: "../public/fonts/InterVariable.woff2",
  display: "swap",
  variable: "--font-inter",
  weight: "100 900",
});

export const metadata: Metadata = {
  title: "Mood Studio — Quản lý studio cưới",
  description: "Hệ thống quản lý studio cưới chuyên nghiệp",
  icons: { icon: "/logo.png" },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  themeColor: "#8B5E3C",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="vi" className={inter.variable}>
      <body className="antialiased">
        <ThemeProvider>
          <NuqsAdapter>
            <ModalProvider>
              {children}
              <GlobalModal />
              <Toaster
                position="top-right"
                toastOptions={{
                  style: {
                    background: "var(--color-bg-card)",
                    border: "1px solid var(--color-border)",
                    color: "var(--color-text-primary)",
                    borderRadius: "16px",
                    fontSize: "14px",
                    fontWeight: 600,
                  },
                }}
              />
            </ModalProvider>
          </NuqsAdapter>
        </ThemeProvider>
      </body>
    </html>
  );
}
