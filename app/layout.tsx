import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import { Toaster } from "sonner";
import NextTopLoader from "nextjs-toploader";
import "./globals.css";
import { ModalProvider } from "@/lib/context/modal-context";
import { GlobalModal } from "@/components/providers/modal-renderer";
import ThemeProvider from "@/components/theme/ThemeProvider";
import { NuqsAdapter } from "nuqs/adapters/next/app";
import { OfflineIndicator } from "@/components/ui/offline-indicator";
import { DevServiceWorkerReset } from "@/components/layout/dev-service-worker-reset";
import { ServiceWorkerUpdateReload } from "@/components/layout/service-worker-update-reload";
import { WebVitalsReporter } from "@/components/performance/web-vitals-reporter";
import { SWRProvider } from "@/components/providers/swr-provider";
import { Bell, CheckCircle2, XCircle, AlertCircle, Info } from "lucide-react";

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
    if (sessionStorage.getItem("ms_v2_loaded")) return;
    sessionStorage.setItem("ms_v2_loaded", "1");

    var splash = document.createElement("div");
    splash.id = "splash-screen";
    splash.innerHTML = '<img src="/logo.png" alt="Mood Studio" width="80" height="80" />';
    document.documentElement.appendChild(splash);

    var done = false;
    function removeSplash() {
      if (done) return;
      done = true;
      splash.style.opacity = "0";
      window.setTimeout(function () {
        if (splash.parentNode) splash.parentNode.removeChild(splash);
      }, 300);
    }

    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", removeSplash, { once: true });
    } else {
      removeSplash();
    }
    window.setTimeout(removeSplash, 4000);
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
        {supabaseUrl ? (
          <>
            <link rel="dns-prefetch" href={supabaseUrl} />
            <link rel="preconnect" href={supabaseUrl} crossOrigin="anonymous" />
          </>
        ) : null}
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
        <script dangerouslySetInnerHTML={{ __html: splashScript }} />
      </head>
      <body className="antialiased" suppressHydrationWarning>
        <ThemeProvider>
          <NuqsAdapter>
            <SWRProvider>
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
                {children}
                <GlobalModal />
                <Toaster
                  position="top-right"
                  className="!top-[60px] lg:!top-[72px] !right-4 lg:!right-8 flex flex-col items-end"
                  toastOptions={{
                    classNames: {
                      toast: "group flex flex-row-reverse items-center gap-2.5 !w-auto !min-w-0 max-w-[400px] ml-auto",
                      title: "text-[13px] font-medium text-text-primary",
                      description: "text-[12px] text-text-muted mt-0.5",
                      icon: "m-0 shrink-0",
                    },
                    style: {
                      background: "var(--color-bg-card)",
                      border: "1px solid var(--color-border)",
                      borderRadius: "8px",
                      padding: "8px 12px",
                      boxShadow: "var(--shadow-md)",
                    },
                  }}
                  icons={{
                    success: <CheckCircle2 className="w-4 h-4 text-success" />,
                    error: <XCircle className="w-4 h-4 text-error" />,
                    warning: <AlertCircle className="w-4 h-4 text-warning" />,
                    info: <Info className="w-4 h-4 text-text-muted" />,
                  }}
                />
              </ModalProvider>
            </SWRProvider>
          </NuqsAdapter>
        </ThemeProvider>
      </body>
    </html>
  );
}


