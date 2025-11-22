import createMiddleware from 'next-intl/middleware';
import { locales, defaultLocale, localePrefix } from '../next-intl.config';
 
export default createMiddleware({
  // A list of all locales that are supported
  locales: locales,
 
  // Used when no locale matches
  defaultLocale: defaultLocale,

  localePrefix: localePrefix
});
 
export const config = {
  // Match only internationalized pathnames
  matcher: ['/', '/((?!api|_next|_vercel|.*\\..*).*)']
};
