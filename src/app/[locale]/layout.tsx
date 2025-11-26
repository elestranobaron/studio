
// src/app/[locale]/layout.tsx
import { NextIntlClientProvider } from 'next-intl';
import { getLocale, getMessages } from 'next-intl/server';
//import { defaultLocale } from '@/next-intl.config';

export default async function LocaleLayout({ children }: { children: React.ReactNode }) {
  let locale;
  try {
    locale = await getLocale();
  } catch (error) {
    //locale = defaultLocale;
  }
  
  const messages = await getMessages({locale});

  return (
    <NextIntlClientProvider locale={locale} messages={messages}>
      {children}
    </NextIntlClientProvider>
  );
}
