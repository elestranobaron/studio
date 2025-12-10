import {NextIntlClientProvider, useMessages} from 'next-intl';
import {ReactNode} from 'react';
import { FirebaseProvider } from "@/firebase/provider";
import { Toaster } from "@/components/ui/toaster";
import '../globals.css';
import { routing } from '@/i18n/routing';

type Props = {
  children: ReactNode;
  params: {locale: string};
};

export function generateStaticParams() {
  return routing.locales.map((locale) => ({locale}));
}

export default function LocaleLayout({children, params: {locale}}: Props) {
  // Receive messages provided in `i18n.ts`
  const messages = useMessages();
 
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
