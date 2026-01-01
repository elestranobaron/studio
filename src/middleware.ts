import createMiddleware from 'next-intl/middleware';
 
export default createMiddleware({
  locales: ['en', 'fr', 'es', 'de', 'it', 'ca', 'pt', 'ru', 'ja', 'zh', 'pl', 'nl', 'ar', 'hi', 'ko', 'ro', 'sv', 'da', 'tr', 'th'],
  defaultLocale: 'en',
  localePrefix: 'as-needed'
});
 
export const config = {
  // Skip all paths that should not be internationalized. This includes
  // folders like `/api`, `/_next` and files with an extension (e.g. `sitemap.xml`)
  matcher: ['/((?!api|_next|.*\\..*).*)']
};