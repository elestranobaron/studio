import { NextIntlClientProvider } from 'next-intl';
import { getMessages, setRequestLocale, getTranslations } from 'next-intl/server';
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
  params: Promise<{ locale: string }>;
};

export function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;

  if (!locales.includes(locale)) {
    notFound();
  }

  const t = await getTranslations({ locale, namespace: 'RootLayout.seo' });
  const rawBaseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://wodburner.app';
  const baseUrl = rawBaseUrl.replace(/\/$/, '');

  const languages = locales.reduce((acc, loc) => {
    acc[loc] = loc === 'en' ? baseUrl : `${baseUrl}/${loc}`;
    return acc;
  }, {} as Record<string, string>);

  return {
    metadataBase: new URL(baseUrl),
    title: {
      template: `%s | WODBurner`,
      default: t('title'),
    },
    description: t('description'),
    keywords: ["CrossFit", "WOD", "Workout", "Timer", "AI", "Fitness", "Whiteboard Scanner"],
    authors: [{ name: "WODBurner Team" }],
    creator: "WODBurner",
    publisher: "WODBurner",
    formatDetection: {
      email: false,
      address: false,
      telephone: false,
    },
    alternates: {
      canonical: './',
      languages: {
        'x-default': `${baseUrl}/`,
        ...languages,
      },
    },
    openGraph: {
      title: t('title'),
      description: t('description'),
      url: baseUrl,
      siteName: 'WODBurner',
      images: [
        {
          url: 'https://images.unsplash.com/photo-1517836357463-d25dfeac3438?q=80&w=1200&h=630&fit=crop',
          width: 1200,
          height: 630,
          alt: 'WODBurner - CrossFit Companion',
        },
      ],
      locale: locale,
      type: 'website',
    },
    twitter: {
      card: 'summary_large_image',
      title: t('title'),
      description: t('description'),
      images: ['https://images.unsplash.com/photo-1517836357463-d25dfeac3438?q=80&w=1200&h=630&fit=crop'],
      creator: '@wodburner',
    },
    robots: {
      index: true,
      follow: true,
      googleBot: {
        index: true,
        follow: true,
        'max-video-preview': -1,
        'max-image-preview': 'large',
        'max-snippet': -1,
      },
    },
  };
}

export default async function LocaleLayout({ children, params }: Props) {
  const { locale } = await params;

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
        <NextIntlClientProvider 
            locale={locale} 
            messages={messages}
        >
          <FirebaseProvider>
            {children}
            <Toaster />
          </FirebaseProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
