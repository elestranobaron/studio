import {notFound} from 'next/navigation';
import {getRequestConfig} from 'next-intl/server';
 
const locales = ['en', 'fr', 'es', 'de', 'it', 'ca', 'pt', 'ru', 'ja', 'zh', 'pl', 'nl', 'ar', 'hi', 'ko', 'ro'];
 
export default getRequestConfig(async ({locale}) => {
  if (!locales.includes(locale as any)) notFound();
 
  return {
    messages: (await import(`../messages/${locale}.json`)).default
  };
});
