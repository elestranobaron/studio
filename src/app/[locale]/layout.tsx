import {NextIntlClientProvider} from 'next-intl';
import {getMessages, setRequestLocale} from 'next-intl/server';
import {routing} from '@/i18n/routing';
import {notFound} from 'next/navigation';
import {ReactNode} from 'react';
import { FirebaseProvider } from "@/firebase/provider";
import { Toaster } from "@/components/ui/toaster";
import '../globals.css';

type Props = {
  children: ReactNode;
  params: {locale: string};
};

export function generateStaticParams() {
  return routing.locales.map((locale) => ({locale}));
}

export default async function LocaleLayout({children, params: {locale}}: Props) {
  // Validate that the incoming `locale` parameter is valid
  if (!routing.locales.includes(locale as any)) notFound();
 
  // Enable static rendering
  setRequestLocale(locale);
 
  // Receive messages
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
      <body>
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
