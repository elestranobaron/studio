
// src/app/layout.tsx
import { NextIntlClientProvider } from 'next-intl';
import { getMessages, getLocale } from 'next-intl/server';
import { Toaster } from "@/components/ui/toaster";
import { FirebaseProvider } from "@/firebase/provider";
import "../app/globals.css";
import { defaultLocale } from '@/next-intl.config';

export const metadata = {
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
  params, // We need to receive params here
}: {
  children: React.ReactNode;
  params: { locale: string };
}) {
  let locale;
  try {
    // Attempt to get locale from the request
    locale = await getLocale();
    console.log(`[DEBUG] src/app/layout.tsx: Successfully got locale: "${locale}"`);
  } catch (error) {
    // If it fails (e.g., in a context where headers are not available),
    // fall back to the default locale from your config.
    console.error(`[DEBUG] src/app/layout.tsx: Failed to get locale, falling back to default. Error: ${error}`);
    locale = defaultLocale;
  }
  
  console.log(`[DEBUG] src/app/layout.tsx: Using locale: "${locale}"`);
  const messages = await getMessages({locale});

  return (
    <html lang={locale} className="dark">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Poppins:wght@600;700;800&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="font-body antialiased min-h-screen bg-background font-sans">
        <NextIntlClientProvider locale={locale} messages={messages}>
          <FirebaseProvider>
            {children}
            <Toaster />
          </FirebaseProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
