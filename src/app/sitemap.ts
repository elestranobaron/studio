import { MetadataRoute } from 'next';
import { heroWods } from '@/lib/hero-wods';

const locales = ['en', 'fr', 'es', 'it', 'de', 'pt', 'ru', 'el', 'cs', 'is', 'sv', 'fi', 'no', 'hi', 'ko', 'ja', 'zh', 'ar', 'he', 'ln', 'ca'];

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = 'https://wodburner.app';

  // Static routes for each locale
  const staticRoutes = [
    '/dashboard',
    '/login',
    '/scan',
    '/generate',
    '/timers',
    '/timers/for-time',
    '/timers/amrap',
    '/timers/emom',
    '/timers/tabata',
    '/hero-wods',
    '/premium',
    '/settings',
    '/wod/new',
    '/hall-of-fame',
  ].flatMap((route) =>
    locales.map((locale) => ({
      url: `${baseUrl}/${locale}${route}`,
      lastModified: new Date(),
      priority: 0.8,
      changeFrequency: 'daily' as const,
    }))
  );

  // Add root URLs for each locale
  const rootRoutes = locales.map(locale => ({
      url: `${baseUrl}/${locale}`,
      lastModified: new Date(),
      priority: 1,
      changeFrequency: 'daily' as const,
  }));

  // Dynamic routes for Hero WODs for each locale
  const heroWodRoutes = heroWods.flatMap((wod) =>
    locales.map((locale) => ({
      url: `${baseUrl}/${locale}/community-timer/${wod.id}`,
      lastModified: new Date(),
      priority: 0.7,
      changeFrequency: 'monthly' as const,
    }))
  );

  return [...rootRoutes, ...staticRoutes, ...heroWodRoutes];
}
