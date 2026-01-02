import createMiddleware from 'next-intl/middleware';

export default createMiddleware({
  locales: ['en', 'fr', 'es', 'de', 'it', 'ca', 'pt', 'ru', 'ja', 'zh', 'pl', 'nl', 'ar', 'hi', 'ko', 'ro', 'sv', 'da', 'tr', 'th'],
  defaultLocale: 'en',
  localePrefix: 'as-needed'
});

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|api|.*\\..*).*)'
  ]
};