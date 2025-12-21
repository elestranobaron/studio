import createMiddleware from 'next-intl/middleware';
 
export default createMiddleware({
  locales: ['en', 'fr', 'es', 'de', 'it', 'ca', 'pt', 'ru', 'ja', 'zh', 'pl', 'nl', 'ar', 'hi', 'ko', 'ro'],
  defaultLocale: 'en',
  localePrefix: 'as-needed'
});
 
export const config = {
  // Match only internationalized pathnames
  // This regex excludes files with extensions (e.g. .mp4, .jpg) and API routes.
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico|.*\\..*).*)']
};