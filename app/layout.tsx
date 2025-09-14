import "./globals.css";
import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as SonnerToaster } from "@/components/ui/sonner";
import { ThemeProvider, themeScript } from "@/components/theme-provider";
import { AuthProvider } from "@/lib/auth-context";
import { QueryProvider } from "@/lib/query-client";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  metadataBase: new URL(
    process.env.NODE_ENV === "production"
      ? "https://pomouno.com"
      : "http://localhost:3000"
  ),
  title: {
    default: "PomoUno - Free Online Pomodoro Timer for Focus & Productivity",
    template: "%s | PomoUno",
  },
  description:
    "Free online Pomodoro that helps you start and stay focused with Pomodoro timers, smart tasks, and break reminders, plus stats and a calendar to track progress. Perfect for students, pros, and people with ADHD.",
  keywords: [
    "pomodoro timer online",
    "free pomodoro timer",
    "productivity app",
    "focus timer",
    "time management",
    "pomodoro technique",
    "work timer",
    "break timer",
    "productivity tracker",
    "focus app",
    "study timer",
    "tomato timer",
    "concentration app",
    "work from home productivity",
    "time blocking",
  ],
  authors: [{ name: "PomoUno Team", url: "https://pomouno.com" }],
  creator: "PomoUno Team",
  publisher: "PomoUno",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "PomoUno",
  },
  robots: {
    index: true,
    follow: true,
    nocache: false,
    googleBot: {
      index: true,
      follow: true,
    },
  },
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "https://pomouno.com",
    title: "PomoUno - Free Online Pomodoro Timer for Focus & Productivity",
    description:
      "PomoUno helps you start and stay focused with Pomodoro timers, smart tasks, and break reminders, plus stats and a calendar to track progress. Perfect for students, pros, and people with ADHD.",
    siteName: "PomoUno",
    images: [
      {
        url: "/opengraph-image",
        width: 1200,
        height: 630,
        alt: "PomoUno - Free Online Pomodoro Timer",
        type: "image/png",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "PomoUno - Free Online Pomodoro Timer",
    description:
      "Boost productivity with our free online Pomodoro timer. Track tasks and maintain focus with the proven 25-minute technique.",
    images: ["/opengraph-image"],
    creator: "@pomouno",
    site: "@pomouno",
  },
  alternates: {
    canonical: "https://pomouno.com",
  },
  verification: {
    google: "zTcgsDtsV4J_pqG77e8s4mmXoUDR42I6lycVjr4Z_6A",
    // Add other verification codes as needed
    // yandex: 'your-yandex-verification',
    // yahoo: 'your-yahoo-verification',
  },
  applicationName: "PomoUno",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#E53935",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
        <link rel="manifest" href="/manifest.json" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="PomoUno" />
        <meta name="application-name" content="PomoUno" />
        <meta name="msapplication-TileColor" content="#E53935" />
        <meta name="theme-color" content="#E53935" />
        <link rel="canonical" href="https://pomouno.com" />
        <script
          dangerouslySetInnerHTML={{
            __html: themeScript,
          }}
        />

        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "WebApplication",
              name: "PomoUno",
              alternateName: "PomoUno Pomodoro Timer",
              description:
                "Free online Pomodoro timer to boost productivity and focus. Use the proven 25-minute focus technique with customizable timers, task tracking, and productivity statistics.",
              url: "https://pomouno.com",
              applicationCategory: "ProductivityApplication",
              operatingSystem: "Any",
              browserRequirements: "Requires JavaScript",
              author: {
                "@type": "Organization",
                name: "PomoUno Team",
                url: "https://pomouno.com",
              },
              publisher: {
                "@type": "Organization",
                name: "PomoUno",
                url: "https://pomouno.com",
                logo: {
                  "@type": "ImageObject",
                  url: "https://pomouno.com/web-app-manifest-192x192.png",
                  width: 192,
                  height: 192,
                },
              },
              offers: {
                "@type": "Offer",
                price: "0",
                priceCurrency: "USD",
                category: "free",
              },
              featureList: [
                "Customizable Pomodoro Timer",
                "Task Management",
                "Progress Tracking",
                "Productivity Analytics",
                "Focus Enhancement",
                "Dark/Light Theme",
                "Audio Notifications",
                "Background Sounds",
              ],
              screenshot: "https://pomouno.com/opengraph-image",
              keywords:
                "pomodoro timer, productivity app, focus timer, time management, pomodoro technique, work timer, break timer, productivity tracker",
            }),
          }}
        />

        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "Organization",
              name: "PomoUno",
              url: "https://pomouno.com",
              logo: {
                "@type": "ImageObject",
                url: "https://pomouno.com/web-app-manifest-192x192.png",
                width: 192,
                height: 192,
              },
              sameAs: ["https://github.com/medsghiri/pomouno"],
              contactPoint: {
                "@type": "ContactPoint",
                contactType: "support",
                url: "https://pomouno.com/legal/contact",
                availableLanguage: "en",
              },
            }),
          }}
        />
      </head>
      <body className={inter.className}>
        <ThemeProvider>
          <QueryProvider>
            <AuthProvider>{children}</AuthProvider>
          </QueryProvider>
        </ThemeProvider>
        <Toaster />
        <SonnerToaster />
      </body>
    </html>
  );
}
