// src/i18n.ts
import { getRequestConfig } from 'next-intl/server';
import { notFound } from 'next/navigation';

const locales = ['en', 'fr', 'es', 'de', 'it', 'ca', 'pt', 'ru', 'ja', 'zh', 'pl', 'nl', 'ar', 'hi', 'ko', 'ro'];

export default getRequestConfig(async ({ requestLocale }) => {
  let locale = await requestLocale;

  if (!locale || !locales.includes(locale)) {
    // Fallback sur default au lieu de notFound() pour robustesse (doc recommande ça)
    locale = 'en';
    // Ou si tu veux vraiment 404 pour locales invalides : notFound();
  }

  return {
    locale,  // Obligatoire maintenant !
    messages: (await import(`./messages/${locale}.json`)).default
  };
});