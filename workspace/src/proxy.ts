
import createMiddleware from 'next-intl/middleware';
import { locales, defaultLocale, localePrefix } from '../next-intl.config';
 
export default function(request: any) {
  console.log('[DEBUG] src/proxy.ts: Request received for path:', request.nextUrl.pathname);
  const handleI18nRouting = createMiddleware({
    locales: locales,
    defaultLocale: defaultLocale,
    localePrefix: localePrefix
  });
  const response = handleI18nRouting(request);
  console.log('[DEBUG] src/proxy.ts: Responding with URL:', response?.url);
  return response;
}
 
export const config = {
  // Match only internationalized pathnames
  matcher: ['/', '/((?!api|_next|_vercel|.*\\..*).*)']
};
