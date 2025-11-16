import { MetadataRoute } from 'next';
import { heroWods } from '@/lib/hero-wods';

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = 'https://wodburner.app';

  // Static routes
  const staticRoutes = [
    '',
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
  ].map((route) => ({
    url: `${baseUrl}${route}`,
    lastModified: new Date(),
    priority: route === '' ? 1 : 0.8,
    changeFrequency: 'daily' as const,
  }));

  // Dynamic routes for Hero WODs
  const heroWodRoutes = heroWods.map((wod) => ({
    url: `${baseUrl}/community-timer/${wod.id}`,
    lastModified: new Date(),
    priority: 0.7,
    changeFrequency: 'monthly' as const,
  }));

  return [...staticRoutes, ...heroWodRoutes];
}
