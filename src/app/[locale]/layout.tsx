import { NextIntlClientProvider } from 'next-intl';
import { getMessages, setRequestLocale } from 'next-intl/server';
import { ReactNode } from 'react';
import { FirebaseProvider } from '@/firebase/provider';
import { Toaster } from '@/components/ui/toaster';
import '@/app/globals.css';
import { Metadata } from 'next';
import { notFound } from 'next/navigation';

const locales = [
  'en',
  'fr',
  'es',
  'de',
  'it',
  'ca',
  'pt',
  'ru',
  'ja',
  'zh',
  'pl',
  'nl',
  'ar',
  'hi',
  'ko',
  'ro',
];

type Props = {
  children: ReactNode;
  params: Promise<{ locale: string }>; // ← Important : Promise maintenant !
};

export function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params; // ← Await ici

  // Validation simple de la locale (sécurité + 404 si invalide)
  if (!locales.includes(locale)) {
    notFound();
  }

  const rawBaseUrl =
    process.env.NEXT_PUBLIC_APP_URL || 'https://wodburner.app';
  const baseUrl = rawBaseUrl.replace(/\/$/, '');

  const languages = locales.reduce((acc, loc) => {
    acc[loc] = loc === 'en' ? baseUrl : `${baseUrl}/${loc}`;
    return acc;
  }, {} as Record<string, string>);

  return {
    metadataBase: new URL(baseUrl),
    alternates: {
      canonical: './',
      languages: {
        'x-default': `${baseUrl}/`,
        ...languages,
      },
    },
  };
}

export default async function LocaleLayout({ children, params }: Props) {
  const { locale } = await params; // ← Await ici aussi

  // Si la locale n'est pas supportée → 404
  if (!locales.includes(locale)) {
    notFound();
  }

  setRequestLocale(locale);
  const messages = await getMessages();

  return (
    <html lang={locale} className="dark">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
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