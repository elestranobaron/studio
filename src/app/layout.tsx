import type { Metadata } from "next";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import { cn } from "@/lib/utils";
import { FirebaseClientProvider } from "@/firebase";
import {NextIntlClientProvider} from 'next-intl';
import {getMessages} from 'next-intl/server';

export const metadata: Metadata = {
  title: "WODBurner",
  description: "Scan any WOD in seconds, time it perfectly, share instantly, and join the strongest French-speaking CrossFit community.",
  manifest: "/manifest.json",
  icons: {
    icon: "/icon-192.png",
    apple: "/icon-512.png",
  },
};

export const viewport = {
  themeColor: "#ff0000",
};

export const appleWebApp = {
  capable: true,
  statusBarStyle: "black-translucent",
  title: "WODBurner",
};

export default async function RootLayout({
  children,
  params: {locale}
}: Readonly<{
  children: React.ReactNode;
  params: {locale: string};
}>) {
  const messages = await getMessages();

  return (
    <html lang={locale} className="dark">
      <head>
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
  <link
    href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Poppins:wght@600;700;800&display=swap"
    rel="stylesheet"
  />
  
  {/* ──────── PWA : TOUT ICI ──────── */}
  <link rel="manifest" href="/manifest.json" />
  <link rel="icon" href="/icon-192.png" sizes="192x192" />
  <link rel="apple-touch-icon" href="/icon-512.png" />
  <meta name="theme-color" content="#ff0000" />
  
  <script
    dangerouslySetInnerHTML={{
      __html: `
        if ('serviceWorker' in navigator) {
          window.addEventListener('load', () => {
            navigator.serviceWorker.register('/service-worker.js')
              .then(reg => console.log('SW registered:', reg))
              .catch(err => console.log('SW error:', err));
          });
        }
      `,
    }}
  />
</head>
      <body className={cn("font-body antialiased", "min-h-screen bg-background font-sans")}>
        <NextIntlClientProvider messages={messages}>
          <FirebaseClientProvider>
            {children}
          </FirebaseClientProvider>
        </NextIntlClientProvider>
        <Toaster />
      </body>
    </html>
  );
}
