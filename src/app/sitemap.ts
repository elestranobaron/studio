
import { MetadataRoute } from 'next';

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = 'https://wodburner.app';

  const routes = [
    '', 
    '/login', 
    '/scan', 
    '/generate', 
    '/timers', 
    '/timers/for-time',
    '/timers/amrap',
    '/timers/emom',
    '/timers/tabata',
    '/hero-wods', 
    '/premium'
  ];

  return routes.map((route) => ({
    url: `${baseUrl}${route}`,
    lastModified: new Date(),
    // Priorities can be adjusted based on importance
    priority: route === '' ? 1 : 0.8,
    changeFrequency: route === '' ? 'daily' : 'monthly',
  }));
}
