import createMiddleware from 'next-intl/middleware';
import { locales, defaultLocale, localePrefix } from './next-intl.config';

export default createMiddleware({
  locales,
  defaultLocale,
  localePrefix,
  localeDetection: true,
});

export const config = {
  // Match only internationalized pathnames
  matcher: ['/', '/((?!api|_next|_vercel|.*\\..*).*)']
};
