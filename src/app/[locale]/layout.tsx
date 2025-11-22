import {NextIntlClientProvider} from 'next-intl';
import {getMessages} from 'next-intl/server';
import type { Metadata } from "next";
import "../globals.css";
import { Toaster } from "@/components/ui/toaster";
import { FirebaseClientProvider } from "@/firebase";
 
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
 
export default async function LocaleLayout({
  children,
  params: {locale}
}: {
  children: React.ReactNode;
  params: {locale: string};
}) {
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
          <FirebaseClientProvider>
            {children}
          </FirebaseClientProvider>
          <Toaster />
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
