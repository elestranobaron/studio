// src/i18n/request.ts
import { getRequestConfig } from 'next-intl/server';

export default getRequestConfig(async ({ locale }) => ({
  locale: locale ?? 'en', // fallback si jamais undefined
  messages: (await import(`../../messages/${locale ?? 'en'}.json`)).default,
}));