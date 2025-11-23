// src/app/layout.tsx
import { NextIntlClientProvider } from 'next-intl';
import { getMessages, getLocale } from 'next-intl/server';
import { Toaster } from "@/components/ui/toaster";
import { FirebaseProvider } from "@/firebase/provider";
import "../app/globals.css";

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
  // Although the root layout doesn't have the locale in its path,
  // Next.js provides it in the params for the top-level layout.
  // If not, we fall back to getting it from the request.
  const locale = params.locale || await getLocale();
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
