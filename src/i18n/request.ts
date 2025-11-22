// src/i18n/request.ts
import { getRequestConfig } from 'next-intl/server';

// Ce fichier est OBLIGATOIRE avec next-intl ≥ 3.22
export default getRequestConfig(async ({ locale }) => ({
  messages: (await import(`../../messages/${locale}.json`)).default
}));