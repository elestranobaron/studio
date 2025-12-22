import { NextIntlClientProvider } from 'next-intl';
import { getMessages, setRequestLocale } from 'next-intl/server';
import { ReactNode } from 'react';
import { FirebaseProvider } from '@/firebase/provider';
import { Toaster } from '@/components/ui/toaster';
import '@/app/globals.css';
import { Metadata } from 'next';

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
  params: { locale: string };
};

export function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}

export async function generateMetadata({
  params: { locale },
}: Props): Promise<Metadata> {
  // Récupère l'URL de base (variable d'env ou fallback)
  const rawBaseUrl =
    process.env.NEXT_PUBLIC_APP_URL || 'https://wodburner.app';
  const baseUrl = rawBaseUrl.replace(/\/$/, ''); // Supprime un éventuel trailing slash

  // Construction des URLs pour les balises hreflang
  // L'anglais est à la racine (/), les autres langues ont /fr/, /es/, etc.
  const languages = locales.reduce((acc, loc) => {
    acc[loc] = loc === 'en' ? baseUrl : `${baseUrl}/${loc}`;
    return acc;
  }, {} as Record<string, string>);

  return {
    metadataBase: new URL(baseUrl),
    alternates: {
      canonical: './', // Self-referencing → chaque page pointe sur elle-même
      languages: {
        'x-default': `${baseUrl}/`, // Page par défaut = anglais (racine)
        ...languages,
      },
    },
  };
}

export default async function LocaleLayout({
  children,
  params: { locale },
}: Props) {
  // Active le rendu statique pour cette locale
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