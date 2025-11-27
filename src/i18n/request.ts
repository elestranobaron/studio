import {getRequestConfig} from 'next-intl/server';
 
export default getRequestConfig(async ({locale}) => {
  // Use the provided locale, or 'en' if it's undefined.
  const finalLocale = locale ?? 'en';
 
  return {
    locale: finalLocale,
    messages: (await import(`../../messages/${finalLocale}.json`)).default,
  };
});
