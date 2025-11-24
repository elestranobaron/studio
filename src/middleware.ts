import createMiddleware from 'next-intl/middleware';
import { locales, defaultLocale, localePrefix } from './next-intl.config';
import { NextRequest, NextResponse } from 'next/server';

export default createMiddleware({
  locales,
  defaultLocale,
  localePrefix,

  // This function is called before the internationalization is handled.
  // It's a good place to add redirects.
  beforeAuth: (request: NextRequest) => {
    // Check if the request is for the root of a locale
    const isLocaleRoot = locales.some(locale => request.nextUrl.pathname === `/${locale}`);
    
    // If it is, redirect to the dashboard for that locale
    if (isLocaleRoot) {
      const locale = request.nextUrl.pathname.split('/')[1];
      return NextResponse.redirect(new URL(`/${locale}/dashboard`, request.url));
    }

    // If the request is for the absolute root, let next-intl handle the redirect to the default locale.
    if (request.nextUrl.pathname === '/') {
       return NextResponse.redirect(new URL(`/${defaultLocale}/dashboard`, request.url));
    }


    // For all other requests, continue without modification.
    return NextResponse.next();
  },
});

export const config = {
  // Match only internationalized pathnames
  matcher: ['/', '/((?!api|_next|_vercel|.*\\..*).*)']
};
