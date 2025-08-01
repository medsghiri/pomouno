import './globals.css';
import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import { Toaster } from '@/components/ui/toaster';
import { Toaster as SonnerToaster } from '@/components/ui/sonner';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NODE_ENV === 'production' ? 'https://pomouno.com' : 'http://localhost:3000'),
  title: {
    default: 'PomoUno - Online Pomodoro Timer for Focus & Productivity',
    template: '%s | PomoUno',
  },
  description: 'Free online Pomodoro timer to boost productivity and focus. Use the proven 25-minute focus technique with customizable timers, task tracking, and productivity statistics. Start focusing now!',
  keywords: [
    'pomodoro timer online',
    'free pomodoro timer',
    'productivity app',
    'focus timer',
    'time management',
    'pomodoro technique',
    'work timer',
    'break timer',
    'productivity tracker',
    'focus app',
    'study timer',
    'tomato timer',
    'concentration app',
    'work from home productivity',
    'time blocking'
  ],
  authors: [{ name: 'PomoUno Team', url: 'https://pomouno.com' }],
  creator: 'PomoUno',
  publisher: 'PomoUno',
  category: 'productivity',
  classification: 'productivity software',
  robots: {
    index: true,
    follow: true,
    nocache: false,
    googleBot: {
      index: true,
      follow: true,
      noimageindex: false,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: 'https://pomouno.com',
    title: 'PomoUno - Free Online Pomodoro Timer for Focus & Productivity',
    description: 'Boost productivity with our free online Pomodoro timer. Track tasks, maintain focus, and build better work habits with the proven 25-minute technique.',
    siteName: 'PomoUno',
    images: [
      {
        url: '/opengraph-image',
        width: 1200,
        height: 630,
        alt: 'PomoUno - Free Online Pomodoro Timer',
        type: 'image/png',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'PomoUno - Free Online Pomodoro Timer',
    description: 'Boost productivity with our free online Pomodoro timer. Track tasks and maintain focus with the proven 25-minute technique.',
    images: ['/opengraph-image'],
    creator: '@pomouno',
    site: '@pomouno',
  },
  alternates: {
    canonical: 'https://pomouno.com',
  },
  verification: {
    google: 'your-google-verification-code',
    // Add other verification codes as needed
    // yandex: 'your-yandex-verification',
    // yahoo: 'your-yahoo-verification',
  },
  applicationName: 'PomoUno',
  referrer: 'origin-when-cross-origin',
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#E53935',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <link rel="icon" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><circle cx='50' cy='50' r='35' fill='%23E53935'/></svg>" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
        <link rel="manifest" href="/manifest.json" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="PomoUno" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="msapplication-TileColor" content="#E53935" />
        <meta name="msapplication-config" content="/browserconfig.xml" />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "WebApplication",
              "name": "PomoUno",
              "alternateName": "PomoUno Pomodoro Timer",
              "description": "Free online Pomodoro timer to boost productivity and focus. Use the proven 25-minute focus technique with customizable timers, task tracking, and productivity statistics.",
              "url": "https://pomouno.com",
              "applicationCategory": "ProductivityApplication",
              "operatingSystem": "Any",
              "browserRequirements": "Requires JavaScript",
              "offers": {
                "@type": "Offer",
                "price": "0",
                "priceCurrency": "USD"
              },
              "author": {
                "@type": "Organization",
                "name": "PomoUno Team",
                "url": "https://pomouno.com"
              },
              "publisher": {
                "@type": "Organization",
                "name": "PomoUno"
              },
              "featureList": [
                "Customizable Pomodoro Timer",
                "Task Management",
                "Progress Tracking",
                "Productivity Analytics",
                "Focus Enhancement",
                "Dark/Light Theme",
                "Audio Notifications",
                "Background Sounds"
              ],
              "screenshot": "https://pomouno.com/opengraph-image",
              "aggregateRating": {
                "@type": "AggregateRating",
                "ratingValue": "4.8",
                "ratingCount": "1250",
                "bestRating": "5",
                "worstRating": "1"
              },
              "keywords": "pomodoro timer, productivity app, focus timer, time management, pomodoro technique, work timer, break timer, productivity tracker"
            })
          }}
        />
      </head>
      <body className={inter.className}>
        {children}
        <Toaster />
        <SonnerToaster />
      </body>
    </html>
  );
}