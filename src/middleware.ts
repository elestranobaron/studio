import createMiddleware from 'next-intl/middleware';

export default createMiddleware({
  // A list of all locales that are supported
  locales: ['en', 'fr', 'es', 'it', 'de', 'pt', 'ru', 'el', 'cs', 'is', 'sv', 'fi', 'no', 'hi', 'ko', 'ja', 'zh', 'ar', 'he', 'ln', 'ca'],

  // Used when no locale matches
  defaultLocale: 'en'
});

export const config = {
  // Match only internationalized pathnames
  matcher: ['/', '/(fr|en|es|it|de|pt|ru|el|cs|is|sv|fi|no|hi|ko|ja|zh|ar|he|ln|ca)/:path*']
};
