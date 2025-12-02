
import createMiddleware from 'next-intl/middleware';
import {routing} from './i18n/routing';

export default createMiddleware(routing);

export const config = {
  // Matcher ignoring `/_next/`, `/api/` and assets like images, videos, and sitemaps.
  matcher: ['/((?!api|_next/static|_next/image|.*\\.(?:svg|png|jpg|jpeg|gif|webp|mp4|webm|xml)$).*)']
};
