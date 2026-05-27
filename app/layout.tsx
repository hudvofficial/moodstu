import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import NextTopLoader from "nextjs-toploader";
import "./globals.css";
import { ModalProvider } from "@/lib/context/modal-context";
import { GlobalModal } from "@/components/providers/modal-renderer";
import ThemeProvider from "@/components/theme/ThemeProvider";
import { NuqsAdapter } from "nuqs/adapters/next/app";
import { OfflineIndicator } from "@/components/ui/offline-indicator";
import { SlowNetworkIndicator } from "@/components/ui/slow-network-indicator";
import { DevServiceWorkerReset } from "@/components/layout/dev-service-worker-reset";
import { ServiceWorkerUpdateReload } from "@/components/layout/service-worker-update-reload";
import { WebVitalsReporter } from "@/components/performance/web-vitals-reporter";
import { SWRProvider } from "@/components/providers/swr-provider";
import { QueryProvider } from "@/components/providers/query-provider";
import { SplashScreen } from "@/components/layout/splash-screen";
import { ToasterWrapper } from "@/components/ui/toaster-wrapper";

const inter = localFont({
  src: "../public/fonts/InterVariable.woff2",
  display: "swap",
  variable: "--font-inter",
  weight: "100 900",
});

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;

const splashScript = `
(function () {
  try {
    if (sessionStorage.getItem("ms_v2_loaded")) {
      document.documentElement.classList.add("skip-splash");
    } else {
      sessionStorage.setItem("ms_v2_loaded", "1");
    }
  } catch (error) {}
})();
`;

export const metadata: Metadata = {
  title: {
    default: "Mood Studio",
    template: "%s | Mood Studio",
  },
  description: "Hệ thống quản lý studio cưới chuyên nghiệp",
  icons: {
    icon: [
      { url: "/icon.png", type: "image/png", sizes: "512x512" },
      { url: "/icons/icon-96x96.png", type: "image/png", sizes: "96x96" },
      { url: "/icons/icon-192x192.png", type: "image/png", sizes: "192x192" },
    ],
    apple: [{ url: "/apple-icon.png", sizes: "180x180", type: "image/png" }],
  },
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Mood Studio",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  themeColor: "#8B5E3C",
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="vi" className={inter.variable} suppressHydrationWarning>
      <head>
        {/* Splash screen skip - must run before any React code */}
        {/* eslint-disable-next-line @next/next/no-sync-scripts */}
        <script dangerouslySetInnerHTML={{ __html: splashScript }} />
        {supabaseUrl ? (
          <>
            <link rel="dns-prefetch" href={supabaseUrl} />
            <link rel="preconnect" href={supabaseUrl} crossOrigin="anonymous" />
          </>
        ) : null}
        {/* Preconnect to Google Drive for faster image loading */}
        <link rel="dns-prefetch" href="https://drive.google.com" />
        <link rel="dns-prefetch" href="https://lh3.googleusercontent.com" />
        <link rel="preconnect" href="https://drive.google.com" />
        <link rel="preconnect" href="https://lh3.googleusercontent.com" />
        <style
          dangerouslySetInnerHTML={{
            __html: `
              #splash-screen {
                position: fixed;
                inset: 0;
                z-index: 2147483647;
                display: grid;
                place-items: center;
                background: var(--color-primary, #8B5E3C);
                opacity: 1;
                transition: opacity 300ms ease;
              }
              #splash-screen.fade-out {
                opacity: 0;
              }
              html.skip-splash #splash-screen {
                display: none !important;
                opacity: 0 !important;
                pointer-events: none !important;
              }
              #splash-screen img {
                object-fit: contain;
                filter: brightness(0) invert(1);
                animation: splashPulse 1200ms ease-in-out infinite;
              }
              @keyframes splashPulse {
                0%, 100% { opacity: 0.72; }
                50% { opacity: 1; }
              }
            `,
          }}
        />
      </head>
      <body className={`${inter.variable} antialiased`} suppressHydrationWarning>
        <ThemeProvider>
          <NuqsAdapter>
            <SWRProvider>
              <QueryProvider>
                <ModalProvider>
                <NextTopLoader
                  color="var(--color-primary)"
                  height={3}
                  showSpinner={false}
                  speed={300}
                />
                <WebVitalsReporter />
                <DevServiceWorkerReset />
                <ServiceWorkerUpdateReload />
                <OfflineIndicator />
                <SlowNetworkIndicator />
                <SplashScreen />
                {children}
                <GlobalModal />
                <ToasterWrapper />
                </ModalProvider>
              </QueryProvider>
            </SWRProvider>
          </NuqsAdapter>
        </ThemeProvider>
      </body>
    </html>
  );
}


