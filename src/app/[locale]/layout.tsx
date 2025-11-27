import {NextIntlClientProvider} from 'next-intl';
import {getMessages, setRequestLocale} from 'next-intl/server';
import {routing} from '@/i18n/routing';
import {notFound} from 'next/navigation';
import {ReactNode} from 'react';
import { FirebaseProvider } from "@/firebase/provider";
import { Toaster } from "@/components/ui/toaster";

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
    <NextIntlClientProvider locale={locale} messages={messages}>
      <FirebaseProvider>
        {children}
        <Toaster />
      </FirebaseProvider>
    </NextIntlClientProvider>
  );
}
