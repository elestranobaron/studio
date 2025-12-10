import {getRequestConfig} from 'next-intl/server';
import {routing} from './routing';

export default getRequestConfig(async ({requestLocale}) => {
  // Await pour avoir la locale réelle (string | undefined)
  let locale = await requestLocale;
  
  // Fallback si undefined ou invalide → defaultLocale ('en')
  if (!locale || !routing.locales.includes(locale as any)) {
    locale = routing.defaultLocale;
  }

  return {
    locale,  // ← maintenant garanti string (pas undefined)
    messages: (await import(`../../messages/${locale}.json`)).default
  };
});
