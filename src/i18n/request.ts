import {getRequestConfig} from 'next-intl/server';
 
export default getRequestConfig(async ({locale}) => {
  // Provide a static locale, fetch a user-specific one if required.
  const messages = (await import(`../../messages/${locale}.json`)).default;
 
  return {
    locale,
    messages
  };
});
