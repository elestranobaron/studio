import { redirect } from 'next/navigation';
 
// This page only redirects to the dashboard.
// The real "root" page is the dashboard.
export default function RootPage({params: {locale}}: {params: {locale: string}}) {
  // We manually build the path with the current locale
  // because the redirect function doesn't automatically handle it.
  redirect(`/${locale}/dashboard`);
}
