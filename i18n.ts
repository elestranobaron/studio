// i18n.ts ← À LA RACINE DU PROJET (pas dans src/)
import { getRequestConfig } from 'next-intl/server';

export const locales = ['en', 'fr', 'es', 'de', 'it', 'pt', 'ru', 'ja', 'zh', 'ca'] as const;
export const localePrefix = 'as-needed';

export default getRequestConfig(async ({ locale }) => {
  // Sécurité si locale undefined (rare mais possible)
  const validLocale = locales.includes(locale as any) ? locale : 'en';

  return {
    messages: (await import(`./messages/${validLocale}.json`)).default
  };
});