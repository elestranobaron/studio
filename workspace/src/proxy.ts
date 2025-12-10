import createMiddleware from 'next-intl/middleware';
 
export const proxy = createMiddleware({
  locales: ['en', 'fr', 'es', 'de', 'it', 'ca', 'pt', 'ru', 'ja', 'zh', 'pl', 'nl', 'ar', 'hi', 'ko', 'ro'],
  defaultLocale: 'en',
  localePrefix: 'as-needed'
});
